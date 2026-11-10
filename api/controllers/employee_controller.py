from fastapi import APIRouter, Depends, HTTPException
from datetime import date

from models import EmployeeIn
from services import employee_service
from auth import get_caller, require_owner_or_admin

router = APIRouter(tags=["employees"])


@router.post("/employees", status_code=201)
def create_employee(payload: EmployeeIn):
    return employee_service.create(payload.model_dump(mode="json"))


# ... the other routes are unchanged for now ...


@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: str, caller: dict = Depends(get_caller)):
    # You can't authorize against a record you haven't read, so fetch first.
    employee = employee_service.get(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    require_owner_or_admin(caller, employee)

    employee_service.delete(employee_id)
    return {"deleted": employee_id}