from gtts import gTTS
import os
import pygame

# Text to speak in Hindi
text = "नमस्ते, मैं आपकी हिंदी सहायक हूं। मैं आपकी कैसे मदद कर सकती हूं?"

# Create speech
tts = gTTS(text=text, lang='hi', slow=False)

# Save to file
audio_file = "output.mp3"
tts.save(audio_file)

# Play the audio using pygame
pygame.mixer.init()
pygame.mixer.music.load(audio_file)
pygame.mixer.music.play()

# Wait for audio to finish
while pygame.mixer.music.get_busy():
    pygame.time.Clock().tick(10)

# Clean up
pygame.mixer.quit()
os.remove(audio_file)

