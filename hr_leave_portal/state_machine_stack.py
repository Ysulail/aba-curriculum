import json

from aws_cdk import (
    CfnOutput,
    Stack,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_sns as sns,
    aws_stepfunctions as sfn)
from constructs import Construct

STATE_MACHINE_DEFINITION_FILE = "state_machines/hr_state_machine_definition.json"


class StateMachineStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        hr_email_topic: sns.Topic,
        api_function: lambda_.Function,
        **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        with open(STATE_MACHINE_DEFINITION_FILE) as definition_file:
            state_machine_definition = json.load(definition_file)

        state_machine_definition["States"]["SNS Publish"]["Arguments"][
            "TopicArn"
        ] = hr_email_topic.topic_arn

        state_machine_role = iam.Role(
            self,
            "HrStateMachineRole",
            assumed_by=iam.ServicePrincipal("states.amazonaws.com"))

        state_machine_role.add_to_policy(
            iam.PolicyStatement(actions=["bedrock:InvokeModel"], resources=["*"])
        )

        hr_email_topic.grant_publish(state_machine_role)

        state_machine_role.add_to_policy(
            iam.PolicyStatement(actions=["cloudwatch:PutMetricData"], resources=["*"])
        )

        hr_state_machine = sfn.CfnStateMachine(
            self,
            "HrStateMachine",
            role_arn=state_machine_role.role_arn,
            definition_string=json.dumps(state_machine_definition))

        api_function.add_environment(
            "HR_STATE_MACHINE_ARN", hr_state_machine.attr_arn)

        api_function.add_to_role_policy(
            iam.PolicyStatement(
                actions=["states:StartExecution"],
                resources=[hr_state_machine.attr_arn])
        )

        CfnOutput(self, "HrStateMachineArn", value=hr_state_machine.attr_arn)