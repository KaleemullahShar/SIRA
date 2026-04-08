@echo off
setlocal
title SIRA - Fix Virtual Environment
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ==================================================
echo   SIRA - Virtual Environment Setup / Fix
echo ==================================================
echo.

REM ── Step 1: Detect Python ─────────────────────────────────────────────────
set "PYTHON_EXE=C:\Users\kalee\AppData\Local\Programs\Python\Python311\python.exe"

if not exist "%PYTHON_EXE%" (
    echo [WARN] Python not found at expected path. Trying system Python...
    where python >nul 2>nul
    if errorlevel 1 (
        echo [ERROR] Python is not installed or not in PATH.
        echo         Install Python from https://python.org
        echo         Make sure to check "Add Python to PATH" during install.
        pause
        exit /b 1
    )
    set "PYTHON_EXE=python"
)

echo [INFO] Using Python: %PYTHON_EXE%
echo.

REM ── Step 2: Delete old broken .venv ───────────────────────────────────────
if exist ".venv" (
    echo [INFO] Removing old virtual environment from friend's machine...
    rmdir /s /q ".venv"
    echo [OK]   Old .venv deleted.
) else (
    echo [INFO] No existing .venv found. Will create fresh one.
)
echo.

REM ── Step 3: Create fresh .venv ────────────────────────────────────────────
echo [INFO] Creating new virtual environment...
"%PYTHON_EXE%" -m venv .venv
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment.
    pause
    exit /b 1
)
echo [OK]   Virtual environment created at .venv\
echo.

REM ── Step 4: Upgrade pip ───────────────────────────────────────────────────
echo [INFO] Upgrading pip...
.venv\Scripts\python.exe -m pip install --upgrade pip --quiet
echo [OK]   pip upgraded.
echo.

REM ── Step 5: Install CDR_Analyser dependencies ─────────────────────────────
if exist "CDR_Analyser\requirements.txt" (
    echo [INFO] Installing CDR_Analyser\requirements.txt ...
    .venv\Scripts\pip.exe install -r "CDR_Analyser\requirements.txt"
    if errorlevel 1 (
        echo [ERROR] Some packages failed to install. Check output above.
        pause
        exit /b 1
    )
    echo [OK]   All packages installed successfully.
) else (
    echo [WARN] No requirements.txt found in CDR_Analyser\.
    echo        Installing common FastAPI + file-processing packages manually...
    .venv\Scripts\pip.exe install fastapi uvicorn python-multipart pandas openpyxl
    echo [OK]   Common packages installed.
)
echo.

REM ── Step 6: Verify setup ──────────────────────────────────────────────────
echo [INFO] Verifying installation...
.venv\Scripts\python.exe --version
.venv\Scripts\python.exe -c "import uvicorn; print('[OK]   uvicorn:', uvicorn.__version__)"
.venv\Scripts\python.exe -c "import fastapi; print('[OK]   fastapi:', fastapi.__version__)"
echo.

echo ==================================================
echo   Setup Complete! 
echo ==================================================
echo.
echo   You can now run: start_all_services.bat
echo.
pause
