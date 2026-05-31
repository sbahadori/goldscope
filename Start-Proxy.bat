@echo off
title GoldScope AI Proxy
color 0B
echo ====================================================
echo   GoldScope AI Proxy Server
echo ====================================================
echo.
echo Starting proxy on http://localhost:3333
echo.
echo Keep this window open while using GoldScope AI.
echo Press Ctrl+C to stop.
echo.
node proxy-server.mjs
pause
