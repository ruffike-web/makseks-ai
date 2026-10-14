@echo off
setlocal
cd /d "%~dp0"
set NEXT_TELEMETRY_DISABLED=1
where node >nul 2>nul
if errorlevel 1 (
  echo Palun paigalda Node.js 22.12 voi uuem.
  pause
  exit /b 1
)
if not exist .env copy .env.example .env >nul
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 goto failed
)
call npm.cmd run setup
if errorlevel 1 goto failed
echo Ava brauseris http://127.0.0.1:3000
echo Sulgemiseks vajuta Ctrl+C.
call npm.cmd run dev
exit /b
:failed
echo Kaivitamine ebaonnestus. Vaata eespool olevat veateadet.
pause
exit /b 1
