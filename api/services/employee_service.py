import os
import uuid
import boto3
from boto3.dynamodb.conditions import Key

table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])


def create(data: dict) -> dict:
    """Create an employee with a generated id."""
    return save(uuid.uuid4().hex[:8], data)


def save(employee_id: str, data: dict) -> dict:
    """Create or replace an employee."""
    item = {
        "PK": "USER",
        "SK": employee_id,
        "employeeId": employee_id,
        "name": data["name"],
        "department": data["department"],
        "startDate": data["startDate"],
        "role": data.get("role", "employee"),
    }
    table.put_item(Item=item)
    return item

def get(employee_id: str) -> dict | None:
    response = table.get_item(Key={"PK": "USER", "SK": employee_id})
    return response.get("Item")


def list_all() -> list[dict]:
    response = table.query(KeyConditionExpression=Key("PK").eq("USER"))
    return response["Items"]

def delete(employee_id: str) -> None:
    table.delete_item(Key={"PK": "USER", "SK": employee_id})    