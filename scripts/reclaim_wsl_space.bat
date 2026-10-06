@echo off
setlocal enabledelayedexpansion
title WSL Disk Space Reclaimer

echo ============================================================
echo   Reclaiming Disk Space from WSL Virtual Disk (ext4.vhdx)
echo ============================================================
echo.

:: Check for Administrator elevation
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Administrator privileges required to compact virtual disk.
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

set "VHDX_PATH=C:\Users\shlok\AppData\Local\wsl\{4fc14008-a5d0-4b80-8fb7-d4973c9a718a}\ext4.vhdx"

if not exist "%VHDX_PATH%" (
    echo [ERROR] VHDX file not found at:
    echo %VHDX_PATH%
    pause
    exit /b 1
)

echo [1/3] Shutting down WSL...
wsl.exe --shutdown
timeout /t 3 /nobreak >nul

echo [2/3] Preparing disk compaction...
set "DP_SCRIPT=%TEMP%\compact_wsl_%RANDOM%.txt"
(
    echo select vdisk file="%VHDX_PATH%"
    echo attach vdisk readonly
    echo compact vdisk
    echo detach vdisk
) > "%DP_SCRIPT%"

echo [3/3] Compacting virtual disk (reclaiming free space to Windows)...
diskpart /s "%DP_SCRIPT%"
del "%DP_SCRIPT%" 2>nul

echo.
echo ============================================================
echo   Compaction Complete!
echo ============================================================
echo.
powershell -Command "Get-PSDrive C | Select-Object @{Name='Drive';Expression={'C:'}}, @{Name='FreeSpaceGB';Expression={[math]::Round($_.Free / 1GB, 2)}}"
echo.
pause
