"""Employee persistence tests against an isolated DynamoDB table."""

import importlib
import sys

import boto3
import pytest
from moto import mock_aws


@pytest.fixture
def employee_service(monkeypatch):
    monkeypatch.setenv("TABLE_NAME", "employees-test")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.setenv("POWERTOOLS_TRACE_DISABLED", "true")

    with mock_aws():
        table = boto3.resource("dynamodb").create_table(
            TableName="employees-test",
            KeySchema=[
                {"AttributeName": "PK", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": name, "AttributeType": "S"}
                for name in ("PK", "SK", "startDate")
            ],
            BillingMode="PAY_PER_REQUEST",
            LocalSecondaryIndexes=[
                {
                    "IndexName": "ByStartDate",
                    "KeySchema": [
                        {"AttributeName": "PK", "KeyType": "HASH"},
                        {"AttributeName": "startDate", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                }
            ],
        )
        table.wait_until_exists()
        # Force a fresh import after the environment and mocked table exist.
        module_name = "api.services.employee_service"
        monkeypatch.delitem(sys.modules, module_name, raising=False)
        service = importlib.import_module(module_name)
        try:
            yield service, table
        finally:
            sys.modules.pop(module_name, None)


@pytest.fixture
def employee_data():
    return {
        "name": "Sam Taylor",
        "department": "Engineering",
        "startDate": "2026-01-15",
        "role": "manager",
    }


def test_create_generates_eight_character_id_and_persists_user(employee_service, employee_data):
    # Arrange
    service, table = employee_service

    # Act
    item = service.create(employee_data)

    # Assert
    assert len(item["employeeId"]) == 8
    assert item["PK"] == "USER"
    assert item["SK"] == item["employeeId"]
    stored = table.get_item(Key={"PK": "USER", "SK": item["employeeId"]})["Item"]
    assert stored == item


def test_create_called_twice_generates_different_ids(employee_service, employee_data):
    # Arrange
    service, table = employee_service

    # Act
    first = service.create(employee_data)
    second = service.create(employee_data)

    # Assert
    assert first["employeeId"] != second["employeeId"]
    assert table.scan()["Count"] == 2


def test_save_persists_exact_employee_item(employee_service, employee_data):
    # Arrange
    service, table = employee_service
    expected = {
        "PK": "USER",
        "SK": "abc12345",
        "GSI1PK": "USER_BY_DATE",
        "GSI1SK": "2026-01-15",
        "employeeId": "abc12345",
        "name": "Sam Taylor",
        "department": "Engineering",
        "startDate": "2026-01-15",
        "role": "manager",
    }

    # Act
    item = service.save("abc12345", employee_data)

    # Assert
    assert item == expected
    assert table.get_item(Key={"PK": "USER", "SK": "abc12345"})["Item"] == expected


@pytest.mark.parametrize("operation", ["create", "save"])
def test_role_defaults_to_employee_when_omitted(employee_service, employee_data, operation):
    # Arrange
    service, table = employee_service
    employee_data.pop("role")

    # Act
    if operation == "create":
        item = service.create(employee_data)
    else:
        item = service.save("abc12345", employee_data)

    # Assert
    assert item["role"] == "employee"
    stored = table.get_item(Key={"PK": "USER", "SK": item["employeeId"]})["Item"]
    assert stored["role"] == "employee"
