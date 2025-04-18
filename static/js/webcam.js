// WebCam handling for the Advanced Attendance System

class WebcamHandler {
    constructor(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.stream = null;
        this.isActive = false;
    }
    
    // Start webcam
    async start() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            
            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.isActive = true;
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('Error starting webcam:', error);
            return Promise.reject(error);
        }
    }
    
    // Stop webcam
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.isActive = false;
        }
    }
    
    // Take a snapshot and return as data URL
    takeSnapshot() {
        if (!this.isActive) {
            return null;
        }
        
        const context = this.canvasElement.getContext('2d');
        const { videoWidth, videoHeight } = this.videoElement;
        
        // Set canvas dimensions to match video
        this.canvasElement.width = videoWidth;
        this.canvasElement.height = videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);
        
        // Get image data URL
        return this.canvasElement.toDataURL('image/jpeg');
    }
    
    // Convert data URL to Blob for upload
    dataURLtoBlob(dataURL) {
        const parts = dataURL.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        
        return new Blob([uInt8Array], { type: contentType });
    }
    
    // Take snapshot and return as blob for upload
    captureForUpload() {
        const dataURL = this.takeSnapshot();
        if (!dataURL) {
            return null;
        }
        return this.dataURLtoBlob(dataURL);
    }
}

// Initialize webcam when DOM is loaded for camera pages
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a page that uses webcam
    const videoElement = document.getElementById('camera-video');
    const canvasElement = document.getElementById('camera-canvas');
    const startButton = document.getElementById('start-camera');
    const stopButton = document.getElementById('stop-camera');
    const captureButton = document.getElementById('capture-image');
    const uploadFaceButton = document.getElementById('upload-face');
    const recognizeFaceButton = document.getElementById('recognize-face');
    
    if (videoElement && canvasElement) {
        // Initialize webcam handler
        const webcam = new WebcamHandler(videoElement, canvasElement);
        
        // Start camera button
        if (startButton) {
            startButton.addEventListener('click', async () => {
                try {
                    await webcam.start();
                    // Update UI
                    startButton.style.display = 'none';
                    if (stopButton) stopButton.style.display = 'inline-block';
                    if (captureButton) captureButton.style.display = 'inline-block';
                    if (uploadFaceButton) uploadFaceButton.style.display = 'inline-block';
                    if (recognizeFaceButton) recognizeFaceButton.style.display = 'inline-block';
                } catch (error) {
                    showToast('Error starting camera: ' + error.message, 'danger');
                }
            });
        }
        
        // Stop camera button
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                webcam.stop();
                // Update UI
                if (startButton) startButton.style.display = 'inline-block';
                stopButton.style.display = 'none';
                if (captureButton) captureButton.style.display = 'none';
                if (uploadFaceButton) uploadFaceButton.style.display = 'none';
                if (recognizeFaceButton) recognizeFaceButton.style.display = 'none';
            });
        }
        
        // Capture button
        if (captureButton) {
            captureButton.addEventListener('click', () => {
                const snapshot = webcam.takeSnapshot();
                const resultImage = document.getElementById('result-image');
                if (resultImage && snapshot) {
                    resultImage.src = snapshot;
                    resultImage.style.display = 'block';
                }
            });
        }
        
        // Upload face button
        if (uploadFaceButton) {
            uploadFaceButton.addEventListener('click', () => {
                const personId = uploadFaceButton.getAttribute('data-person-id');
                const blob = webcam.captureForUpload();
                
                if (!blob) {
                    showToast('Please start the camera first', 'warning');
                    return;
                }
                
                // Create form data for upload
                const formData = new FormData();
                formData.append('face_image', blob, 'face.jpg');
                
                // Show loading indicator
                uploadFaceButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
                uploadFaceButton.disabled = true;
                
                // Upload the face image
                fetch(`/upload_face/${personId}`, {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    uploadFaceButton.innerHTML = 'Upload Face';
                    uploadFaceButton.disabled = false;
                    
                    if (data.success) {
                        showToast('Face uploaded successfully', 'success');
                    } else {
                        showToast('Error: ' + data.message, 'danger');
                    }
                })
                .catch(error => {
                    uploadFaceButton.innerHTML = 'Upload Face';
                    uploadFaceButton.disabled = false;
                    showToast('Error: ' + error.message, 'danger');
                });
            });
        }
        
        // Recognize face button
        if (recognizeFaceButton) {
            recognizeFaceButton.addEventListener('click', () => {
                const sessionSelect = document.getElementById('session-select');
                if (!sessionSelect || !sessionSelect.value) {
                    showToast('Please select a session first', 'warning');
                    return;
                }
                
                const sessionId = sessionSelect.value;
                const blob = webcam.captureForUpload();
                
                if (!blob) {
                    showToast('Please start the camera first', 'warning');
                    return;
                }
                
                // Create form data for recognition
                const formData = new FormData();
                formData.append('face_image', blob, 'face.jpg');
                formData.append('session_id', sessionId);
                
                // Show loading indicator
                recognizeFaceButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
                recognizeFaceButton.disabled = true;
                
                // Send for recognition
                fetch('/recognize_face', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    recognizeFaceButton.innerHTML = 'Recognize Face';
                    recognizeFaceButton.disabled = false;
                    
                    if (data.success) {
                        showToast('Face recognition successful', 'success');
                        
                        // Display recognition results
                        const resultsContainer = document.getElementById('recognition-results');
                        if (resultsContainer && data.matches && data.matches.length > 0) {
                            let resultsHtml = '<div class="alert alert-success mt-3">';
                            resultsHtml += '<h5>Recognition Results:</h5>';
                            resultsHtml += '<ul>';
                            
                            data.matches.forEach(match => {
                                let statusText = '';
                                let statusClass = '';
                                
                                if (match.status === 'marked_present') {
                                    statusText = 'Attendance marked as present';
                                    statusClass = 'text-success';
                                } else if (match.status === 'already_recorded') {
                                    statusText = 'Attendance already recorded';
                                    statusClass = 'text-warning';
                                }
                                
                                resultsHtml += `<li>${match.name} (${match.roll_id}) - <span class="${statusClass}">${statusText}</span></li>`;
                            });
                            
                            resultsHtml += '</ul></div>';
                            resultsContainer.innerHTML = resultsHtml;
                        }
                    } else {
                        showToast('Error: ' + data.message, 'danger');
                    }
                })
                .catch(error => {
                    recognizeFaceButton.innerHTML = 'Recognize Face';
                    recognizeFaceButton.disabled = false;
                    showToast('Error: ' + error.message, 'danger');
                });
            });
        }
    }
});
