@echo off
REM ───────────────────────────────────────────────────────────────────────
REM  CarbonLens: one-click start for Windows.
REM  First run: creates a virtual environment and installs requirements.
REM  Then starts the backend, which also serves the frontend, and opens
REM  the dashboard in your browser.
REM ───────────────────────────────────────────────────────────────────────
setlocal
cd /d "%~dp0"
title CarbonLens

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (where python >nul 2>nul && set "PY=python")
if not defined PY (
  echo.
  echo  Python 3.10 or newer is required. Download it from https://www.python.org/downloads/
  echo  During setup tick "Add python.exe to PATH", then run this file again.
  pause & exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo  Creating virtual environment ...
  %PY% -m venv .venv || (echo  Could not create the virtual environment. & pause & exit /b 1)
)
call ".venv\Scripts\activate.bat"

REM Install requirements on first run, and again whenever they change.
fc /b "backend\requirements.txt" ".venv\.installed" >nul 2>nul
if errorlevel 1 (
  echo  Installing requirements, this takes a minute the first time ...
  python -m pip install --disable-pip-version-check -q --upgrade pip
  python -m pip install --disable-pip-version-check -q -r requirements.txt || (echo  Installing requirements failed. & pause & exit /b 1)
  copy /y "backend\requirements.txt" ".venv\.installed" >nul
)

if not exist "backend\.env" (
  copy /y "backend\.env.example" "backend\.env" >nul
  echo  Created backend\.env from the example. Add your API keys there when ready.
)

set "PORT=8000"
for /f "tokens=1,* delims==" %%a in ('findstr /b /c:"PORT=" "backend\.env"') do set "PORT=%%b"

echo.
echo  Starting CarbonLens on http://localhost:%PORT%  (close this window to stop)
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:%PORT%"
cd backend
python app.py --no-reload
pause
