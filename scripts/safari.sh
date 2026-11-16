#!/bin/sh
# Builds the Safari version: copies the extension files into safari/extension (what the
# Xcode project references), builds the macOS app and installs it to ~/Applications.
# Needs Xcode. Unsigned by default, so Safari needs Developer > "Allow unsigned extensions", which resets on every Safari restart (a development signature does not avoid that).
# To sign with your Apple team instead, put SAFARI_TEAM=<team ID> in safari/local.env
# (git-ignored); the bundle ID must then be free in your team.
set -e
cd "$(dirname "$0")/.."
[ -f safari/local.env ] && . safari/local.env
rsync -a --delete --exclude .DS_Store manifest.json background content popup options lib safari/extension/
mkdir -p safari/extension/icons
cp icons/icon16.png icons/icon48.png icons/icon128.png safari/extension/icons/
version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
if [ -n "$SAFARI_TEAM" ]; then
  sign="DEVELOPMENT_TEAM=$SAFARI_TEAM CODE_SIGN_STYLE=Automatic -allowProvisioningUpdates"
else
  sign="CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM="
fi
xcodebuild -project "safari/Cookie Away/Cookie Away.xcodeproj" -scheme "Cookie Away" \
  -configuration Release -derivedDataPath safari/build -destination 'platform=macOS' \
  MARKETING_VERSION="$version" $sign -quiet build
mkdir -p ~/Applications
rm -rf ~/Applications/"Cookie Away.app"
cp -R "safari/build/Build/Products/Release/Cookie Away.app" ~/Applications/
open ~/Applications/"Cookie Away.app"
echo "Installed ~/Applications/Cookie Away.app ($version)"
