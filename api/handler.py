from aws_lambda_powertools import Logger, Tracer
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from controllers import employee_controller, hr_request_controller, leave_controller

logger = Logger()
tracer = Tracer()

app = FastAPI(title="HR Leave Portal")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

app.include_router(employee_controller.router)
app.include_router(leave_controller.router)
app.include_router(hr_request_controller.router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("request received", method=request.method, path=request.url.path)
    response = await call_next(request)
    logger.info("request completed", status_code=response.status_code)
    return response


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def lambda_handler(event, context):
    return Mangum(app)(event, context)