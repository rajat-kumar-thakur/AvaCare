from dotenv import load_dotenv
import speech_recognition as sr
from graph import graph
from gtts import gTTS
import pygame
import os

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

messages = []


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
                
                user_message = text
                
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