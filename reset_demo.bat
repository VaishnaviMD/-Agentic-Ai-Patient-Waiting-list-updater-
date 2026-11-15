@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   Resetting CareFlow AI Demo State...
echo ========================================================
echo.

docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running! Please start Docker Desktop first.
    pause
    exit /b 1
)

docker compose exec -T hospital_backend python -c "from app.seed_data import seed_database; seed_database()"

echo.
echo Demo state has been reset:
echo - Alice scheduled with Dr. Sharma (Monday 3:00 PM)
echo - Bob and Charlie waiting on waitlist
echo - Pending offers cleared
echo.
pause
