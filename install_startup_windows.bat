@echo off
title Cai Dat Tu Dong Khoi Dong Cung Windows
color 0B

echo ========================================================
echo   CAI DAT BINH MINH ART TU DONG CHAY KHI MO MAY HP
echo ========================================================
echo.

if exist "%~dp0package.json" (
    set "PROJECT_ROOT=%~dp0"
) else (
    set "PROJECT_ROOT=%~dp0..\"
)
pushd "%PROJECT_ROOT%"
set "PROJECT_DIR=%CD%"
popd

set "STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt_AutoStart.vbs"

echo Set WshShell = CreateObject("WScript.Shell") > "%STARTUP_VBS%"
if exist "%PROJECT_DIR%\start_windows.bat" (
    echo WshShell.Run Chr(34) ^& "%PROJECT_DIR%\start_windows.bat" ^& Chr(34), 0, False >> "%STARTUP_VBS%"
) else (
    echo WshShell.Run Chr(34) ^& "%PROJECT_DIR%\scripts\start_windows.bat" ^& Chr(34), 0, False >> "%STARTUP_VBS%"
)
echo Set WshShell = Nothing >> "%STARTUP_VBS%"

if %errorlevel% equ 0 (
    echo [THANH CONG] Da dang ky BinhMinhArt tu dong chay ngam khi mo may HP!
    echo Thu muc du an: %PROJECT_DIR%
    echo Tu nay, moi khi bat may HP, server se tu dong chay ngam tren cong 5001.
) else (
    echo [THAT BAI] Khong the ghi vao thu muc Startup cua Windows.
)

echo.
pause
