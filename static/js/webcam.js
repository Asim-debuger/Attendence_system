class WebcamHandler {
    constructor(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.stream = null;
    }
    
    async start() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            
            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('Error starting webcam:', error);
            return Promise.reject(error);
        }
    }
    
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
            this.stream = null;
        }
    }
    
    takeSnapshot() {
        if (!this.stream) return null;
        
        const context = this.canvasElement.getContext('2d');
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        
        context.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
        return this.canvasElement.toDataURL('image/png');
    }
    
    dataURLtoBlob(dataURL) {
        const byteString = atob(dataURL.split(',')[1]);
        const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
        
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        
        return new Blob([ab], { type: mimeString });
    }
    
    captureForUpload() {
        const dataURL = this.takeSnapshot();
        if (!dataURL) return null;
        
        const blob = this.dataURLtoBlob(dataURL);
        return blob;
    }
}

// Initialize webcam functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const videoElement = document.getElementById('camera-video');
    const canvasElement = document.getElementById('camera-canvas');
    
    if (videoElement && canvasElement) {
        const webcam = new WebcamHandler(videoElement, canvasElement);
        
        // Start camera button
        const startCameraBtn = document.getElementById('start-camera');
        if (startCameraBtn) {
            startCameraBtn.addEventListener('click', async function() {
                try {
                    await webcam.start();
                    
                    // Show stop and capture buttons, hide start button
                    document.getElementById('stop-camera').style.display = 'inline-block';
                    const captureBtn = document.getElementById('upload-face') || document.getElementById('recognize-face');
                    if (captureBtn) captureBtn.style.display = 'inline-block';
                    startCameraBtn.style.display = 'none';
                } catch (error) {
                    console.error('Failed to start camera:', error);
                    alert('Could not access the camera. Please ensure you have granted camera permissions.');
                }
            });
        }
        
        // Stop camera button
        const stopCameraBtn = document.getElementById('stop-camera');
        if (stopCameraBtn) {
            stopCameraBtn.addEventListener('click', function() {
                webcam.stop();
                
                // Show start button, hide stop and capture buttons
                document.getElementById('start-camera').style.display = 'inline-block';
                stopCameraBtn.style.display = 'none';
                const captureBtn = document.getElementById('upload-face') || document.getElementById('recognize-face');
                if (captureBtn) captureBtn.style.display = 'none';
            });
        }
        
        // Upload face button (for registration)
        const uploadFaceBtn = document.getElementById('upload-face');
        if (uploadFaceBtn) {
            uploadFaceBtn.addEventListener('click', function() {
                const personId = uploadFaceBtn.getAttribute('data-person-id');
                if (!personId) {
                    alert('No person ID provided');
                    return;
                }
                
                const blob = webcam.captureForUpload();
                if (!blob) {
                    alert('Failed to capture image');
                    return;
                }
                
                const formData = new FormData();
                formData.append('face_image', blob, 'webcam.png');
                
                // Show loading overlay
                document.getElementById('camera-overlay').style.display = 'flex';
                
                fetch(`/upload_face/${personId}`, {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update face status badge
                        const faceStatus = document.getElementById('face-status');
                        if (faceStatus) {
                            faceStatus.className = 'badge bg-success';
                            faceStatus.textContent = 'Registered';
                        }
                        
                        alert('Face registered successfully!');
                    } else {
                        alert('Failed to register face: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while registering face');
                })
                .finally(() => {
                    // Hide loading overlay
                    document.getElementById('camera-overlay').style.display = 'none';
                });
            });
        }
        
        // Recognize face button (for attendance)
        const recognizeFaceBtn = document.getElementById('recognize-face');
        if (recognizeFaceBtn) {
            recognizeFaceBtn.addEventListener('click', function() {
                const sessionSelect = document.getElementById('session-select');
                if (!sessionSelect || !sessionSelect.value) {
                    alert('Please select a session');
                    return;
                }
                
                const blob = webcam.captureForUpload();
                if (!blob) {
                    alert('Failed to capture image');
                    return;
                }
                
                const formData = new FormData();
                formData.append('face_image', blob, 'webcam.png');
                formData.append('session_id', sessionSelect.value);
                
                // Show loading overlay
                document.getElementById('camera-overlay').style.display = 'flex';
                
                fetch('/recognize_face', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Display recognition results
                        const resultsContainer = document.getElementById('recognition-results');
                        if (resultsContainer) {
                            let html = '<div class="alert alert-success"><h5>Recognition Results:</h5><ul>';
                            
                            data.matches.forEach(match => {
                                let status = match.status;
                                let statusText = '';
                                
                                if (status === 'marked_present') {
                                    statusText = 'Marked Present';
                                } else if (status === 'already_recorded') {
                                    statusText = 'Already Recorded';
                                }
                                
                                html += `<li><strong>${match.name}</strong> (${match.roll_id}) - ${statusText}</li>`;
                            });
                            
                            html += '</ul></div>';
                            resultsContainer.innerHTML = html;
                        }
                    } else {
                        // Display error
                        const resultsContainer = document.getElementById('recognition-results');
                        if (resultsContainer) {
                            resultsContainer.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
                        }
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    const resultsContainer = document.getElementById('recognition-results');
                    if (resultsContainer) {
                        resultsContainer.innerHTML = '<div class="alert alert-danger">An error occurred during face recognition</div>';
                    }
                })
                .finally(() => {
                    // Hide loading overlay
                    document.getElementById('camera-overlay').style.display = 'none';
                });
            });
        }
        
        // Handle file input for face registration
        const faceImageInput = document.getElementById('face-image-input');
        const facePreview = document.getElementById('face-preview');
        const uploadFaceFileBtn = document.getElementById('upload-face-file');
        
        if (faceImageInput && facePreview && uploadFaceFileBtn) {
            faceImageInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        facePreview.src = e.target.result;
                        facePreview.style.display = 'block';
                        uploadFaceFileBtn.disabled = false;
                    };
                    
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
            
            uploadFaceFileBtn.addEventListener('click', function() {
                const personId = uploadFaceFileBtn.getAttribute('data-person-id');
                if (!personId) {
                    alert('No person ID provided');
                    return;
                }
                
                if (!faceImageInput.files || !faceImageInput.files[0]) {
                    alert('Please select an image file');
                    return;
                }
                
                const formData = new FormData();
                formData.append('face_image', faceImageInput.files[0]);
                
                fetch(`/upload_face/${personId}`, {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update face status badge
                        const faceStatus = document.getElementById('face-status');
                        if (faceStatus) {
                            faceStatus.className = 'badge bg-success';
                            faceStatus.textContent = 'Registered';
                        }
                        
                        alert('Face registered successfully!');
                    } else {
                        alert('Failed to register face: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while registering face');
                });
            });
        }
    }
});