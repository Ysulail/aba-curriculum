#!/usr/bin/env bash
set -euo pipefail

LAYER_NAME="${LAYER_NAME:-fastapi}"
PYTHON_VERSION=3.14
PLATFORM=x86_64-manylinux2014

BUILD_DIR="$(mktemp -d)"
ZIP_FILE="$PWD/fastapi-layer.zip"
trap 'rm -rf "$BUILD_DIR"' EXIT

echo "Installing wheels for python${PYTHON_VERSION} on ${PLATFORM}"
uv pip install \
  --target "$BUILD_DIR/python" \
  --python-version "$PYTHON_VERSION" \
  --python-platform "$PLATFORM" \
  --only-binary=:all: \
  fastapi pydantic mangum "aws-lambda-powertools[tracer]"

find "$BUILD_DIR/python" -type d -name __pycache__ -prune -exec rm -rf {} +

rm -f "$ZIP_FILE"
(cd "$BUILD_DIR" && zip -qr "$ZIP_FILE" python)
echo "Built $ZIP_FILE ($(du -h "$ZIP_FILE" | cut -f1))"

LAYER_ARN_PARAM="/hr-leave-portal/fastapi-layer-arn"

LAYER_ARN=$(aws lambda publish-layer-version \
  --layer-name "$LAYER_NAME" \
  --description "fastapi, pydantic, mangum, powertools for the HR API" \
  --zip-file "fileb://$ZIP_FILE" \
  --compatible-runtimes "python${PYTHON_VERSION}" \
  --compatible-architectures x86_64 \
  --query LayerVersionArn \
  --output text)

echo "Published $LAYER_ARN"

# Store the ARN in SSM so the CDK stack can read it, no copy-paste.
aws ssm put-parameter \
  --name "$LAYER_ARN_PARAM" \
  --type String \
  --overwrite \
  --value "$LAYER_ARN"

echo "Wrote ARN to SSM parameter $LAYER_ARN_PARAM"