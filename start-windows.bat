@echo off
title Virtual Bingo
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ======================================================
  echo  Node.js is not installed.
  echo  Please install it once from https://nodejs.org (LTS version),
  echo  then double-click this file again.
  echo ======================================================
  pause
  exit /b 1
)

echo Starting Virtual Bingo...
echo Keep this window open while you play. Close it to stop the game.
echo.
node server.js

pause
