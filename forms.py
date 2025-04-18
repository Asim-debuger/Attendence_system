from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField, TextAreaField, SelectField, DateField, TimeField
from wtforms.validators import DataRequired, Length, Email, EqualTo, ValidationError
from models import User, Person

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember = BooleanField('Remember Me')
    submit = SubmitField('Login')

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=20)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')
    
    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('That username is already taken. Please choose a different one.')
    
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('That email is already registered. Please use a different one or login.')

class PersonForm(FlaskForm):
    roll_id = StringField('Roll/Employee ID', validators=[DataRequired(), Length(min=2, max=20)])
    first_name = StringField('First Name', validators=[DataRequired(), Length(min=2, max=50)])
    last_name = StringField('Last Name', validators=[DataRequired(), Length(min=2, max=50)])
    email = StringField('Email', validators=[Email()])
    phone = StringField('Phone Number', validators=[Length(max=20)])
    department = StringField('Department/Class', validators=[Length(max=100)])
    submit = SubmitField('Save')
    
    def validate_roll_id(self, roll_id):
        person = Person.query.filter_by(roll_id=roll_id.data).first()
        if person and person.id != getattr(self, 'person_id', None):
            raise ValidationError('That Roll/Employee ID is already taken. Please use a different one.')
    
    def validate_email(self, email):
        if email.data:
            person = Person.query.filter_by(email=email.data).first()
            if person and person.id != getattr(self, 'person_id', None):
                raise ValidationError('That email is already registered. Please use a different one.')

class AttendanceForm(FlaskForm):
    date = DateField('Date', validators=[DataRequired()])
    status = SelectField('Status', choices=[('present', 'Present'), ('absent', 'Absent'), ('late', 'Late')], validators=[DataRequired()])
    notes = TextAreaField('Notes')
    submit = SubmitField('Save Attendance')

class SessionForm(FlaskForm):
    name = StringField('Session Name', validators=[DataRequired(), Length(max=100)])
    date = DateField('Date', validators=[DataRequired()])
    start_time = TimeField('Start Time', validators=[DataRequired()])
    end_time = TimeField('End Time')
    notes = TextAreaField('Notes')
    submit = SubmitField('Create Session')

class ReportForm(FlaskForm):
    start_date = DateField('Start Date', validators=[DataRequired()])
    end_date = DateField('End Date', validators=[DataRequired()])
    department = StringField('Department/Class')
    submit = SubmitField('Generate Report')
