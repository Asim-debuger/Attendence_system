document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // Initialize DataTables
    if ($.fn.DataTable) {
        $('.datatable').DataTable({
            responsive: true,
            language: {
                search: "Search:",
                lengthMenu: "Show _MENU_ entries per page",
                info: "Showing _START_ to _END_ of _TOTAL_ entries",
                infoEmpty: "Showing 0 to 0 of 0 entries",
                infoFiltered: "(filtered from _MAX_ total entries)"
            }
        });
    }
    
    // Flatpickr initialization for date inputs
    if (typeof flatpickr !== 'undefined') {
        flatpickr(".datepicker", {
            altInput: true,
            altFormat: "F j, Y",
            dateFormat: "Y-m-d"
        });
    }
    
    // Auto-dismiss flash messages
    const flashMessages = document.querySelectorAll('.alert:not(.alert-persistent)');
    flashMessages.forEach(function(message) {
        setTimeout(function() {
            const alert = new bootstrap.Alert(message);
            alert.close();
        }, 5000);
    });
    
    // Handle attendance marking buttons
    const markAttendanceBtns = document.querySelectorAll('button[onclick^="markAttendance"]');
    markAttendanceBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const onclick = btn.getAttribute('onclick');
            const params = onclick.match(/markAttendance\((\d+),\s*(\d+),\s*['"](\w+)['"]\)/);
            
            if (params && params.length === 4) {
                markAttendance(parseInt(params[1]), parseInt(params[2]), params[3]);
            }
        });
    });
    
    // Handle export buttons
    const exportBtns = document.querySelectorAll('.export-btn');
    exportBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const type = btn.getAttribute('data-type');
            const tableData = document.getElementById('report-data-body');
            
            if (tableData && tableData.children.length > 0) {
                const data = [];
                const headers = ['Date', 'Roll/Employee ID', 'Name', 'Department', 'Status', 'Time In', 'Time Out'];
                
                // Add headers
                data.push(headers);
                
                // Add rows
                const rows = tableData.querySelectorAll('tr');
                rows.forEach(function(row) {
                    const rowData = [];
                    const cells = row.querySelectorAll('td');
                    cells.forEach(function(cell) {
                        rowData.push(cell.textContent.trim());
                    });
                    data.push(rowData);
                });
                
                exportReport(data, type);
            }
        });
    });
});

// Update theme icon based on current theme
function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (theme === 'light') {
            icon.className = 'fas fa-moon';
        } else {
            icon.className = 'fas fa-sun';
        }
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast bg-${type} text-white`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body d-flex justify-content-between align-items-center';
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white ms-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');
    
    toastBody.appendChild(messageSpan);
    toastBody.appendChild(closeButton);
    toast.appendChild(toastBody);
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, { 
        autohide: true,
        delay: 5000
    });
    
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Format time for display
function formatTime(timeString) {
    if (!timeString) return '';
    // Assuming timeString is in format HH:MM:SS
    return timeString.substring(0, 5);
}

// Mark attendance via AJAX
function markAttendance(personId, sessionId, status) {
    const formData = new FormData();
    formData.append('person_id', personId);
    formData.append('session_id', sessionId);
    formData.append('status', status);
    
    fetch('/mark_attendance', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update UI
            const statusCell = document.getElementById(`status-${personId}`);
            if (statusCell) {
                // Remove all status classes
                statusCell.classList.remove('status-present', 'status-absent', 'status-late');
                // Add new status class
                statusCell.classList.add(`status-${status}`);
                // Update text
                statusCell.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            }
            
            // Show success message
            showToast('Attendance updated successfully', 'success');
        } else {
            showToast(data.message || 'Failed to update attendance', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('An error occurred while updating attendance', 'danger');
    });
}

// Export report data
function exportReport(data, type = 'csv') {
    if (!data || !data.length) return;
    
    if (type === 'csv') {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        data.forEach(function(row) {
            let rowContent = row.join(',');
            csvContent += rowContent + "\r\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "attendance_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else if (type === 'pdf') {
        // PDF export would require additional libraries like jsPDF
        showToast('PDF export is not implemented yet', 'info');
    }
}