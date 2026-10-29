from aws_cdk import (
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_apigateway as apigw,
    aws_dynamodb as dynamodb,
    aws_lambda as lambda_,
    aws_ssm as ssm)
from constructs import Construct

# The build script publishes the layer's Version ARN to this SSM parameter.
LAYER_ARN_PARAM = "/hr-leave-portal/fastapi-layer-arn"


class BackendStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        table = dynamodb.Table(
            self,
            "HrTable",
            partition_key=dynamodb.Attribute(
                name="PK", type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY)

        # Read the ARN the build script stored, resolved at synth time.
        fastapi_layer_arn = ssm.StringParameter.value_for_string_parameter(self, LAYER_ARN_PARAM)

        fastapi_layer = lambda_.LayerVersion.from_layer_version_arn(
            self,
            "FastApiLayer",
            layer_version_arn=fastapi_layer_arn)

        api_function = lambda_.Function(
            self,
            "ApiFunction",
            runtime=lambda_.Runtime.PYTHON_3_14,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("api", exclude=["__pycache__", "*.pyc"]),
            layers=[fastapi_layer],
            timeout=Duration.seconds(10),
            memory_size=512,
            environment={"TABLE_NAME": table.table_name})

        table.grant_read_write_data(api_function)

        api = apigw.LambdaRestApi(self, "HrApi", handler=api_function)

        CfnOutput(self, "ApiUrl", value=api.url)
        CfnOutput(self, "TableName", value=table.table_name)