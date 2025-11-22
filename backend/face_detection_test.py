import cv2
import numpy as np

def detect_expression(face_gray, face_color):
    """
    Enhanced expression detection based on multiple facial features.
    Returns expressions: Happy, Sad, Surprised, Angry, Thinking, Sleepy, or Neutral.
    """
    # Load feature detectors
    eye_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_eye.xml'
    )
    smile_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_smile.xml'
    )
    
    # Detect facial features
    eyes = eye_cascade.detectMultiScale(face_gray, scaleFactor=1.1, minNeighbors=20, minSize=(15, 15))
    
    # Detect smile with different thresholds
    smile_high = smile_cascade.detectMultiScale(face_gray, scaleFactor=1.8, minNeighbors=20, minSize=(25, 25))
    smile_low = smile_cascade.detectMultiScale(face_gray, scaleFactor=1.5, minNeighbors=15, minSize=(20, 20))
    
    # Analyze face brightness (can indicate mood)
    brightness = np.mean(face_gray)
    
    # Get face dimensions for analysis
    height, width = face_gray.shape
    
    # Analyze upper and lower face regions
    upper_face = face_gray[0:int(height*0.5), :]
    lower_face = face_gray[int(height*0.5):, :]
    
    # Detect eyes with looser constraints for sleepy detection
    eyes_loose = eye_cascade.detectMultiScale(face_gray, scaleFactor=1.2, minNeighbors=10, minSize=(10, 10))
    
    # Calculate expression based on features
    num_eyes = len(eyes)
    num_smiles = len(smile_high)
    has_weak_smile = len(smile_low) > 0
    
    # Expression detection logic
    if num_smiles > 0:
        # Strong smile detected
        return "Happy 😄", (0, 255, 0)
    
    elif has_weak_smile and num_eyes >= 2:
        # Weak smile with eyes visible
        return "Content 😊", (50, 255, 100)
    
    elif num_eyes < 2 and len(eyes_loose) >= 1:
        # Eyes barely open
        return "Sleepy 😴", (150, 150, 255)
    
    elif num_eyes == 0:
        # No eyes detected - could be looking away or surprised
        if brightness > 100:
            return "Surprised 😮", (255, 200, 0)
        else:
            return "Looking Away �", (200, 200, 200)
    
    elif num_eyes >= 2:
        # Both eyes detected, analyze further
        
        # Check eyebrow region (upper face) for frowning/anger
        upper_brightness = np.mean(upper_face)
        lower_brightness = np.mean(lower_face)
        
        # If upper face is darker relative to lower (furrowed brow)
        if upper_brightness < lower_brightness - 10:
            return "Thinking 🤔", (255, 150, 50)
        
        # Check for downturned mouth (sad)
        lower_third = face_gray[int(height*0.66):, :]
        lower_contrast = np.std(lower_third)
        
        if lower_contrast < 30 and brightness < 90:
            return "Sad �", (100, 100, 255)
        
        # Check overall darkness/intensity for angry
        if brightness < 80:
            return "Serious 😐", (255, 100, 100)
        
        # Default neutral
        return "Neutral 😊", (200, 200, 200)
    
    else:
        return "Neutral 😊", (200, 200, 200)


def detect_face_with_expression():
    """
    Simple face detection with expression recognition using webcam.
    Displays "User detected" with expression or "No user detected".
    """
    # Load face detection classifier
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )
    
    # Open webcam
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open camera")
        return
    
    print("Starting face and expression detection...")
    print("Press 'q' to quit")
    
    while True:
        # Read frame from webcam
        ret, frame = cap.read()
        if not ret:
            print("Error: Could not read frame")
            break
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        # Check if face is detected
        if len(faces) > 0:
            status = "User detected"
            color = (0, 255, 0)  # Green
            
            # Process each face
            for (x, y, w, h) in faces:
                # Draw rectangle around face
                cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
                
                # Extract face region for expression detection
                face_gray = gray[y:y+h, x:x+w]
                face_color = frame[y:y+h, x:x+w]
                
                # Detect expression (returns expression text and color)
                expression, exp_color = detect_expression(face_gray, face_color)
                
                # Display expression below the face with custom color
                cv2.putText(frame, expression, (x, y+h+25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, exp_color, 2)
        else:
            status = "No user detected"
            color = (0, 0, 255)  # Red
        
        # Display status message at top
        cv2.putText(frame, status, (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
        
        # Show the frame
        cv2.imshow('Face & Expression Detection', frame)
        
        # Press 'q' to quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    # Clean up
    cap.release()
    cv2.destroyAllWindows()
    print("Detection stopped")


if __name__ == "__main__":
    detect_face_with_expression()
