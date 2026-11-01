@echo off
title Cai Dat Tu Dong Khoi Dong Cung Windows
color 0B

echo ========================================================
echo   CAI DAT BINH MINH ART TU DONG CHAY KHI MO MAY HP
echo ========================================================
echo.

cd /d "%~dp0"
if not exist "package.json" cd /d "%~dp0.."
set "PROJECT_DIR=%CD%"

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_VBS=%STARTUP_DIR%\BinhMinhArt_AutoStart.vbs"

echo Set WshShell = CreateObject("WScript.Shell") > "%STARTUP_VBS%"
echo WshShell.Run Chr(34) ^& "%PROJECT_DIR%\start_windows.bat" ^& Chr(34), 0, False >> "%STARTUP_VBS%"
echo Set WshShell = Nothing >> "%STARTUP_VBS%"

if not exist "%STARTUP_VBS%" goto :FAIL

echo [THANH CONG] Da dang ky BinhMinhArt tu dong chay ngam khi mo may HP!
echo Thu muc du an: %PROJECT_DIR%
echo File khoi dong: %STARTUP_VBS%
echo.
echo Tu nay, moi khi bat may HP, server se tu dong chay ngam tren cong 5001.
echo.
pause
exit /b 0

:FAIL
echo.
echo [THAT BAI] Khong the tao file trong thu muc Startup cua Windows.
echo.
pause
exit /b 1
