@echo off
title AI Virtual Try-On Launcher
echo ============================================================
echo   AI Virtual Try-On -- Launching Website (No AI Model Mode)
echo ============================================================
echo.
echo Starting Backend API on http://127.0.0.1:8000 ...
start "Backend API (Port 8000)" cmd /k "cd /d %~dp0 && venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Frontend on http://localhost:5173 ...
start "Frontend UI (Port 5173)" cmd /k "cd /d %~dp0frontend\frontend && npm run dev"

timeout /t 3 /nobreak >nul
echo.
echo Opening http://localhost:5173 in browser...
start http://localhost:5173
echo.
echo Both services are now running. Close their windows to stop them.
