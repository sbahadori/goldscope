@echo off
setlocal EnableExtensions
title GoldScope v2.15 - Market Reaction First
color 0A

set LOG=%~dp0goldscope-v2-run.log

echo ============================================================
echo GoldScope v2.15 - Market Reaction First
echo ============================================================
echo.
echo Log:
echo   %LOG%
echo.

cd /d "%~dp0"

echo ============================================================ > "%LOG%"
echo GoldScope v2 launcher >> "%LOG%"
echo Started at %DATE% %TIME% >> "%LOG%"
echo Folder: %CD% >> "%LOG%"
echo ============================================================ >> "%LOG%"

if not exist package.json (
  echo [ERROR] package.json not found. Run this file inside the project folder.
  echo [ERROR] package.json not found. >> "%LOG%"
  pause
  exit /b 1
)

if not exist src\App.jsx (
  echo [ERROR] src\App.jsx not found.
  echo [ERROR] src\App.jsx not found. >> "%LOG%"
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js LTS first.
  echo [ERROR] Node.js not found. >> "%LOG%"
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found. Reinstall Node.js LTS.
  echo [ERROR] npm not found. >> "%LOG%"
  pause
  exit /b 1
)

echo Node:
node -v
node -v >> "%LOG%" 2>&1

echo npm:
call npm -v
call npm -v >> "%LOG%" 2>&1

if exist node_modules\.vite (
  echo Cleaning Vite cache...
  rmdir /s /q node_modules\.vite >> "%LOG%" 2>&1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    echo [ERROR] npm install failed. >> "%LOG%"
    pause
    exit /b 1
  )
) else (
  echo node_modules exists. Skipping install.
)

echo.
echo Updating official macro calendar...
call npm run update:calendar
if errorlevel 1 (
  echo.
  echo [WARNING] Calendar update failed. The app will still start using existing/embedded calendar data.
  echo.
)

echo.
echo Starting GoldScope v2.5 at:
echo   http://localhost:3000/
echo.
echo Keep this window open.
echo Press Ctrl+C to stop.
echo.

start "" "http://localhost:3000/"
call npm run dev

echo.
echo Vite stopped or crashed. Check:
echo   %LOG%
pause
