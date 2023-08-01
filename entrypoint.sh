#!/bin/sh -l

set -e

cd $GITHUB_WORKSPACE/

npm install

node index.js

