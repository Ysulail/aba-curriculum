from pathlib import Path

from aws_cdk import (
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3 as s3,
    aws_s3_deployment as deployment,
)
from constructs import Construct


class UiStack(Stack):
    """Static HR portal hosting; public configuration resolves at deployment."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        user_pool_id: str,
        user_pool_client_id: str,
        api_url: str,
        agent_runtime_arn: str,
        assets_path: str = "ui/dist",
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)
        assets = Path(assets_path)
        if not (assets / "index.html").is_file():
            raise ValueError("UI assets missing. Run npm run build from ui/ before CDK synthesis.")
        for name, value in {
            "user_pool_id": user_pool_id,
            "user_pool_client_id": user_pool_client_id,
            "api_url": api_url,
            "agent_runtime_arn": agent_runtime_arn,
        }.items():
            if not value:
                raise ValueError(f"Missing UI configuration: {name}")

        self.bucket = s3.Bucket(
            self,
            "UiAssets",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            removal_policy=RemovalPolicy.RETAIN,
        )
        origin = origins.S3BucketOrigin.with_origin_access_control(self.bucket)
        self.distribution = cloudfront.Distribution(
            self,
            "UiDistribution",
            default_root_object="index.html",
            minimum_protocol_version=cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            default_behavior=cloudfront.BehaviorOptions(
                origin=origin,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                response_headers_policy=cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
            ),
            additional_behaviors={
                "assets/*": cloudfront.BehaviorOptions(
                    origin=origin,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    response_headers_policy=cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
                )
            },
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=status,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                )
                for status in (403, 404)
            ],
        )
        # Neither deployment may remove the other's files; old hashed assets also
        # remain available to browsers holding an earlier index during rollout.
        asset_deployment = deployment.BucketDeployment(
            self,
            "DeployUiAssets",
            sources=[deployment.Source.asset(str(assets), exclude=["runtime-config.json"])],
            destination_bucket=self.bucket,
            prune=False,
            retain_on_delete=True,
            cache_control=[deployment.CacheControl.no_cache()],
            distribution=self.distribution,
            distribution_paths=["/*"],
        )
        runtime_config = deployment.BucketDeployment(
            self,
            "DeployRuntimeConfig",
            sources=[
                deployment.Source.json_data(
                    "runtime-config.json",
                    {
                        "region": self.region,
                        "userPoolId": user_pool_id,
                        "userPoolClientId": user_pool_client_id,
                        "apiUrl": api_url,
                        "agentRuntimeArn": agent_runtime_arn,
                    },
                )
            ],
            destination_bucket=self.bucket,
            prune=False,
            retain_on_delete=True,
            cache_control=[deployment.CacheControl.no_store()],
            distribution=self.distribution,
            distribution_paths=["/runtime-config.json", "/index.html"],
        )
        runtime_config.node.add_dependency(asset_deployment)
        CfnOutput(self, "UiUrl", value=f"https://{self.distribution.distribution_domain_name}")
        CfnOutput(self, "DistributionId", value=self.distribution.distribution_id)
        CfnOutput(self, "AssetsBucketName", value=self.bucket.bucket_name)
