import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
import speech_recognition as sr
from gtts import gTTS
import os
import tempfile
import threading
import cv2
import numpy as np
from graph import graph, get_llm
from dotenv import load_dotenv
from pydub import AudioSegment
import io
from auth import (
    Token, UserCreate, User, get_current_active_user, 
    create_access_token, get_password_hash, verify_password, 
    users_collection, ACCESS_TOKEN_EXPIRE_MINUTES
)
from datetime import timedelta
from mem0 import Memory

load_dotenv()

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Mem0 with Gemini embeddings and MongoDB vector store
config = {
    "llm": {
        "provider": "gemini",
        "config": {
            "model": "gemini-2.5-flash",
            "temperature": 0.7
        }
    },
    "embedder": {
        "provider": "gemini",
        "config": {
            "model": "models/text-embedding-004"
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "collection_name": "avacare_memories_v3",
            "host": "localhost",
            "port": 6333
        }
    }
}
print(f"Memory Config: {config}")
memory = Memory.from_config(config)

# Global state (still needed for face detection context, though per-user would be better)
current_expression = {"expression": "Neutral", "detected": False}
expression_lock = threading.Lock()

# ... (Keep face detection logic as is for now, or move to a separate file if it gets too big)
# For brevity, I'm keeping the existing face detection functions but cleaning up the file structure.

def detect_expression_from_face(face_gray, face_color):
    """
    Enhanced expression detection based on multiple facial features.
    """
    # ... (Same implementation as before, abbreviated for this tool call to avoid huge token usage if unchanged)
    # I will assume the user wants the FULL file content if I replace the whole file. 
    # Since I cannot see the full content in my head without reading it again, I will copy the logic from the previous view_file.
    # actually, I should probably just import it or keep it.
    # To be safe and clean, I will keep the logic but just paste it back.
    
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')
    
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
    
    if num_smiles_high > 0: return "Happy 😄", (0, 255, 0)
    if num_smiles_medium > 0: return "Happy 😄", (0, 255, 0)
    if num_smiles_low > 0 and num_eyes >= 1: return "Content 😊", (50, 255, 100)
    if num_eyes < 2 and len(eyes_loose) >= 1: return "Sleepy 😴", (150, 150, 255)
    if num_eyes == 0: return "Surprised 😮", (255, 200, 0)
    
    if num_eyes >= 2:
        if upper_brightness < lower_brightness - 15: return "Thinking 🤔", (255, 150, 50)
        if brightness < 75 or (upper_brightness < middle_brightness - 12): return "Serious 😐", (255, 100, 100)
        if lower_contrast < 35 and 80 <= brightness <= 100: return "Sad 😢", (100, 100, 255)
        if brightness < 85 and not has_weak_smile: return "Sad 😢", (100, 100, 255)
        return "Neutral 😊", (200, 200, 200)
    
    return "Neutral 😊", (200, 200, 200)

def get_expression_context(expression: str):
    if not expression: return ""
    expression_clean = expression.split()[0] if expression else ""
    # Map to English for the therapist agent (or keep Hindi if we want, but Therapist should be multilingual)
    # Let's keep it simple: The context is just the expression name.
    return f"\n[User Expression: {expression_clean}]"

@app.post("/auth/signup", response_model=Token)
async def signup(user: UserCreate):
    user_exists = await users_collection.find_one({"username": user.username})
    if user_exists:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict["hashed_password"] = hashed_password
    del user_dict["password"]
    
    await users_collection.insert_one(user_dict)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await users_collection.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.post("/process-audio")
