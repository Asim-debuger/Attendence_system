import os
import io
import csv
import json
from datetime import datetime, date, time, timedelta
from flask import render_template, redirect, url_for, flash, request, jsonify, send_file
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
import base64
import numpy as np
import cv2
from app import app, db
from models import User, Person, Attendance, Session, FaceData
from forms import LoginForm, RegistrationForm, PersonForm, AttendanceForm, SessionForm, ReportForm
from face_utils import encode_face_image, save_face_encoding, recognize_face
import logging

# Configure logging
logger = logging.getLogger(__name__)

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        
        if user and user.check_password(form.password.data):
            login_user(user, remember=form.remember.data)
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('dashboard'))
        else:
            flash('Login unsuccessful. Please check username and password', 'danger')
    
    return render_template('login.html', form=form)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data
        )
        user.set_password(form.password.data)
        
        # Make first user an admin
        if User.query.count() == 0:
            user.is_admin = True
        
        db.session.add(user)
        db.session.commit()
        
        flash('Your account has been created! You can now log in', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    # Get attendance statistics
    today = date.today()
    present_today = Attendance.query.filter_by(date=today, status='present').count()
    absent_today = Attendance.query.filter_by(date=today, status='absent').count()
    late_today = Attendance.query.filter_by(date=today, status='late').count()
    
    # Get total registered persons
    total_persons = Person.query.count()
    
    # Recent attendance sessions
    recent_sessions = Session.query.order_by(Session.date.desc()).limit(5).all()
    
    # Weekly attendance stats (for chart data)
    one_week_ago = today - timedelta(days=7)
    daily_stats = []
    
    for i in range(7):
        day = one_week_ago + timedelta(days=i+1)
        present = Attendance.query.filter_by(date=day, status='present').count()
        absent = Attendance.query.filter_by(date=day, status='absent').count()
        late = Attendance.query.filter_by(date=day, status='late').count()
        
        daily_stats.append({
            'date': day.strftime('%Y-%m-%d'),
            'present': present,
            'absent': absent,
            'late': late
        })
    
    return render_template(
        'dashboard.html',
        present_today=present_today,
        absent_today=absent_today,
        late_today=late_today,
        total_persons=total_persons,
        recent_sessions=recent_sessions,
        daily_stats=json.dumps(daily_stats)
    )

@app.route('/students')
@login_required
def students():
    # Get all persons (students/employees)
    persons = Person.query.order_by(Person.first_name).all()
    return render_template('students.html', persons=persons)

@app.route('/add_student', methods=['GET', 'POST'])
@login_required
def add_student():
    form = PersonForm()
    
    if form.validate_on_submit():
        person = Person(
            roll_id=form.roll_id.data,
            first_name=form.first_name.data,
            last_name=form.last_name.data,
            email=form.email.data,
            phone=form.phone.data,
            department=form.department.data
        )
        
        db.session.add(person)
        db.session.commit()
        
        flash(f'{person.full_name} has been added!', 'success')
        return redirect(url_for('students'))
    
    return render_template('add_student.html', form=form, title='Add Student')

@app.route('/edit_student/<int:person_id>', methods=['GET', 'POST'])
@login_required
def edit_student(person_id):
    person = Person.query.get_or_404(person_id)
    form = PersonForm()
    
    # Store person_id for validation
    form.person_id = person_id
    
    if form.validate_on_submit():
        person.roll_id = form.roll_id.data
        person.first_name = form.first_name.data
        person.last_name = form.last_name.data
        person.email = form.email.data
        person.phone = form.phone.data
        person.department = form.department.data
        
        db.session.commit()
        
        flash(f'{person.full_name} has been updated!', 'success')
        return redirect(url_for('students'))
    
    # Fill form with existing data
    if request.method == 'GET':
        form.roll_id.data = person.roll_id
        form.first_name.data = person.first_name
        form.last_name.data = person.last_name
        form.email.data = person.email
        form.phone.data = person.phone
        form.department.data = person.department
    
    return render_template('add_student.html', form=form, title='Edit Student')

@app.route('/delete_student/<int:person_id>', methods=['POST'])
@login_required
def delete_student(person_id):
    person = Person.query.get_or_404(person_id)
    
    # Delete associated face data
    FaceData.query.filter_by(person_id=person_id).delete()
    
    # Delete associated attendance records
    Attendance.query.filter_by(person_id=person_id).delete()
    
    db.session.delete(person)
    db.session.commit()
    
    flash(f'{person.full_name} has been deleted!', 'success')
    return redirect(url_for('students'))

@app.route('/upload_face/<int:person_id>', methods=['POST'])
@login_required
def upload_face(person_id):
    person = Person.query.get_or_404(person_id)
    
    if 'face_image' not in request.files:
        return jsonify({'success': False, 'message': 'No face image provided'})
    
    image_file = request.files['face_image']
    
    if image_file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'})
    
    try:
        # Read image data
        image_data = image_file.read()
        
        # Encode face
        encoding, message = encode_face_image(image_data)
        
        if encoding is None:
            return jsonify({'success': False, 'message': message})
        
        # Save face encoding
        success, save_message = save_face_encoding(person_id, encoding)
        
        if not success:
            return jsonify({'success': False, 'message': save_message})
        
        return jsonify({'success': True, 'message': 'Face data uploaded successfully'})
    
    except Exception as e:
        logger.error(f"Error in upload_face: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/take_attendance')
@login_required
def take_attendance():
    # Get all sessions
    sessions = Session.query.order_by(Session.date.desc()).all()
    
    return render_template('take_attendance.html', sessions=sessions)

@app.route('/create_session', methods=['GET', 'POST'])
@login_required
def create_session():
    form = SessionForm()
    
    if form.validate_on_submit():
        session = Session(
            name=form.name.data,
            date=form.date.data,
            start_time=form.start_time.data,
            end_time=form.end_time.data,
            notes=form.notes.data,
            created_by=current_user.id
        )
        
        db.session.add(session)
        db.session.commit()
        
        flash('Attendance session created!', 'success')
        return redirect(url_for('take_attendance'))
    
    return render_template('create_session.html', form=form)

@app.route('/recognize_face', methods=['POST'])
@login_required
def recognize_face_route():
    if 'face_image' not in request.files:
        return jsonify({'success': False, 'message': 'No face image provided'})
    
    session_id = request.form.get('session_id')
    if not session_id:
        return jsonify({'success': False, 'message': 'No session selected'})
    
    session = Session.query.get_or_404(session_id)
    
    image_file = request.files['face_image']
    if image_file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'})
    
    try:
        # Read image data
        image_data = image_file.read()
        
        # Recognize face
        matches, message = recognize_face(image_data)
        
        if matches is None:
            return jsonify({'success': False, 'message': message})
        
        # Add attendance for matched persons
        attendance_records = []
        
        for match in matches:
            person_id = match['person_id']
            
            # Check if attendance already recorded for this session and person
            existing = Attendance.query.filter_by(
                person_id=person_id,
                date=session.date,
                session_id=session.id
            ).first()
            
            if existing:
                attendance_records.append({
                    'name': match['name'],
                    'roll_id': match['roll_id'],
                    'status': 'already_recorded'
                })
                continue
            
            # Create new attendance record
            attendance = Attendance(
                person_id=person_id,
                date=session.date,
                time_in=datetime.now().time(),
                status='present',
                created_by=current_user.id,
                session_id=session.id
            )
            
            db.session.add(attendance)
            
            attendance_records.append({
                'name': match['name'],
                'roll_id': match['roll_id'],
                'status': 'marked_present'
            })
        
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': 'Face recognition successful',
            'matches': attendance_records
        })
    
    except Exception as e:
        logger.error(f"Error in recognize_face_route: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/attendance')
@login_required
def attendance():
    # Get all sessions
    sessions = Session.query.order_by(Session.date.desc()).all()
    
    return render_template('attendance.html', sessions=sessions)

@app.route('/session_attendance/<int:session_id>')
@login_required
def session_attendance(session_id):
    session = Session.query.get_or_404(session_id)
    
    # Get all attendance records for this session
    attendances = Attendance.query.filter_by(session_id=session_id).all()
    
    # Get all persons
    persons = Person.query.all()
    
    # Create a dictionary of person_id to attendance status
    attendance_map = {a.person_id: a for a in attendances}
    
    # Prepare data for template
    attendance_data = []
    
    for person in persons:
        if person.id in attendance_map:
            attendance = attendance_map[person.id]
            status = attendance.status
        else:
            status = 'absent'
        
        attendance_data.append({
            'person': person,
            'status': status
        })
    
    return render_template(
        'session_attendance.html',
        session=session,
        attendance_data=attendance_data
    )

@app.route('/mark_attendance', methods=['POST'])
@login_required
def mark_attendance():
    person_id = request.form.get('person_id')
    session_id = request.form.get('session_id')
    status = request.form.get('status')
    
    if not person_id or not session_id or not status:
        return jsonify({'success': False, 'message': 'Missing required data'})
    
    session = Session.query.get_or_404(session_id)
    
    # Check if attendance already exists
    attendance = Attendance.query.filter_by(
        person_id=person_id,
        date=session.date,
        session_id=session_id
    ).first()
    
    if attendance:
        # Update existing attendance
        attendance.status = status
        attendance.time_in = datetime.now().time() if status == 'present' else attendance.time_in
    else:
        # Create new attendance
        attendance = Attendance(
            person_id=person_id,
            date=session.date,
            time_in=datetime.now().time() if status == 'present' else None,
            status=status,
            created_by=current_user.id,
            session_id=session_id
        )
        db.session.add(attendance)
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Attendance updated'})

@app.route('/reports')
@login_required
def reports():
    form = ReportForm()
    
    # Default to showing current month
    today = date.today()
    start_date = date(today.year, today.month, 1)
    end_date = today
    
    # Get departments for filtering
    departments = db.session.query(Person.department).distinct().all()
    departments = [d[0] for d in departments if d[0]]
    
    return render_template('reports.html', form=form, departments=departments)

@app.route('/generate_report', methods=['POST'])
@login_required
def generate_report():
    form = ReportForm()
    
    if form.validate_on_submit():
        start_date = form.start_date.data
        end_date = form.end_date.data
        department = form.department.data
        
        # Query attendance based on filters
        query = db.session.query(
            Attendance, Person
        ).join(
            Person, Attendance.person_id == Person.id
        ).filter(
            Attendance.date >= start_date,
            Attendance.date <= end_date
        )
        
        if department:
            query = query.filter(Person.department == department)
        
        results = query.order_by(Attendance.date, Person.first_name).all()
        
        # Process results for the report
        report_data = []
        
        for attendance, person in results:
            report_data.append({
                'date': attendance.date.strftime('%Y-%m-%d'),
                'roll_id': person.roll_id,
                'name': person.full_name,
                'department': person.department,
                'status': attendance.status,
                'time_in': attendance.time_in.strftime('%H:%M') if attendance.time_in else None,
                'time_out': attendance.time_out.strftime('%H:%M') if attendance.time_out else None
            })
        
        # Calculate summary statistics
        total_records = len(report_data)
        present_count = sum(1 for item in report_data if item['status'] == 'present')
        absent_count = sum(1 for item in report_data if item['status'] == 'absent')
        late_count = sum(1 for item in report_data if item['status'] == 'late')
        
        # Calculate daily attendance
        dates = sorted(set(item['date'] for item in report_data))
        daily_stats = []
        
        for day in dates:
            day_records = [item for item in report_data if item['date'] == day]
            present = sum(1 for item in day_records if item['status'] == 'present')
            absent = sum(1 for item in day_records if item['status'] == 'absent')
            late = sum(1 for item in day_records if item['status'] == 'late')
            
            daily_stats.append({
                'date': day,
                'present': present,
                'absent': absent,
                'late': late,
                'total': present + absent + late
            })
        
        return jsonify({
            'success': True,
            'report_data': report_data,
            'summary': {
                'total_records': total_records,
                'present_count': present_count,
                'absent_count': absent_count,
                'late_count': late_count
            },
            'daily_stats': daily_stats
        })
    
    return jsonify({'success': False, 'message': 'Invalid form data'})

@app.route('/export_report', methods=['POST'])
@login_required
def export_report():
    data = request.json.get('data')
    export_type = request.json.get('type', 'csv')
    
    if not data:
        return jsonify({'success': False, 'message': 'No data to export'})
    
    try:
        if export_type == 'csv':
            # Create CSV in memory
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow(['Date', 'Roll ID', 'Name', 'Department', 'Status', 'Time In', 'Time Out'])
            
            # Write data
            for row in data:
                writer.writerow([
                    row['date'],
                    row['roll_id'],
                    row['name'],
                    row['department'],
                    row['status'],
                    row['time_in'] or '',
                    row['time_out'] or ''
                ])
            
            # Create response
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'attendance_report_{datetime.now().strftime("%Y%m%d")}.csv'
            )
        
        # Support for PDF can be added here
        
        return jsonify({'success': False, 'message': 'Unsupported export type'})
    
    except Exception as e:
        logger.error(f"Error in export_report: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html')

@app.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    email = request.form.get('email')
    current_password = request.form.get('current_password')
    new_password = request.form.get('new_password')
    
    if email and email != current_user.email:
        # Check if email already exists
        if User.query.filter_by(email=email).first():
            flash('Email already in use', 'danger')
            return redirect(url_for('profile'))
        
        current_user.email = email
        flash('Email updated successfully', 'success')
    
    if current_password and new_password:
        # Verify current password
        if not current_user.check_password(current_password):
            flash('Current password is incorrect', 'danger')
            return redirect(url_for('profile'))
        
        # Update password
        current_user.set_password(new_password)
        flash('Password updated successfully', 'success')
    
    db.session.commit()
    return redirect(url_for('profile'))
