import json

import aws_cdk as cdk
import pytest
from aws_cdk.assertions import Template
from aws_cdk import aws_s3_deployment as deployment
from hr_leave_portal.ui_stack import UiStack


def make_stack(tmp_path, **overrides):
    assets = tmp_path / "assets"
    assets.mkdir(exist_ok=True)
    (assets / "index.html").write_text("<html>Portal</html>")
    values = {
        "user_pool_id": "us-east-1_example",
        "user_pool_client_id": "exampleclient",
        "api_url": "https://api.example.com/prod/",
        "agent_runtime_arn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/example",
        "assets_path": str(assets),
        "env": cdk.Environment(account="123456789012", region="us-east-1"),
    }
    values.update(overrides)
    return UiStack(cdk.App(), "UiTest", **values)


def test_fr7_private_https_spa_hosting(tmp_path):
    template = Template.from_stack(make_stack(tmp_path))
    template.has_resource_properties("AWS::S3::Bucket", {
        "PublicAccessBlockConfiguration": {
            "BlockPublicAcls": True, "BlockPublicPolicy": True,
            "IgnorePublicAcls": True, "RestrictPublicBuckets": True,
        }
    })
    template.resource_count_is("AWS::CloudFront::OriginAccessControl", 1)
    distribution = next(iter(template.find_resources("AWS::CloudFront::Distribution").values()))["Properties"]["DistributionConfig"]
    assert distribution["DefaultCacheBehavior"]["ViewerProtocolPolicy"] == "redirect-to-https"
    assert distribution["DefaultRootObject"] == "index.html"
    assert distribution["CustomErrorResponses"] == [
        {"ErrorCachingMinTTL": 0, "ErrorCode": code, "ResponseCode": 200, "ResponsePagePath": "/index.html"}
        for code in (403, 404)
    ]
    assert "UiUrl" in template.to_json()["Outputs"]


def test_fr6_configuration_and_assets_do_not_prune_each_other(tmp_path, monkeypatch):
    captured = {}
    original = deployment.Source.json_data

    def capture_config(key, data, **kwargs):
        captured.update(data)
        return original(key, data, **kwargs)

    monkeypatch.setattr(deployment.Source, "json_data", capture_config)
    stack = make_stack(tmp_path)
    template = Template.from_stack(stack)
    deployments = template.find_resources("Custom::CDKBucketDeployment")
    assert len(deployments) == 2
    assert all(resource["Properties"]["Prune"] is False for resource in deployments.values())
    config_deployment = next(resource for key, resource in deployments.items() if key.startswith("DeployRuntimeConfig"))
    assert config_deployment["Properties"]["SystemMetadata"]["cache-control"] == "no-store"
    assert config_deployment.get("DependsOn")
    serialized = json.dumps(template.to_json())
    assert "runtime-config.json" in serialized
    assert captured["agentRuntimeArn"].endswith("runtime/example")
    assert captured["userPoolClientId"] == "exampleclient"
    assert captured["apiUrl"] == "https://api.example.com/prod/"


def test_missing_build_has_actionable_error(tmp_path):
    with pytest.raises(ValueError, match="npm run build"):
        make_stack(tmp_path, assets_path=str(tmp_path / "missing"))


def test_missing_environment_configuration_is_rejected(tmp_path):
    with pytest.raises(ValueError, match="user_pool_id"):
        make_stack(tmp_path, user_pool_id="")
