#!/bin/sh
# Builds the zip to upload to the Chrome Web Store: only the files the extension needs.
set -e
cd "$(dirname "$0")/.."
version=$(node -p 'require("./manifest.json").version')
out="store/cookie-away-$version.zip"
rm -f "$out"
zip -qr "$out" manifest.json background content popup options lib \
  icons/icon16.png icons/icon48.png icons/icon128.png -x '*.DS_Store'
echo "$out"
unzip -l "$out" | tail -1
