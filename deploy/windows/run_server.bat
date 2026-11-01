@echo off
REM Binh Minh Art - start the server on Windows.
REM Used by the "BinhMinhArt" Scheduled Task (auto-start at boot) and for manual start.
REM   run_server.bat            -> run in background style, output goes to logs\server.log
REM   run_server.bat console    -> run with output visible in this window (debugging)
REM NOTE: keep this file ASCII-only (cmd.exe reads it with the OEM code page).

cd /d "%~dp0..\.."
if not exist logs mkdir logs

if /i "%~1"=="console" (
  node server\index.js
  goto :eof
)

REM Simple log rotation: keep logs\server.log under ~5 MB
if exist "logs\server.log" (
  for %%F in ("logs\server.log") do if %%~zF GTR 5000000 move /y "logs\server.log" "logs\server.old.log" >nul
)

echo [%date% %time%] Starting BinhMinhArt >> logs\server.log
node server\index.js >> logs\server.log 2>&1
