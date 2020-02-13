#!/bin/bash

VERSION="$(cat ../cli/package.json | jq -r '.version')"

echo "VERSION=$VERSION"

docker build . -t postiee/postie:$VERSION-1 --build-arg "POSTIE_VERSION=$VERSION" 

