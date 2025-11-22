from dotenv import load_dotenv
import speech_recognition as sr
from graph import graph
from gtts import gTTS
import pygame
import os
import threading
import cv2
import numpy as np

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

messages = []
current_expression = {"expression": "Neutral", "detected": False}
expression_lock = threading.Lock()


def detect_expression_from_face(face_gray, face_color):
    """
    Enhanced expression detection based on multiple facial features.
    Returns expression text with emoji and color tuple (B, G, R) for visualization.
    """
    # Load feature detectors
    eye_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_eye.xml'
    )
    smile_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_smile.xml'
    )
    
    # Detect facial features with adjusted parameters
    eyes = eye_cascade.detectMultiScale(face_gray, scaleFactor=1.1, minNeighbors=15, minSize=(15, 15))
    
    # Detect smile with multiple sensitivity levels - VERY SENSITIVE for happy detection
    smile_high = smile_cascade.detectMultiScale(face_gray, scaleFactor=1.5, minNeighbors=12, minSize=(20, 20))
    smile_medium = smile_cascade.detectMultiScale(face_gray, scaleFactor=1.3, minNeighbors=8, minSize=(15, 15))
    smile_low = smile_cascade.detectMultiScale(face_gray, scaleFactor=1.2, minNeighbors=5, minSize=(10, 10))
    
    # Analyze face brightness (can indicate mood)
    brightness = np.mean(face_gray)
    
    # Get face dimensions for analysis
    height, width = face_gray.shape
    
    # Analyze upper and lower face regions
    upper_face = face_gray[0:int(height*0.5), :]
    lower_face = face_gray[int(height*0.5):, :]
    
    # Analyze specific regions for better detection
    middle_face = face_gray[int(height*0.3):int(height*0.7), :]
    lower_third = face_gray[int(height*0.66):, :]
    
    # Detect eyes with looser constraints for sleepy detection
    eyes_loose = eye_cascade.detectMultiScale(face_gray, scaleFactor=1.2, minNeighbors=8, minSize=(10, 10))
    
    # Calculate expression based on features
    num_eyes = len(eyes)
    num_smiles_high = len(smile_high)
    num_smiles_medium = len(smile_medium)
    num_smiles_low = len(smile_low)
    has_weak_smile = len(smile_low) > 0
    
    # Calculate brightness metrics
    upper_brightness = np.mean(upper_face)
    lower_brightness = np.mean(lower_face)
    middle_brightness = np.mean(middle_face)
    lower_contrast = np.std(lower_third)
    
    # Expression detection logic with enhanced sensitivity
    
    # 1. HAPPY - Any smile detected at any level
    if num_smiles_high > 0:
        return "Happy 😄", (0, 255, 0)
    
    if num_smiles_medium > 0:
        return "Happy 😄", (0, 255, 0)
    
    # 2. CONTENT - Weak smile with visible eyes
    if num_smiles_low > 0 and num_eyes >= 1:
        return "Content 😊", (50, 255, 100)
    
    # 3. SLEEPY - Eyes barely open
    if num_eyes < 2 and len(eyes_loose) >= 1:
        return "Sleepy 😴", (150, 150, 255)
    
    # 4. NO EYES DETECTED - Surprised
    if num_eyes == 0:
        return "Surprised 😮", (255, 200, 0)
    
    # 5. EYES DETECTED - Analyze further for sad, thinking, serious, or neutral
    if num_eyes >= 2:
        # Check for THINKING - Furrowed brow (upper face darker)
        if upper_brightness < lower_brightness - 15:
            return "Thinking 🤔", (255, 150, 50)
        
        # Check for ANGRY/SERIOUS - Very dark overall or high contrast
        if brightness < 75 or (upper_brightness < middle_brightness - 12):
            return "Serious 😐", (255, 100, 100)
        
        # Check for SAD - Low contrast in lower face, medium brightness
        if lower_contrast < 35 and 80 <= brightness <= 100:
            return "Sad 😢", (100, 100, 255)
        
        # Check for subtle sad - slightly lower brightness with no smile
        if brightness < 85 and not has_weak_smile:
            return "Sad �", (100, 100, 255)
        
        # Default neutral
        return "Neutral 😊", (200, 200, 200)
    
    # Fallback
    return "Neutral 😊", (200, 200, 200)


