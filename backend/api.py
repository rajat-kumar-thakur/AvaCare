from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import speech_recognition as sr
from gtts import gTTS
import os
import tempfile
import threading
import cv2
import numpy as np
from graph import graph
from dotenv import load_dotenv
from pydub import AudioSegment
import io

load_dotenv()

app = FastAPI()

# CORS middleware to allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global conversation state
messages = []
current_expression = {"expression": "Neutral", "detected": False}
expression_lock = threading.Lock()


def detect_expression_from_face(face_gray, face_color):
    """
    Enhanced expression detection based on multiple facial features.
    Returns expression text with emoji and color tuple (B, G, R) for visualization.
    """
    eye_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_eye.xml'
    )
    smile_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_smile.xml'
    )
    
    eyes = eye_cascade.detectMultiScale(face_gray, scaleFactor=1.1, minNeighbors=15, minSize=(15, 15))
    
    smile_high = smile_cascade.detectMultiScale(face_gray, scaleFactor=1.5, minNeighbors=12, minSize=(20, 20))
    smile_medium = smile_cascade.detectMultiScale(face_gray, scaleFactor=1.3, minNeighbors=8, minSize=(15, 15))
    smile_low = smile_cascade.detectMultiScale(face_gray, scaleFactor=1.2, minNeighbors=5, minSize=(10, 10))
    
    brightness = np.mean(face_gray)
    
    height, width = face_gray.shape
    
    upper_face = face_gray[0:int(height*0.5), :]
    lower_face = face_gray[int(height*0.5):, :]
    
    middle_face = face_gray[int(height*0.3):int(height*0.7), :]
    lower_third = face_gray[int(height*0.66):, :]
    
    eyes_loose = eye_cascade.detectMultiScale(face_gray, scaleFactor=1.2, minNeighbors=8, minSize=(10, 10))
    
    num_eyes = len(eyes)
    num_smiles_high = len(smile_high)
    num_smiles_medium = len(smile_medium)
    num_smiles_low = len(smile_low)
    has_weak_smile = len(smile_low) > 0
    
    upper_brightness = np.mean(upper_face)
    lower_brightness = np.mean(lower_face)
    middle_brightness = np.mean(middle_face)
    lower_contrast = np.std(lower_third)
    
    if num_smiles_high > 0:
        return "Happy 😄", (0, 255, 0)
    
    if num_smiles_medium > 0:
        return "Happy 😄", (0, 255, 0)
    
    if num_smiles_low > 0 and num_eyes >= 1:
        return "Content 😊", (50, 255, 100)
    
    if num_eyes < 2 and len(eyes_loose) >= 1:
        return "Sleepy 😴", (150, 150, 255)
    
    if num_eyes == 0:
        return "Surprised 😮", (255, 200, 0)
    
    if num_eyes >= 2:
        if upper_brightness < lower_brightness - 15:
            return "Thinking 🤔", (255, 150, 50)
        
        if brightness < 75 or (upper_brightness < middle_brightness - 12):
            return "Serious 😐", (255, 100, 100)
        
        if lower_contrast < 35 and 80 <= brightness <= 100:
            return "Sad 😢", (100, 100, 255)
        
        if brightness < 85 and not has_weak_smile:
            return "Sad 😢", (100, 100, 255)
        
        return "Neutral 😊", (200, 200, 200)
    
    return "Neutral 😊", (200, 200, 200)


def get_expression_context(expression: str):
    """
    Get current facial expression as context for LLM.
    Returns a Hindi context string.
    """
    if not expression:
        return ""
    
    expression_clean = expression.split()[0] if expression else ""
    
    expression_map = {
        "Happy": "उपयोगकर्ता खुश दिख रहे हैं",
        "Content": "उपयोगकर्ता संतुष्ट दिख रहे हैं",
        "Sad": "उपयोगकर्ता उदास दिख रहे हैं",
        "Surprised": "उपयोगकर्ता हैरान दिख रहे हैं",
        "Thinking": "उपयोगकर्ता सोच रहे हैं",
        "Sleepy": "उपयोगकर्ता थके हुए दिख रहे हैं",
        "Serious": "उपयोगकर्ता गंभीर दिख रहे हैं",
        "Neutral": "उपयोगकर्ता शांत दिख रहे हैं"
    }
    
    context = expression_map.get(expression_clean, "")
    return f"\n[संदर्भ: {context}]" if context else ""


@app.get("/")
async def root():
    return {"status": "ok", "message": "Hindi AI Assistant API"}


