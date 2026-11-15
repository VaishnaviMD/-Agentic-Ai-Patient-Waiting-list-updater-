@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   CareFlow AI Autonomous Hospital Scheduling Platform
echo ========================================================
echo.

:: 1. Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop, wait for it to be ready, and try again.
    echo.
    pause
    exit /b 1
)

:: 2. Start containers
echo [1/3] Starting Docker containers (FastAPI, PostgreSQL, React, n8n)...
docker compose up -d
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start containers. Check docker-compose.yml
    pause
    exit /b 1
)

:: 3. Wait for services to be ready
echo.
echo [2/3] Waiting for backend and database to initialize...
timeout /t 5 /nobreak >nul

:: 4. Seed demo data
echo.
echo [3/3] Seeding demo database (Alice scheduled, Bob waiting)...
docker compose exec -T hospital_backend python -c "from app.seed_data import seed_database; seed_database()"

echo.
echo ========================================================
echo   CareFlow AI Platform is READY!
echo ========================================================
echo.
echo   * Patient/Admin Portal: http://localhost:5173
echo   * n8n Workflows:        http://localhost:5678
echo   * Backend API Docs:     http://localhost:8000/docs
echo.
echo   Demo Accounts:
echo   - Alice (Cancelling):   alice@example.com   / Password123!
echo   - Bob (Waitlist #1):    bob@example.com     / Password123!
echo   - Admin:                admin@careflow.hospital / Admin123!
echo.
echo   (Keep this window open or press any key to close)
pause
