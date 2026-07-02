#!/bin/bash
# Double-click this file to start Virtual Bingo (macOS/Linux).
# If macOS blocks it: right-click the file > Open, then confirm "Open".

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "======================================================"
  echo " Node.js is not installed."
  echo " Please install it once from https://nodejs.org (LTS version),"
  echo " then double-click this file again."
  echo "======================================================"
  read -p "Press Enter to close this window..."
  exit 1
fi

echo "Starting Virtual Bingo..."
echo "Keep this window open while you play. Close it to stop the game."
echo ""
node server.js

read -p "Press Enter to close this window..."
