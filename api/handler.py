from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from controllers import employee_controller, hr_request_controller

app = FastAPI(title="HR Leave Portal")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

app.include_router(employee_controller.router)
app.include_router(hr_request_controller.router)

lambda_handler = Mangum(app)