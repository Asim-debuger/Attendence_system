// Wait for DOM content to load
document.addEventListener('DOMContentLoaded', function() {
    // Attendance chart on dashboard
    const attendanceChart = document.getElementById('attendance-chart');
    if (attendanceChart) {
        const chartDataElement = document.getElementById('chart-data');
        if (chartDataElement) {
            try {
                const chartData = JSON.parse(chartDataElement.textContent);
                createAttendanceTrendChart('attendance-chart', chartData);
            } catch (error) {
                console.error('Error parsing chart data:', error);
            }
        }
    }
    
    // Report generation event handler
    const generateReportBtn = document.getElementById('generate-report-btn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', function() {
            const form = document.getElementById('report-form');
            if (form) {
                // Convert form data to object
                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => {
                    data[key] = value;
                });
                
                // Send AJAX request
                fetch('/generate_report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(data)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Hide tips, show report container
                        document.getElementById('report-tips').style.display = 'none';
                        document.getElementById('report-container').style.display = 'block';
                        
                        // Enable export buttons
                        document.querySelectorAll('.export-btn').forEach(btn => {
                            btn.disabled = false;
                        });
                        
                        // Display summary statistics
                        document.getElementById('report-summary').innerHTML = `
                            <div class="row">
                                <div class="col-md-3 mb-3">
                                    <div class="card bg-light">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Total Records</h6>
                                            <h3>${data.total_records}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="card bg-success text-white">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Present</h6>
                                            <h3>${data.present_count}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="card bg-danger text-white">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Absent</h6>
                                            <h3>${data.absent_count}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3 mb-3">
                                    <div class="card bg-warning text-dark">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Late</h6>
                                            <h3>${data.late_count}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        // Display charts
                        document.getElementById('report-charts').innerHTML = `
                            <div class="col-md-6 mb-4">
                                <div class="card shadow-sm">
                                    <div class="card-header">
                                        <h5 class="card-title mb-0">Attendance Distribution</h5>
                                    </div>
                                    <div class="card-body">
                                        <canvas id="attendance-donut-chart"></canvas>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6 mb-4">
                                <div class="card shadow-sm">
                                    <div class="card-header">
                                        <h5 class="card-title mb-0">Daily Trend</h5>
                                    </div>
                                    <div class="card-body">
                                        <canvas id="attendance-trend-chart"></canvas>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        // Create charts
                        createAttendanceDonutChart('attendance-donut-chart', data.present_count, data.absent_count, data.late_count);
                        createAttendanceTrendChart('attendance-trend-chart', data.daily_stats);
                        
                        // Display data in table
                        let tableHtml = '';
                        data.report_data.forEach(item => {
                            tableHtml += `
                                <tr>
                                    <td>${item.date}</td>
                                    <td>${item.roll_id}</td>
                                    <td>${item.name}</td>
                                    <td>${item.department || '-'}</td>
                                    <td class="status-${item.status}">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</td>
                                    <td>${item.time_in || '-'}</td>
                                    <td>${item.time_out || '-'}</td>
                                </tr>
                            `;
                        });
                        document.getElementById('report-data-body').innerHTML = tableHtml;
                    } else {
                        alert('Failed to generate report: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while generating the report');
                });
            }
        });
    }
});

// Create attendance trend chart
function createAttendanceTrendChart(elementId, data) {
    const ctx = document.getElementById(elementId).getContext('2d');
    
    // Extract dates and counts from data
    const dates = data.map(item => item.date);
    const presentCounts = data.map(item => item.present);
    const absentCounts = data.map(item => item.absent);
    const lateCounts = data.map(item => item.late);
    
    // Create chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Present',
                    data: presentCounts,
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2,
                    tension: 0.1
                },
                {
                    label: 'Absent',
                    data: absentCounts,
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 2,
                    tension: 0.1
                },
                {
                    label: 'Late',
                    data: lateCounts,
                    backgroundColor: 'rgba(255, 193, 7, 0.2)',
                    borderColor: 'rgba(255, 193, 7, 1)',
                    borderWidth: 2,
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
                    position: 'top'
                }
            }
        }
    });
}

// Create attendance donut chart
function createAttendanceDonutChart(elementId, present, absent, late) {
    const ctx = document.getElementById(elementId).getContext('2d');
    
    // Create chart
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent', 'Late'],
            datasets: [{
                data: [present, absent, late],
                backgroundColor: [
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(255, 193, 7, 0.8)'
                ],
                borderColor: [
                    'rgba(40, 167, 69, 1)',
                    'rgba(220, 53, 69, 1)',
                    'rgba(255, 193, 7, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}