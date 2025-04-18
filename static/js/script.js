// Main JavaScript for the Advanced Attendance System

// Theme toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Theme toggle event listener
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Set initial icon based on current theme
        updateThemeIcon(savedTheme);
        
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            // Change theme
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Update icon
            updateThemeIcon(newTheme);
        });
    }
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Initialize datepickers
    const datepickers = document.querySelectorAll('.datepicker');
    datepickers.forEach(function(datepicker) {
        if (typeof flatpickr !== 'undefined') {
            flatpickr(datepicker, {
                altInput: true,
                altFormat: "F j, Y",
                dateFormat: "Y-m-d",
            });
        }
    });
    
    // Initialize tables with DataTables if available
    const tables = document.querySelectorAll('.datatable');
    tables.forEach(function(table) {
        if (typeof $.fn.DataTable !== 'undefined') {
            $(table).DataTable({
                responsive: true
            });
        }
    });
    
    // Initialize sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }
    
    // Close alerts when the close button is clicked
    document.querySelectorAll('.alert .close').forEach(function(close) {
        close.addEventListener('click', function() {
            this.parentElement.style.display = 'none';
        });
    });
});

// Helper function to update theme icon
function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('#theme-toggle i');
    if (themeIcon) {
        if (theme === 'dark') {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    }
}

// Helper function to show toast notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        // Create toast container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
    }
    
    // Create a unique ID for the toast
    const toastId = 'toast-' + Date.now();
    
    // Create toast HTML
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-${type}">
                <strong class="me-auto text-white">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Append toast to container
    document.getElementById('toast-container').innerHTML += toastHtml;
    
    // Initialize and show the toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 5000
    });
    toast.show();
    
    // Remove toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
}

// Function to format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Function to format time for display
function formatTime(timeString) {
    if (!timeString) return '';
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString(undefined, options);
}

// Attendance marking function
function markAttendance(personId, sessionId, status) {
    // Show loading indicator
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    btn.disabled = true;
    
    // Prepare form data
    const formData = new FormData();
    formData.append('person_id', personId);
    formData.append('session_id', sessionId);
    formData.append('status', status);
    
    // Send request
    fetch('/mark_attendance', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Reset button
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        if (data.success) {
            // Show success message
            showToast('Attendance updated successfully', 'success');
            
            // Update UI to reflect new status
            const statusCell = document.querySelector(`#status-${personId}`);
            if (statusCell) {
                statusCell.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                
                // Update status class
                statusCell.className = '';
                statusCell.classList.add(`status-${status}`);
            }
        } else {
            // Show error message
            showToast('Error: ' + data.message, 'danger');
        }
    })
    .catch(error => {
        // Reset button
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        // Show error message
        showToast('Error: ' + error.message, 'danger');
    });
}

// Export report to CSV
function exportReport(data, type = 'csv') {
    fetch('/export_report', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            data: data,
            type: type
        })
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        }
        throw new Error('Network response was not ok.');
    })
    .then(blob => {
        // Create a link to download the file
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.${type}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    })
    .catch(error => {
        showToast('Error exporting report: ' + error.message, 'danger');
    });
}
