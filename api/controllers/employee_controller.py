from fastapi import APIRouter, HTTPException


from models import EmployeeIn
from services import employee_service

router = APIRouter(tags=["employees"])


@router.post("/employees", status_code=201)
def create_employee(payload: EmployeeIn):
    return employee_service.create(payload.model_dump(mode="json"))


@router.get("/employees")
def list_employees():
    return {"employees": employee_service.list_all()}


@router.get("/employees/{employee_id}")
def get_employee(employee_id: str):
    employee = employee_service.get(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: str):
    employee_service.delete(employee_id)
    return {"deleted": employee_id}        

@router.put("/employees/{employee_id}")
def save_employee(employee_id: str, payload: EmployeeIn):
    return employee_service.save(employee_id, payload.model_dump(mode="json"))    

@router.get("/employees")
def list_employees():
    employees = employee_service.list_all()
    return {"employees": employees, "count": len(employees)}


    return employee