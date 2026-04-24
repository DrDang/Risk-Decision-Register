@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "APP_INDEX=%SCRIPT_DIR%app\dist\index.html"
if not exist "%APP_INDEX%" (
  echo Governance Register build not found at app\dist\index.html.
  echo Run "cd app && npm run build" first or download the latest release bundle.
  pause
  exit /b 1
)
start "" "%APP_INDEX%"
