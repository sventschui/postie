#!/bin/bash

VERSION="$(cat ../packages/cli/package.json | jq -r '.version')"
BUILD_NO="${1:-0}"
echo "VERSION=$VERSION"

docker build . -t axahealth/postie:$VERSION-$BUILD_NO --build-arg "POSTIE_VERSION=$VERSION" --push --platform linux/amd64,linux/arm64, linux/arm64/v8

