from datetime import date, time
from pydantic import BaseModel


class AttendanceCheckIn(BaseModel):
    employee_id: int


class AttendanceCheckOut(BaseModel):
    employee_id: int


class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    attendance_date: date
    check_in: time | None = None
    check_out: time | None = None
    status: str
    method: str

    class Config:
        from_attributes = True