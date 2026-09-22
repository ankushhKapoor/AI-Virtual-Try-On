# ============================================================
# AI Virtual Try-On -- Start Script (PowerShell)
# Runs all services inside WSL.
# Usage: .\start.ps1
# ============================================================

param(
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

$wslDistro = ""  # leave empty to use default WSL distro

function Invoke-Wsl {
    param([string]$Command)
    if ($wslDistro) {
        wsl -d $wslDistro bash -lc $Command
    } else {
        wsl bash -lc $Command
    }
}

Write-Host ""
Write-Host "AI Virtual Try-On -- Starting all services via WSL" -ForegroundColor Cyan
Write-Host ""

# Resolve the project path inside WSL
$winPath = $PSScriptRoot
$wslPath = (wsl wslpath -u ($winPath -replace '\', '/')).Trim()
Write-Host "Project root (WSL): $wslPath" -ForegroundColor Gray

# Run the bash start script inside WSL
Write-Host "Launching start.sh inside WSL..." -ForegroundColor Yellow
wsl bash -c "cd '$wslPath' && bash start.sh"
