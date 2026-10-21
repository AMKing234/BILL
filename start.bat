@echo off
title Billing System - BHAI BHAI COMMUNICATION
echo ============================================
echo   BHAI BHAI COMMUNICATION - Billing System
echo ============================================
echo.
cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    echo This will only happen once.
    echo.
    npm install
    echo.
)

echo Starting server...
echo.
start http://localhost:3000
node backend\server.js
pause
