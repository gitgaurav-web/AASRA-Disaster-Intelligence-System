@echo off
title AASRA Multi-Hazard Decision Support System Launcher
cls
echo =========================================================================
echo           AASRA - DISASTER INTELLIGENCE & DECISION SUPPORT
echo         Government Command Portal  ^&  Citizen Safety Network
echo =========================================================================
echo.
echo [1/2] Launching FastAPI Backend (Port 8000)...
start "AASRA FastAPI Backend" cmd /k "cd backend && .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

echo [2/2] Launching React / Vite Frontend (Port 5173)...
start "AASRA React Frontend" cmd /k "npm run dev"

echo.
echo -------------------------------------------------------------------------
echo Applications are running in parallel:
echo   - Citizen Public Safety Portal:    http://localhost:5173/
echo   - Official Government Command:     http://localhost:5173/gov
echo   - FastAPI Swagger API Docs:        http://127.0.0.1:8000/docs
echo -------------------------------------------------------------------------
echo.
echo Opening browser in 3 seconds...
timeout /t 3 >nul
start http://localhost:5173
echo Done. Press any key to exit this launcher window.
pause >nul