@app.post("/process-audio")
async def process_audio(
    audio: UploadFile = File(...),
    expression: str = Form(""),
    expression_confidence: str = Form("0")
):
    """
    Process audio file with speech recognition and generate AI response.
    """
    try:
        content = await audio.read()
        
        try:
            audio_segment = AudioSegment.from_file(io.BytesIO(content))
            
            wav_io = io.BytesIO()
            audio_segment.export(
                wav_io,
                format="wav",
                parameters=["-ar", "16000", "-ac", "1"]
            )
            wav_io.seek(0)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                temp_audio.write(wav_io.read())
                temp_audio_path = temp_audio.name
                
        except Exception as e:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                temp_audio.write(content)
                temp_audio_path = temp_audio.name

        recognizer = sr.Recognizer()
        with sr.AudioFile(temp_audio_path) as source:
            audio_data = recognizer.record(source)
            
        try:
            transcript = recognizer.recognize_google(audio_data, language="hi-IN")
        except sr.UnknownValueError:
            os.unlink(temp_audio_path)
            return {
                "transcript": "",
                "response": "क्षमा करें, मैं आपकी बात समझ नहीं पाया। कृपया फिर से प्रयास करें।",
                "error": "UnknownValueError"
            }
        except sr.RequestError as e:
            os.unlink(temp_audio_path)
            raise HTTPException(status_code=500, detail=f"Speech recognition error: {e}")
        
        os.unlink(temp_audio_path)
        
        expression_context = get_expression_context(expression)
        user_message = transcript + expression_context
        
        messages.append({"role": "user", "content": user_message})
        
        response_text = None
        for event in graph.stream({"messages": messages}, stream_mode="values"):
            if "messages" in event:
                last_message = event["messages"][-1]
                if hasattr(last_message, 'type') and last_message.type == "ai":
                    response_text = last_message.content
        
        if not response_text:
            response_text = "क्षमा करें, मुझे कोई प्रतिक्रिया नहीं मिली।"
        
        messages.append({"role": "assistant", "content": response_text})
        
        tts = gTTS(text=response_text, lang='hi', slow=False)
        audio_filename = f"response_{len(messages)}.mp3"
        audio_path = os.path.join(tempfile.gettempdir(), audio_filename)
        tts.save(audio_path)
        
        return {
            "transcript": transcript,
            "response": response_text,
            "audio_url": f"/audio/{audio_filename}",
            "expression": expression,
            "expression_confidence": float(expression_confidence)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audio/{filename}")
async def get_audio(filename: str):
    """
    Serve generated audio files.
    """
    audio_path = os.path.join(tempfile.gettempdir(), filename)
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        audio_path,
        media_type="audio/mpeg",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@app.post("/reset")
async def reset_conversation():
    """
    Reset the conversation history.
    """
    global messages
    messages = []
    return {"status": "ok", "message": "Conversation reset"}


@app.post("/detect-face")
async def detect_face(image: UploadFile = File(...)):
    """
    Detect face and expression from uploaded image frame.
    """
    try:
        image_data = await image.read()
        
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {
                "face_detected": False,
                "expression": "Neutral 😊",
                "confidence": 0.0,
                "color": [200, 200, 200],
                "face_count": 0
            }
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(50, 50),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        if len(faces) == 0:
            return {
                "face_detected": False,
                "expression": "Neutral 😊",
                "confidence": 0.0,
                "color": [200, 200, 200],
                "face_count": 0
            }
        
        x, y, w, h = faces[0]
        face_gray = gray[y:y+h, x:x+w]
        face_color = frame[y:y+h, x:x+w]
        
        expression_with_emoji, color_bgr = detect_expression_from_face(face_gray, face_color)
        
        frame_area = gray.shape[0] * gray.shape[1]
        face_area = w * h
        confidence = min(face_area / frame_area * 5, 1.0)
        
        color_rgb = [color_bgr[2], color_bgr[1], color_bgr[0]]
        
        return {
            "face_detected": True,
            "expression": expression_with_emoji,
            "confidence": round(confidence, 2),
            "color": color_rgb,
            "face_count": len(faces),
            "face_dimensions": {
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h)
            }
        }
        
    except Exception as e:
        return {
            "face_detected": False,
            "expression": "Neutral 😊",
            "confidence": 0.0,
            "color": [200, 200, 200],
            "face_count": 0,
            "error": str(e)
        }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "messages_count": len(messages)}


@app.get("/expressions")
async def get_supported_expressions():
    """
    Get list of all supported expressions.
    """
    return {
        "expressions": [
            {"name": "Happy 😄", "description": "Strong smile detected", "color": [0, 255, 0]},
            {"name": "Content 😊", "description": "Gentle smile with visible eyes", "color": [100, 255, 50]},
            {"name": "Sad 😢", "description": "Low facial contrast, downturned mouth", "color": [255, 100, 100]},
            {"name": "Serious 😐", "description": "Dark expression, no smile", "color": [100, 100, 255]},
            {"name": "Thinking 🤔", "description": "Furrowed brow detected", "color": [50, 150, 255]},
            {"name": "Surprised 😮", "description": "Eyes wide or no eyes detected", "color": [0, 200, 255]},
            {"name": "Sleepy 😴", "description": "Eyes barely open", "color": [255, 150, 150]},
            {"name": "Neutral 😊", "description": "Default calm expression", "color": [200, 200, 200]}
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
