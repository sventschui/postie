#!/bin/bash

VERSION="$(cat ../cli/package.json | jq -r '.version')"
BUILD_NO="${1:-1}"

echo "VERSION=$VERSION"

docker build . -t postiee/postie:$VERSION-$BUILD_NO --build-arg "POSTIE_VERSION=$VERSION" 

