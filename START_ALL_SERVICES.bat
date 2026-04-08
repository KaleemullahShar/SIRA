@echo off
setlocal

title Start All SIRA Services

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ==================================================
echo   SIRA Full Stack Starter
echo ==================================================
echo.

if not exist "CDR_Analyser\api.py" (
    echo [ERROR] CDR_Analyser\api.py not found.
    exit /b 1
)

if not exist "fyp-sira-frontend\backend\package.json" (
    echo [ERROR] fyp-sira-frontend\backend\package.json not found.
    exit /b 1
)

if not exist "fyp-sira-frontend\package.json" (
    echo [ERROR] fyp-sira-frontend\package.json not found.
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH.
    exit /b 1
)

set "PYTHON_EXE=%ROOT%.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=py"
)

echo [INFO] Workspace: %ROOT%
echo [INFO] Python: %PYTHON_EXE%
echo.

call :check_port 8000
if "%PORT_IN_USE%"=="1" (
    echo [SKIP] Port 8000 already in use. CDR API may already be running.
) else (
    echo [START] CDR API on http://127.0.0.1:8000
    start "CDR API (8000)" powershell -NoExit -Command "Set-Location '%ROOT%CDR_Analyser'; & '%PYTHON_EXE%' -m uvicorn api:app --host 127.0.0.1 --port 8000"
)

call :check_port 5000
if "%PORT_IN_USE%"=="1" (
    echo [SKIP] Port 5000 already in use. Backend API may already be running.
) else (
    echo [START] Backend API on http://127.0.0.1:5000
    start "Backend API (5000)" cmd /k "cd /d ""%ROOT%fyp-sira-frontend\backend"" && npm run dev"
)

call :check_port 5173
if "%PORT_IN_USE%"=="1" (
    echo [SKIP] Port 5173 already in use. Frontend may already be running.
) else (
    echo [START] Frontend on http://localhost:5173
    start "Frontend (5173)" cmd /k "cd /d ""%ROOT%fyp-sira-frontend"" && npx vite --host localhost --port 5173"
)

echo.
echo --------------------------------------------------
echo Services launch requested.
echo - CDR API:   http://127.0.0.1:8000/health
echo - Backend:   http://127.0.0.1:5000/api/health
echo - Frontend:  http://localhost:5173
echo --------------------------------------------------
echo.
exit /b 0

:check_port
set "PORT_IN_USE=0"
for /f "tokens=*" %%A in ('netstat -ano ^| findstr /R /C:":%~1 .*LISTENING"') do (
    set "PORT_IN_USE=1"
    goto :eof
)
goto :eof
