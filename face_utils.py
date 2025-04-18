import os
import json
import base64
from datetime import datetime
from io import BytesIO
from models import Person, FaceData
from app import db
import logging

logger = logging.getLogger(__name__)

def encode_face_image(image_data):
    """Improved mock implementation for face encoding
    
    In a real implementation, this would:
    1. Load the image using a library like PIL or OpenCV
    2. Detect faces in the image
    3. For each face, compute a face encoding (typically a 128-dimensional vector)
    
    For our demo, we'll generate a random encoding that simulates a real face encoding
    """
    try:
        # Ensure we have some image data
        if not image_data or len(image_data) < 100:
            return None, "Invalid image data provided"
            
        # In a real application, we would check if a face is actually present
        # For demo purposes, we'll simulate a 10% chance of no face being detected
        import random
        if random.random() < 0.1:
            return None, "No face detected in the image. Please try again."
        
        # Generate a random encoding that would approximate a real face encoding
        # Real face encodings are usually 128 or 512-dimensional vectors with a specific distribution
        mock_encoding = [random.uniform(-0.5, 0.5) for _ in range(128)]
        
        return mock_encoding, "Face detected and encoded successfully"
    except Exception as e:
        logger.error(f"Error encoding face: {str(e)}")
        return None, f"Error encoding face: {str(e)}"

def save_face_encoding(person_id, encoding_data):
    """Save face encoding to database"""
    try:
        # Convert the encoding list to a JSON string
        encoding_json = json.dumps(encoding_data)
        
        # Save to database
        face_data = FaceData(
            person_id=person_id,
            encoding_data=encoding_json
        )
        
        db.session.add(face_data)
        db.session.commit()
        
        # Also update the person record
        person = Person.query.get(person_id)
        if person:
            person.face_encoding = encoding_json
            db.session.commit()
        
        return True, "Face encoding saved successfully"
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving face encoding: {str(e)}")
        return False, f"Error saving face encoding: {str(e)}"

def recognize_face(image_data, tolerance=0.6):
    """Improved mock implementation for face recognition"""
    try:
        # Fetch persons with face encodings
        persons = Person.query.filter(Person.face_encoding.isnot(None)).all()
        
        if not persons:
            return None, "No registered faces found in the database"
        
        # Simulate recognition - in a real system, this would compare face encodings
        # For the mock, we'll randomly select up to 3 persons who have face encodings
        import random
        num_to_recognize = min(len(persons), random.randint(1, 3))
        recognized_persons = random.sample(persons, num_to_recognize)
        
        matches = [{
            'person_id': person.id,
            'name': person.full_name,
            'roll_id': person.roll_id
        } for person in recognized_persons]
        
        return matches, f"Face recognition successful ({len(matches)} faces recognized)"
    
    except Exception as e:
        logger.error(f"Error recognizing face: {str(e)}")
        return None, f"Error recognizing face: {str(e)}"
