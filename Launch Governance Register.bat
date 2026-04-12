@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "APP_INDEX=%SCRIPT_DIR%app\dist\index.html"
if not exist "%APP_INDEX%" (
  echo Governance Register build not found at app\dist\index.html.
  echo Please download the release bundle or build the app first.
  pause
  exit /b 1
)
start "" "%APP_INDEX%"
