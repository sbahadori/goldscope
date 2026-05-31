@echo off
setlocal
title Diagnose GoldScope
cd /d "%~dp0"

echo ====================================================
echo   GoldScope Diagnostics
echo ====================================================
echo.
echo Current folder:
cd
echo.

echo Node:
where node
node -v
echo.

echo npm:
where npm
npm -v
echo.

echo package.json:
if exist package.json (echo FOUND) else (echo MISSING)
echo.

echo node_modules:
if exist node_modules (echo FOUND) else (echo MISSING)
echo.

echo Ollama direct:
curl.exe http://localhost:11434/api/tags
echo.

echo.
echo If GoldScope is running, Vite internal proxy test:
curl.exe http://127.0.0.1:5173/api/ollama/api/tags
echo.

pause
