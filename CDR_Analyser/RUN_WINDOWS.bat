@echo off
title CDR Analysis Tool
color 0A

REM Always run from the folder this .bat file is in
cd /d "%~dp0"

echo.
echo  ============================================
echo    CDR Analysis Tool  -  One Click Runner
echo  ============================================
echo.
echo  Working folder: %cd%
echo.

python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Python is NOT installed.
    echo  Go to https://www.python.org/downloads/
    echo  Check "Add Python to PATH" during install.
    echo.
    pause & exit /b 1
)
echo  [OK] Python found.

echo.
echo  Checking required packages...
python -m pip install pandas openpyxl scikit-learn reportlab joblib numpy --quiet 2>nul
echo  [OK] Packages ready.

IF NOT EXIST "main.py" (
    echo.
    echo  [ERROR] main.py not found in %cd%
    echo  Make sure this .bat file is in the same folder as main.py
    echo.
    pause & exit /b 1
)

IF NOT EXIST "input"  mkdir input
IF NOT EXIST "output" mkdir output
IF NOT EXIST "models" mkdir models

echo.
echo  Running CDR Analysis...
echo  (Put your CDR file in the INPUT folder)
echo.
python main.py

IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] Check the message above.
    echo  - CDR file must be in the INPUT folder
    echo  - File must be .xlsx .xls or .csv
    echo.
    pause & exit /b 1
)

echo.
echo  ============================================
echo   DONE! PDF report is in the OUTPUT folder.
echo  ============================================
echo.
explorer output
pause
