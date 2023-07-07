#!/bin/bash

VERSION="$(cat ../packges/cli/package.json | jq -r '.version')"
BUILD_NO="${1:-1}"

echo "VERSION=$VERSION"

docker build . -t axahealth/postie:$VERSION-$BUILD_NO --build-arg "POSTIE_VERSION=$VERSION" --platform=linux/amd64

