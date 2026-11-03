from fastapi import APIRouter

from models import HrRequestIn, TimeOffRequestIn
from services import hr_request_service

router = APIRouter(tags=["hr-requests"])


@router.post("/hr-requests/time-off", status_code=202)
def start_time_off_request(payload: TimeOffRequestIn):
    return hr_request_service.start_time_off_request(payload.model_dump(mode="json"))


@router.post("/hr-requests", status_code=202)
def start_hr_request(payload: HrRequestIn):
    return hr_request_service.start_hr_request(payload.model_dump(mode="json"))