import os
import cv2
import face_recognition
import numpy as np
import json
import base64
from datetime import datetime
from io import BytesIO
from models import Person, FaceData
from app import db
import logging

logger = logging.getLogger(__name__)

def encode_face_image(image_data):
    """Encode a face from an image and return the encoding"""
    try:
        # Convert image data to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert BGR to RGB (face_recognition uses RGB)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Find face locations
        face_locations = face_recognition.face_locations(rgb_img)
        
        if not face_locations:
            return None, "No face detected in the image"
        
        if len(face_locations) > 1:
            return None, "Multiple faces detected. Please upload an image with only one face"
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
        
        if not face_encodings:
            return None, "Failed to encode the face"
        
        # Return the first encoding
        face_encoding = face_encodings[0]
        
        # Convert numpy array to list for JSON serialization
        encoding_list = face_encoding.tolist()
        
        return encoding_list, "Face encoded successfully"
    
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
    """Recognize a face from an image using stored face encodings"""
    try:
        # Convert image data to numpy array
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert BGR to RGB
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Find face locations
        face_locations = face_recognition.face_locations(rgb_img)
        
        if not face_locations:
            return None, "No face detected in the image"
        
        # Get face encodings for the faces in the image
        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
        
        # Get all face data from database
        all_face_data = FaceData.query.all()
        known_face_encodings = []
        known_person_ids = []
        
        for face_data in all_face_data:
            encoding = json.loads(face_data.encoding_data)
            known_face_encodings.append(encoding)
            known_person_ids.append(face_data.person_id)
        
        if not known_face_encodings:
            return None, "No face data found in the database"
        
        matches = []
        
        # Check each face in the input image
        for face_encoding in face_encodings:
            # Convert to numpy array if it's a list
            if isinstance(face_encoding, list):
                face_encoding = np.array(face_encoding)
            
            # Compare with all known faces
            matches_list = face_recognition.compare_faces(
                np.array(known_face_encodings), 
                face_encoding, 
                tolerance=tolerance
            )
            
            # Get the indexes of matched faces
            match_indexes = [i for i, match in enumerate(matches_list) if match]
            
            # If matches found, get the corresponding person IDs
            matched_person_ids = [known_person_ids[i] for i in match_indexes]
            
            if matched_person_ids:
                # Add all matches
                for person_id in matched_person_ids:
                    person = Person.query.get(person_id)
                    if person:
                        matches.append({
                            'person_id': person_id,
                            'name': person.full_name,
                            'roll_id': person.roll_id
                        })
        
        if matches:
            return matches, "Face recognition successful"
        else:
            return None, "No matching faces found"
    
    except Exception as e:
        logger.error(f"Error recognizing face: {str(e)}")
        return None, f"Error recognizing face: {str(e)}"
