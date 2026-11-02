@echo off
title Go Bo Tu Dong Khoi Dong BinhMinhArt
color 0C

echo ========================================================
echo   GO BO BINH MINH ART KHOI DONG CUNG WINDOWS
echo ========================================================
echo.

schtasks /delete /tn "BinhMinhArt_247_Server" /f >nul 2>nul
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt_AutoStart.vbs" >nul 2>nul
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt.lnk" >nul 2>nul
taskkill /F /IM node.exe >nul 2>nul

echo [THANH CONG] Da go bo toan bo khoi dong tu dong khoi he thong!
echo.
pause
exit /b 0
