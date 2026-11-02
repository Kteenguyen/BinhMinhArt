@echo off
title Go Bo Tu Dong Khoi Dong Cung Windows
color 0C

echo ========================================================
echo   GO BO BINH MINH ART KHOI DONG CUNG WINDOWS
echo ========================================================
echo.

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_VBS=%STARTUP_DIR%\BinhMinhArt_AutoStart.vbs"

if exist "%STARTUP_VBS%" (
    del /f /q "%STARTUP_VBS%"
    echo [THANH CONG] Da xoa file tu dong khoi dong khoi thu muc Startup!
) else (
    echo [THONG BAO] File khoi dong khong ton tai trong Startup.
)

echo.
pause
exit /b 0
