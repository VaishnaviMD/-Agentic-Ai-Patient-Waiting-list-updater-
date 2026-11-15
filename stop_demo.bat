@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   Stopping CareFlow AI Platform Services...
echo ========================================================
echo.

docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker is already stopped.
    pause
    exit /b 0
)

docker compose down

echo.
echo All containers have stopped cleanly.
echo All your workflows, credentials, and databases are safely preserved.
echo.
pause
