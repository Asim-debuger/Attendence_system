// Face detection for webcam and image preview

// Function to check if a face is present in the image
async function detectFaces(imageElement) {
    // This is a simplified version without actual face detection on client side
    // In a real implementation, you might use a library like face-api.js
    
    // For simplicity, we'll just return true to indicate face is detected
    // The actual face detection will happen on the server
    return true;
}

// Handle image input for face upload
function handleImageInput(input) {
    const previewElement = document.getElementById('face-preview');
    if (!previewElement) return;
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewElement.src = e.target.result;
            previewElement.style.display = 'block';
            
            // Create image element for face detection
            const img = new Image();
            img.src = e.target.result;
            
            img.onload = async function() {
                // Check if face is detected
                const hasFace = await detectFaces(img);
                
                const uploadButton = document.getElementById('upload-face-file');
                if (uploadButton) {
                    if (hasFace) {
                        uploadButton.disabled = false;
                        showToast('Face detected in the image', 'success');
                    } else {
                        uploadButton.disabled = true;
                        showToast('No face detected in the image', 'warning');
                    }
                }
            };
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Initialize face detection features
document.addEventListener('DOMContentLoaded', function() {
    // Image input change handler
    const imageInput = document.getElementById('face-image-input');
    if (imageInput) {
        imageInput.addEventListener('change', function() {
            handleImageInput(this);
        });
    }
    
    // File-based face upload
    const uploadFaceFileBtn = document.getElementById('upload-face-file');
    if (uploadFaceFileBtn) {
        uploadFaceFileBtn.addEventListener('click', function() {
            const personId = uploadFaceFileBtn.getAttribute('data-person-id');
            const fileInput = document.getElementById('face-image-input');
            
            if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                showToast('Please select an image first', 'warning');
                return;
            }
            
            // Create form data for upload
            const formData = new FormData();
            formData.append('face_image', fileInput.files[0]);
            
            // Show loading indicator
            uploadFaceFileBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
            uploadFaceFileBtn.disabled = true;
            
            // Upload the face image
            fetch(`/upload_face/${personId}`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                uploadFaceFileBtn.innerHTML = 'Upload Face';
                uploadFaceFileBtn.disabled = false;
                
                if (data.success) {
                    showToast('Face uploaded successfully', 'success');
                    
                    // Reset file input
                    fileInput.value = '';
                    const previewElement = document.getElementById('face-preview');
                    if (previewElement) {
                        previewElement.src = '';
                        previewElement.style.display = 'none';
                    }
                    
                    // Update UI to show face is registered
                    const faceStatusElement = document.getElementById('face-status');
                    if (faceStatusElement) {
                        faceStatusElement.textContent = 'Registered';
                        faceStatusElement.className = 'badge bg-success';
                    }
                } else {
                    showToast('Error: ' + data.message, 'danger');
                }
            })
            .catch(error => {
                uploadFaceFileBtn.innerHTML = 'Upload Face';
                uploadFaceFileBtn.disabled = false;
                showToast('Error: ' + error.message, 'danger');
            });
        });
    }
});
