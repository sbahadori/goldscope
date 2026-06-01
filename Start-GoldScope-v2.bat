@echo off
setlocal
title GoldScope v2.34.1 - Safe Report Technical Awareness
cd /d "%~dp0"

echo ====================================================
echo   GoldScope v2.34.1 - Safe Report Technical Awareness
echo ====================================================
echo.
echo One launcher only. No separate AI proxy is required.
echo.
echo Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: Node.js is not available in PATH.
  echo Install Node.js LTS, then close and reopen PowerShell.
  echo.
  pause
  exit /b 1
)

node -v
echo.
echo Checking npm...
where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERROR: npm is not available in PATH.
  echo Reinstall Node.js LTS or repair PATH.
  echo.
  pause
  exit /b 1
)

npm -v
echo.

if not exist package.json (
  echo ERROR: package.json not found.
  echo Make sure you extracted the ZIP into the GoldScope project root.
  echo Current folder:
  cd
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies. This may take a few minutes...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: npm install failed.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Checking Ollama direct endpoint...
curl.exe http://localhost:11434/api/tags >nul 2>nul
if errorlevel 1 (
  echo WARNING: Ollama does not seem reachable at http://localhost:11434/api/tags
  echo GoldScope will still open, but AI Engine will not work until Ollama is running.
  echo.
) else (
  echo Ollama endpoint is reachable.
  echo.
)

echo Starting GoldScope dev server...
echo URL: http://127.0.0.1:5173
echo.
echo The browser will open in 5 seconds.
echo Keep this window open.
echo Press Ctrl+C to stop GoldScope.
echo.

start "" cmd /c "timeout /t 5 /nobreak >nul && start http://127.0.0.1:5173"

call npm run dev -- --host 127.0.0.1 --port 5173

echo.
echo GoldScope server stopped or failed.
echo If there was an error above, copy it and send it.
echo.
pause
