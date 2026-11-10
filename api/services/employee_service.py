import os
import uuid

import boto3
from boto3.dynamodb.conditions import Key
from aws_lambda_powertools import Logger, Tracer


logger = Logger()
tracer = Tracer()

table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])



@tracer.capture_method
def create(data: dict) -> dict:
    """Create an employee with a generated id."""
    logger.info("creating employee", department=data.get("department"))
    return save(uuid.uuid4().hex[:8], data)


@tracer.capture_method
def save(employee_id: str, data: dict) -> dict:
    """Create or replace an employee."""
    item = {
        "PK": "USER",
        "SK": employee_id,
        "GSI1PK": "USER_BY_DATE",
        "GSI1SK": data["startDate"],
        "employeeId": employee_id,
        "name": data["name"],
        "department": data["department"],
        "startDate": data["startDate"],
        "role": data.get("role", "employee"),
    }
    table.put_item(Item=item)
    return item


@tracer.capture_method
def get(employee_id: str) -> dict | None:
    logger.info("getting employee", employee_id=employee_id)
    response = table.get_item(Key={"PK": "USER", "SK": employee_id})
    item = response.get("Item")
    logger.info("get employee result", employee_id=employee_id, found=item is not None)
    return item


@tracer.capture_method
def list_all() -> list[dict]:
    logger.info("listing all employees")
    response = table.query(KeyConditionExpression=Key("PK").eq("USER"))
    items = response["Items"]
    logger.info("listed all employees", count=len(items))
    return items


@tracer.capture_method
def list_by_hire_date(hired_from: str, hired_to: str) -> list[dict]:
    logger.info(
        "listing employees by hire date", hired_from=hired_from, hired_to=hired_to
    )
    response = table.query(
        IndexName="GSI1",
        KeyConditionExpression=Key("GSI1PK").eq("USER_BY_DATE")
        & Key("GSI1SK").between(hired_from, hired_to),
    )
    items = response["Items"]
    logger.info("listed employees by hire date", count=len(items))
    return items
