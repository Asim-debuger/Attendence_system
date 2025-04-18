// Charts handling for the Advanced Attendance System

// Function to create attendance chart
function createAttendanceChart(elementId, data) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return null;
    
    // Extract dates and attendance counts
    const dates = data.map(item => item.date);
    const presentCounts = data.map(item => item.present);
    const absentCounts = data.map(item => item.absent);
    const lateCounts = data.map(item => item.late);
    
    // Format dates for better display
    const formattedDates = dates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    // Create chart
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: formattedDates,
            datasets: [
                {
                    label: 'Present',
                    data: presentCounts,
                    backgroundColor: '#1cc88a',
                    borderColor: '#1cc88a',
                    borderWidth: 1
                },
                {
                    label: 'Absent',
                    data: absentCounts,
                    backgroundColor: '#e74a3b',
                    borderColor: '#e74a3b',
                    borderWidth: 1
                },
                {
                    label: 'Late',
                    data: lateCounts,
                    backgroundColor: '#f6c23e',
                    borderColor: '#f6c23e',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// Function to create donut chart for attendance overview
function createAttendanceDonutChart(elementId, present, absent, late) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return null;
    
    // Create chart
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent', 'Late'],
            datasets: [
                {
                    data: [present, absent, late],
                    backgroundColor: ['#1cc88a', '#e74a3b', '#f6c23e'],
                    hoverBackgroundColor: ['#169c6b', '#c73c2d', '#e0ae38'],
                    hoverBorderColor: "rgba(234, 236, 244, 1)",
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.formattedValue;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = Math.round((context.raw / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// Function to create line chart for attendance trends
function createAttendanceTrendChart(elementId, data) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return null;
    
    // Extract dates and attendance counts
    const dates = data.map(item => item.date);
    const presentCounts = data.map(item => item.present);
    const totalCounts = data.map(item => item.present + item.absent + item.late);
    
    // Calculate attendance rate
    const attendanceRates = presentCounts.map((present, i) => {
        const total = totalCounts[i];
        return total > 0 ? (present / total) * 100 : 0;
    });
    
    // Format dates for better display
    const formattedDates = dates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    // Create chart
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedDates,
            datasets: [
                {
                    label: 'Attendance Rate (%)',
                    data: attendanceRates,
                    fill: false,
                    backgroundColor: '#4e73df',
                    borderColor: '#4e73df',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = Math.round(context.raw * 10) / 10;
                            return `Attendance Rate: ${value}%`;
                        }
                    }
                }
            }
        }
    });
}

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Dashboard weekly attendance chart
    const dashboardChartElement = document.getElementById('attendance-chart');
    if (dashboardChartElement) {
        const chartDataElement = document.getElementById('chart-data');
        if (chartDataElement) {
            try {
                const chartData = JSON.parse(chartDataElement.textContent);
                createAttendanceChart('attendance-chart', chartData);
            } catch (error) {
                console.error('Error parsing chart data:', error);
            }
        }
    }
    
    // Reports page charts
    const reportGenerateBtn = document.getElementById('generate-report-btn');
    if (reportGenerateBtn) {
        reportGenerateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const startDate = document.getElementById('start_date').value;
            const endDate = document.getElementById('end_date').value;
            const department = document.getElementById('department').value;
            
            if (!startDate || !endDate) {
                showToast('Please select start and end dates', 'warning');
                return;
            }
            
            // Show loading indicator
            reportGenerateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
            reportGenerateBtn.disabled = true;
            
            // Create form data
            const formData = new FormData(document.getElementById('report-form'));
            
            // Send request
            fetch('/generate_report', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Reset button
                reportGenerateBtn.innerHTML = 'Generate Report';
                reportGenerateBtn.disabled = false;
                
                if (data.success) {
                    // Show report container
                    const reportContainer = document.getElementById('report-container');
                    if (reportContainer) {
                        reportContainer.style.display = 'block';
                    }
                    
                    // Populate summary stats
                    const summaryElement = document.getElementById('report-summary');
                    if (summaryElement) {
                        summaryElement.innerHTML = `
                            <div class="row">
                                <div class="col-md-3">
                                    <div class="card stat-card stat-card-primary">
                                        <div class="card-body">
                                            <div class="row no-gutters align-items-center">
                                                <div class="col mr-2">
                                                    <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                                        Total Records
                                                    </div>
                                                    <div class="h5 mb-0 font-weight-bold">${data.summary.total_records}</div>
                                                </div>
                                                <div class="col-auto">
                                                    <i class="fas fa-calendar fa-2x text-gray-300"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card stat-card stat-card-success">
                                        <div class="card-body">
                                            <div class="row no-gutters align-items-center">
                                                <div class="col mr-2">
                                                    <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                                        Present
                                                    </div>
                                                    <div class="h5 mb-0 font-weight-bold">${data.summary.present_count}</div>
                                                </div>
                                                <div class="col-auto">
                                                    <i class="fas fa-check fa-2x text-gray-300"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card stat-card stat-card-danger">
                                        <div class="card-body">
                                            <div class="row no-gutters align-items-center">
                                                <div class="col mr-2">
                                                    <div class="text-xs font-weight-bold text-danger text-uppercase mb-1">
                                                        Absent
                                                    </div>
                                                    <div class="h5 mb-0 font-weight-bold">${data.summary.absent_count}</div>
                                                </div>
                                                <div class="col-auto">
                                                    <i class="fas fa-times fa-2x text-gray-300"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="card stat-card stat-card-warning">
                                        <div class="card-body">
                                            <div class="row no-gutters align-items-center">
                                                <div class="col mr-2">
                                                    <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                                        Late
                                                    </div>
                                                    <div class="h5 mb-0 font-weight-bold">${data.summary.late_count}</div>
                                                </div>
                                                <div class="col-auto">
                                                    <i class="fas fa-clock fa-2x text-gray-300"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                    
                    // Create charts
                    const chartRow = document.getElementById('report-charts');
                    if (chartRow) {
                        chartRow.innerHTML = `
                            <div class="col-md-8">
                                <div class="card shadow mb-4">
                                    <div class="card-header py-3">
                                        <h6 class="m-0 font-weight-bold text-primary">Daily Attendance</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="chart-container">
                                            <canvas id="daily-attendance-chart"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="card shadow mb-4">
                                    <div class="card-header py-3">
                                        <h6 class="m-0 font-weight-bold text-primary">Attendance Overview</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="chart-container">
                                            <canvas id="attendance-overview-chart"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-12">
                                <div class="card shadow mb-4">
                                    <div class="card-header py-3">
                                        <h6 class="m-0 font-weight-bold text-primary">Attendance Rate Trend</h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="chart-container">
                                            <canvas id="attendance-trend-chart"></canvas>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        // Create the charts
                        createAttendanceChart('daily-attendance-chart', data.daily_stats);
                        createAttendanceDonutChart(
                            'attendance-overview-chart',
                            data.summary.present_count,
                            data.summary.absent_count,
                            data.summary.late_count
                        );
                        createAttendanceTrendChart('attendance-trend-chart', data.daily_stats);
                    }
                    
                    // Populate data table
                    const dataTableBody = document.getElementById('report-data-body');
                    if (dataTableBody) {
                        let tableHtml = '';
                        
                        data.report_data.forEach(record => {
                            const statusClass = `status-${record.status}`;
                            
                            tableHtml += `
                                <tr>
                                    <td>${record.date}</td>
                                    <td>${record.roll_id}</td>
                                    <td>${record.name}</td>
                                    <td>${record.department || '-'}</td>
                                    <td class="${statusClass}">${record.status.charAt(0).toUpperCase() + record.status.slice(1)}</td>
                                    <td>${record.time_in || '-'}</td>
                                    <td>${record.time_out || '-'}</td>
                                </tr>
                            `;
                        });
                        
                        dataTableBody.innerHTML = tableHtml;
                    }
                    
                    // Store report data for export
                    window.reportData = data.report_data;
                    
                    // Enable export buttons
                    const exportButtons = document.querySelectorAll('.export-btn');
                    exportButtons.forEach(btn => {
                        btn.disabled = false;
                    });
                } else {
                    showToast('Error: ' + data.message, 'danger');
                }
            })
            .catch(error => {
                reportGenerateBtn.innerHTML = 'Generate Report';
                reportGenerateBtn.disabled = false;
                showToast('Error: ' + error.message, 'danger');
            });
        });
        
        // Export button handlers
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const exportType = this.getAttribute('data-type');
                if (window.reportData) {
                    exportReport(window.reportData, exportType);
                } else {
                    showToast('No report data to export', 'warning');
                }
            });
        });
    }
});
