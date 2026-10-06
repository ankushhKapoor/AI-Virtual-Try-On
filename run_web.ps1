# ============================================================
# AI Virtual Try-On - Web Runner (Website + Frontend + Dashboard)
# Runs natively on Windows without WSL and without heavy AI model.
# Usage: .\run_web.ps1
# ============================================================

$root = $PSScriptRoot
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  AI Virtual Try-On -- Launching Website (No AI Model Mode) " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Backend API:  http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "  Frontend UI:  http://localhost:5173" -ForegroundColor Green
Write-Host ""

# 1. Start Backend API in a new terminal window
if (Test-Path "$root\venv\Scripts\python.exe") {
    Start-Process "powershell" -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle = 'Backend API (Port 8000)'; cd '$root'; .\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
} else {
    Start-Process "powershell" -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle = 'Backend API (Port 8000)'; cd '$root'; uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
}

# 2. Start Frontend dev server in a new terminal window
Start-Process "powershell" -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle = 'Frontend UI (Port 5173)'; cd '$root\frontend'; npm run dev"

# 3. Wait a moment and launch browser
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host "Both services launched in separate windows!" -ForegroundColor Yellow
Write-Host "Close the terminal windows or press Ctrl+C in them to stop." -ForegroundColor Gray
Write-Host ""
