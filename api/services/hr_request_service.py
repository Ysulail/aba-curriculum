import json
import os

import boto3
from aws_lambda_powertools import Logger, Tracer

logger = Logger()
tracer = Tracer()

STATE_MACHINE_ARN = os.environ["HR_STATE_MACHINE_ARN"]

stepfunctions = boto3.client("stepfunctions")


@tracer.capture_method
def start_time_off_request(data: dict) -> dict:
    """Start the HR workflow for a time-off request. Returns immediately."""
    execution_input = {
        "hr_request_type": "TimeOff",
        "user_id": data["user_id"],
        "start_date": data["start_date"],
        "end_date": data["end_date"],
    }

    response = stepfunctions.start_execution(
        stateMachineArn=STATE_MACHINE_ARN,
        input=json.dumps(execution_input))

    logger.info("started hr workflow", execution_arn=response["executionArn"])
    return {"executionArn": response["executionArn"]}


@tracer.capture_method
def start_hr_request(data: dict) -> dict:
    """Start the HR workflow for a general request. Anything but TimeOff hits Bedrock."""
    execution_input = {
        "hr_request_type": "BenefitsInquiry",
        "user_id": data["user_id"],
        "prompt": data["prompt"],
    }

    response = stepfunctions.start_execution(
        stateMachineArn=STATE_MACHINE_ARN,
        input=json.dumps(execution_input))

    logger.info("started hr workflow", execution_arn=response["executionArn"])
    return {"executionArn": response["executionArn"]}