def monitor_facial_expression():
    """
    Background thread to continuously monitor user's facial expression.
    Updates global current_expression variable with expression and color.
    """
    global current_expression
    
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )
    
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("⚠️ Could not open camera for expression monitoring")
        return
    
    print("📹 Expression monitoring started")
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                continue
            
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            
            with expression_lock:
                if len(faces) > 0:
                    # Get first detected face
                    x, y, w, h = faces[0]
                    face_gray = gray[y:y+h, x:x+w]
                    face_color = frame[y:y+h, x:x+w]
                    
                    # Detect expression (returns expression with emoji and color)
                    expression_with_emoji, color = detect_expression_from_face(face_gray, face_color)
                    current_expression["expression"] = expression_with_emoji
                    current_expression["detected"] = True
                else:
                    current_expression["detected"] = False
            
            # Small delay to reduce CPU usage
            threading.Event().wait(0.5)
            
    except Exception as e:
        print(f"Expression monitoring error: {e}")
    finally:
        cap.release()


def get_expression_context():
    """
    Get current facial expression as context for LLM.
    Returns a Hindi context string.
    Handles expressions with or without emojis.
    """
    with expression_lock:
        if not current_expression["detected"]:
            return ""
        
        expr = current_expression["expression"]
        
        # Remove emojis from expression for mapping (keep only text part)
        expr_clean = expr.split()[0] if expr else ""
        
        # Map expressions to Hindi context
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
        
        context = expression_map.get(expr_clean, "")
        return f"\n[संदर्भ: {context}]" if context else ""

def speak_hindi(text):
    """Convert text to speech in Hindi and play it"""
    tts = gTTS(text=text, lang='hi', slow=False)
    audio_file = "output.mp3"
    tts.save(audio_file)
    
    pygame.mixer.init()
    pygame.mixer.music.load(audio_file)
    pygame.mixer.music.play()
    
    while pygame.mixer.music.get_busy():
        pygame.time.Clock().tick(10)
    
    pygame.mixer.quit()
    os.remove(audio_file)

def main():
    # Start facial expression monitoring in background
    expression_thread = threading.Thread(target=monitor_facial_expression, daemon=True)
    expression_thread.start()
    
    recognizer = sr.Recognizer()
    microphone = sr.Microphone()

    with microphone as source:
        recognizer.adjust_for_ambient_noise(source)
        recognizer.pause_threshold = 1

        while True:
            print("कृपया बोलें...")  # "Please speak..." in Hindi
            audio = recognizer.listen(source)

            try:
                text = recognizer.recognize_google(audio, language="hi-IN")
                print("आपने कहा:", text)
                
                # Add facial expression context to the user message
                expression_context = get_expression_context()
                user_message = text + expression_context
                
                if expression_context:
                    print(f"😊 चेहरे का भाव: {current_expression['expression']}")
                
                messages.append({"role": "user", "content": user_message})
                
                response_text = None
                for event in graph.stream({"messages": messages}, stream_mode="values"):
                    if "messages" in event:
                        last_message = event["messages"][-1]
                        # Only process assistant messages
                        if hasattr(last_message, 'type') and last_message.type == "ai":
                            response_text = last_message.content
                            event["messages"][-1].pretty_print()
                
                # Speak only the final assistant response
                if response_text:
                    messages.append({"role": "assistant", "content": response_text})
                    speak_hindi(response_text)

            except sr.UnknownValueError:
                error_msg = "क्षमा करें, मैं आपकी बात समझ नहीं पाया। कृपया फिर से प्रयास करें।"
                print(error_msg)
                return
            except sr.RequestError as e:
                error_msg = f"सेवा में समस्या है; {e}"
                print(error_msg)
                return

main()