async def process_audio(
    audio: UploadFile = File(...),
    expression: str = Form(""),
    expression_confidence: str = Form("0"),
    current_user: User = Depends(get_current_active_user)
):
    try:
        content = await audio.read()
        
        # Convert to wav
        try:
            print(f"Received audio file: {audio.filename}, content_type: {audio.content_type}")
            audio_segment = AudioSegment.from_file(io.BytesIO(content))
            print(f"Audio duration: {audio_segment.duration_seconds:.2f} seconds")
            print(f"Audio channels: {audio_segment.channels}, frame_rate: {audio_segment.frame_rate}")
            
            wav_io = io.BytesIO()
            audio_segment.export(wav_io, format="wav", parameters=["-ar", "16000", "-ac", "1"])
            wav_io.seek(0)
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                temp_audio.write(wav_io.read())
                temp_audio_path = temp_audio.name
            print(f"Saved temporary WAV file to: {temp_audio_path}, size: {os.path.getsize(temp_audio_path)} bytes")
        except Exception as e:
            print(f"Audio conversion error: {e}")
            # Fallback: try using the original content if it might be wav already
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                temp_audio.write(content)
                temp_audio_path = temp_audio.name
            print(f"Fallback: Saved original content to {temp_audio_path}")

        # Speech Recognition
        recognizer = sr.Recognizer()
        try:
            with sr.AudioFile(temp_audio_path) as source:
                print("Reading audio file for recognition...")
                audio_data = recognizer.record(source)
                print("Audio file read successfully.")
        except Exception as e:
             print(f"Error reading audio file with SpeechRecognition: {e}")
             os.unlink(temp_audio_path)
             raise HTTPException(status_code=400, detail=f"Invalid audio file: {e}")
            
        try:
            # Try English first
            try:
                print("Attempting English transcription...")
                transcript = recognizer.recognize_google(audio_data, language="en-US")
                print(f"Transcribed (English): {transcript}")
            except sr.UnknownValueError:
                # Fallback to Hindi
                print("English transcription failed (UnknownValueError), trying Hindi...")
                transcript = recognizer.recognize_google(audio_data, language="hi-IN")
                print(f"Transcribed (Hindi): {transcript}")
        except sr.UnknownValueError:
            print("Transcription failed: UnknownValueError (both English and Hindi)")
            os.unlink(temp_audio_path)
            return {"transcript": "", "response": "I could not understand that.", "error": "UnknownValueError"}
        except sr.RequestError as e:
            print(f"Transcription failed: RequestError: {e}")
            os.unlink(temp_audio_path)
            raise HTTPException(status_code=500, detail=f"Speech recognition error: {e}")
        
        os.unlink(temp_audio_path)
        
        # Retrieve Memory
        user_id = current_user.username
        try:
            memories = memory.search(transcript, user_id=user_id)
            memory_context = "\n".join([m.get("memory", "") for m in memories]) if memories else ""
        except Exception as e:
            print(f"Memory search error: {e}")
            memory_context = ""
        
        expression_context = get_expression_context(expression)
        
        # Construct Message
        full_context = f"User Expression: {expression_context}\nPast Memories: {memory_context}"
        
        # Run Graph
        try:
            inputs = {"messages": [{"role": "user", "content": f"{full_context}\n\nUser: {transcript}"}]}
            
            response_text = None
            for event in graph.stream(inputs, stream_mode="values"):
                if "messages" in event:
                    last_message = event["messages"][-1]
                    if hasattr(last_message, 'type') and last_message.type == "ai":
                        response_text = last_message.content
            
            if not response_text:
                response_text = "I am here for you."
        except Exception as e:
            print(f"Graph processing error: {e}")
            response_text = "I am here for you. How can I help you today?"
            
        # Store in Memory
        try:
            memory.add(f"User: {transcript}\nAssistant: {response_text}", user_id=user_id)
        except Exception as e:
            print(f"Memory storage error: {e}")
        
        # TTS
        tts = gTTS(text=response_text, lang='en', slow=False)
        audio_filename = f"response_{os.urandom(4).hex()}.mp3"
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
    audio_path = os.path.join(tempfile.gettempdir(), filename)
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(audio_path, media_type="audio/mpeg")

@app.post("/detect-face")
async def detect_face(image: UploadFile = File(...)):
    # ... (Same as before)
    # I'll just return a simplified version or the same logic.
    # To save space, I'll copy the logic from the previous file view.
    try:
        image_data = await image.read()
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None: return {"face_detected": False, "expression": "Neutral 😊", "confidence": 0.0, "color": [200, 200, 200]}
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50))
        
        if len(faces) == 0: return {"face_detected": False, "expression": "Neutral 😊", "confidence": 0.0, "color": [200, 200, 200]}
        
        x, y, w, h = faces[0]
        face_gray = gray[y:y+h, x:x+w]
        face_color = frame[y:y+h, x:x+w]
        
        expression_with_emoji, color_bgr = detect_expression_from_face(face_gray, face_color)
        confidence = min((w * h) / (gray.shape[0] * gray.shape[1]) * 5, 1.0)
        
        return {
            "face_detected": True,
            "expression": expression_with_emoji,
            "confidence": round(confidence, 2),
            "color": [color_bgr[2], color_bgr[1], color_bgr[0]],
            "face_dimensions": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}
        }
    except Exception as e:
        return {"face_detected": False, "error": str(e)}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
