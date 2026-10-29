from datetime import date

from pydantic import BaseModel


class EmployeeIn(BaseModel):
    name: str
    department: str
    startDate: date
    role: str = "employee"