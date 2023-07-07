#!/bin/bash

VERSION="$(cat ../packages/cli/package.json | jq -r '.version')"
BUILD_NO="${1:-1}"
echo "VERSION=$VERSION"

docker build . -t axahealth/postie:$VERSION-$BUILD_NO --build-arg "POSTIE_VERSION=$VERSION" --push

