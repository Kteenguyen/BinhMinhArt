@echo off
title Dung Toan Bo Tien Trinh BinhMinhArt
color 0C

echo ========================================================
echo        DUNG TOAN BO TIEN TRINH VA DONG VONG LAP
echo ========================================================
echo.

echo 1. Dang xoa bo tac vu Task Scheduler neu co...
schtasks /delete /tn "BinhMinhArt_247_Server" /f >nul 2>nul

echo 2. Dang xoa file loi trong thu muc Startup neu co...
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt_AutoStart.vbs" >nul 2>nul

echo 3. Dang dung toan bo script chay ngam (wscript va cscript)...
taskkill /F /IM wscript.exe >nul 2>nul
taskkill /F /IM cscript.exe >nul 2>nul

echo 4. Dang dung toan bo server Node.js...
taskkill /F /IM node.exe >nul 2>nul

echo.
echo ========================================================
echo  [THANH CONG] DA TAT SACH 100%% TIEN TRINH VA VONG LAP!
echo ========================================================
echo.
pause
exit /b 0
