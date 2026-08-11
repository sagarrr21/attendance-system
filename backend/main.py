import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Employee, Attendance
from schemas import EmployeeCreate, EmployeeResponse
from attendance_schemas import (
    AttendanceCheckIn,
    AttendanceCheckOut,
    AttendanceResponse,
)



# ============================================================
# DATABASE
# ============================================================

Base.metadata.create_all(bind=engine)


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Attendance Management System",
    description="Face Recognition & Biometric Attendance API",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Attendance Management API is running",
        "status": "success",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }


# ============================================================
# CREATE EMPLOYEE
# ============================================================

@app.post(
    "/employees",
    response_model=EmployeeResponse,
)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
):
    existing_employee = (
        db.query(Employee)
        .filter(
            Employee.employee_code == employee.employee_code
        )
        .first()
    )

    if existing_employee:
        raise HTTPException(
            status_code=400,
            detail="Employee code already exists",
        )

    existing_email = (
        db.query(Employee)
        .filter(
            Employee.email == employee.email
        )
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    new_employee = Employee(
        employee_code=employee.employee_code,
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        department=employee.department,
        designation=employee.designation,
        status="active",
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return new_employee


# ============================================================
# GET EMPLOYEES
# ============================================================

@app.get(
    "/employees",
    response_model=list[EmployeeResponse],
)
def get_employees(
    db: Session = Depends(get_db),
):
    employees = db.query(Employee).all()

    return employees


# ============================================================
# CHECK IN
# ============================================================

@app.post(
    "/attendance/check-in",
    response_model=AttendanceResponse,
)
def check_in(
    data: AttendanceCheckIn,
    db: Session = Depends(get_db),
):
    employee = (
        db.query(Employee)
        .filter(Employee.id == data.employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    existing_attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == data.employee_id
        )
        .filter(
            Attendance.attendance_date
            == Attendance.today()
        )
        .first()
    )

    if existing_attendance:
        raise HTTPException(
            status_code=400,
            detail="Employee already checked in today",
        )

    attendance = Attendance(
        employee_id=data.employee_id,
        attendance_date=Attendance.today(),
        check_in=Attendance.current_time(),
        status="present",
        method="manual",
    )

    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return attendance


# ============================================================
# CHECK OUT
# ============================================================

@app.post(
    "/attendance/check-out",
    response_model=AttendanceResponse,
)
def check_out(
    data: AttendanceCheckOut,
    db: Session = Depends(get_db),
):
    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == data.employee_id
        )
        .filter(
            Attendance.attendance_date
            == Attendance.today()
        )
        .first()
    )

    if not attendance:
        raise HTTPException(
            status_code=400,
            detail="Employee has not checked in today",
        )

    if attendance.check_out:
        raise HTTPException(
            status_code=400,
            detail="Employee already checked out today",
        )

    attendance.check_out = Attendance.current_time()

    db.commit()
    db.refresh(attendance)

    return attendance


# ============================================================
# GET ALL ATTENDANCE
# ============================================================

@app.get(
    "/attendance",
    response_model=list[AttendanceResponse],
)
def get_attendance(
    db: Session = Depends(get_db),
):
    attendance = (
        db.query(Attendance)
        .order_by(
            Attendance.attendance_date.desc()
        )
        .all()
    )

    return attendance


# ============================================================
# GET EMPLOYEE ATTENDANCE
# ============================================================

@app.get(
    "/attendance/employee/{employee_id}",
    response_model=list[AttendanceResponse],
)
def get_employee_attendance(
    employee_id: int,
    db: Session = Depends(get_db),
):
    employee = (
        db.query(Employee)
        .filter(Employee.id == employee_id)
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found",
        )

    attendance = (
        db.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id
        )
        .order_by(
            Attendance.attendance_date.desc()
        )
        .all()
    )

    return attendance