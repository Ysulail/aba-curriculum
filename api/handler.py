from fastapi import FastAPI

from controllers import employee_controller

app = FastAPI(title="HR Leave Portal")

app.include_router(employee_controller.router)