@echo off
title AASRA Citizen Safety Mobile App
echo ========================================================
echo        AASRA CITIZEN SAFETY - MOBILE APPLICATION
echo ========================================================
echo.

:: 1. Check if backend is running on port 8000
netstat -ano | findstr :8000 >nul
if %errorlevel% neq 0 (
    echo [1/3] Starting Backend Server (FastAPI on Port 8000)...
    start /B "" "%~dp0backend\.venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] Backend Server is already running.
)

:: 2. Check if frontend is running on port 5173
netstat -ano | findstr :5173 >nul
if %errorlevel% neq 0 (
    echo [2/3] Starting Frontend Server (Vite on Port 5173)...
    start /B "" npm run dev
    timeout /t 3 /nobreak >nul
) else (
    echo [2/3] Frontend Server is already running.
)

:: 3. Launch Mobile Application Window
echo [3/3] Opening AASRA Mobile Application...
echo.
echo Application URL: http://localhost:5173
echo Mobile Phone Network URL: http://192.168.25.26:5173
echo.

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:5173 --window-size=430,900
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5173 --window-size=430,900
) else (
    start http://localhost:5173
)

echo AASRA Mobile App launched successfully!
timeout /t 4 >nul
exit
