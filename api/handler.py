from fastapi import FastAPI
from mangum import Mangum

from controllers import employee_controller

app = FastAPI(title="HR Leave Portal")

app.include_router(employee_controller.router)

lambda_handler = Mangum(app)