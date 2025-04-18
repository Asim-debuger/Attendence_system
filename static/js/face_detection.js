// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize face image input if it exists
    const faceImageInput = document.getElementById('face-image-input');
    const facePreview = document.getElementById('face-preview');
    
    if (faceImageInput && facePreview) {
        faceImageInput.addEventListener('change', function(event) {
            handleImageInput(this);
        });
    }
});

// Handle image input for face detection
function handleImageInput(input) {
    const facePreview = document.getElementById('face-preview');
    const uploadButton = document.getElementById('upload-face-file');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Display the selected image
            facePreview.src = e.target.result;
            facePreview.style.display = 'block';
            
            // Enable the upload button
            if (uploadButton) {
                uploadButton.disabled = false;
            }
        };
        
        reader.readAsDataURL(input.files[0]);
    } else {
        // Hide preview and disable upload button if no file selected
        facePreview.style.display = 'none';
        if (uploadButton) {
            uploadButton.disabled = true;
        }
    }
}

// Simplified face detection function (would use face-api.js or similar in production)
async function detectFaces(imageElement) {
    // In a real implementation, this would use face-api.js or similar libraries
    // For now, we'll return a mock detection
    return new Promise(resolve => {
        setTimeout(() => {
            // Mock face detection result
            resolve({
                detected: true,
                confidence: 0.95,
                message: 'Face detected successfully'
            });
        }, 500);
    });
}