@echo off
title Cai Dat BinhMinhArt Chay Ngam (24/7 Khi Bat Thung May)
color 0B

echo ========================================================================
echo       CAI DAT BINH MINH ART CHAY NGAM (KHONG SPAM, KHONG VONG LAP)
echo ========================================================================
echo.

cd /d "%~dp0"
if not exist "package.json" cd /d "%~dp0.."
set "PROJECT_DIR=%CD%"

echo [1/4] Dang dung toan bo tien trinh va xoa file loi cu...
schtasks /delete /tn "BinhMinhArt_247_Server" /f >nul 2>nul
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt_AutoStart.vbs" >nul 2>nul
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt.lnk" >nul 2>nul
taskkill /F /IM wscript.exe >nul 2>nul
taskkill /F /IM cscript.exe >nul 2>nul
taskkill /F /IM node.exe >nul 2>nul

echo.
echo [2/4] Dang cau hinh Windows Khong Ngu khi cam dien (Standby: Never)...
powercfg /change standby-timeout-ac 0 >nul 2>nul
powercfg /change hibernate-timeout-ac 0 >nul 2>nul
powercfg /change disk-timeout-ac 0 >nul 2>nul
powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP AWAYMODE 1 >nul 2>nul
powercfg /setactive SCHEME_CURRENT >nul 2>nul
echo    -> Da bat che do Server: Tat man hinh thoai mai, thung may van thuc!

echo.
echo [3/4] Dang cai dat vao thu muc Startup de mo may la tu chay...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut(\"$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt.lnk\"); $s.TargetPath = 'wscript.exe'; $s.Arguments = [char]34 + '%PROJECT_DIR%\scripts\run_background.vbs' + [char]34; $s.WorkingDirectory = '%PROJECT_DIR%'; $s.WindowStyle = 7; $s.Description = 'BinhMinhArt Server'; $s.Save();"
echo    -> Da tao Shortcut khoi dong ngam trong Startup thanh cong!

echo.
echo [4/4] Dang khoi dong Server ngam em ai (1 tien trinh duy nhat)...
start "" wscript.exe "%PROJECT_DIR%\scripts\run_background.vbs"

echo Cho may chu san sang (3 giay)...
powershell -NoProfile -Command "Start-Sleep -Seconds 3"

echo.
echo ========================================================================
echo   [HOAN TAT CAI DAT 100% - HE THONG CHAY NGAM YEN TINH 24/7]
echo ========================================================================
echo Tu bay gio:
echo   1. KHI BAT NGUON THUNG MAY HP:
echo      Server se TU DONG CHAY NGAM em ru, khong hien bat cu cua so nao.
echo   2. BAN CO THE TAT MAN HINH THOAI MAI:
echo      Thung may va mang LAN van luon luon hoat dong 24/7.
echo   3. KHONG CON BAT KY VONG LAP HAY SPAM NAO NUA!
echo   4. iPad / iPhone ket noi Wi-Fi la vao duoc ngay:
echo      https://[IP_MAY_HP]:5001
echo ========================================================================
echo.
echo Dang mo trinh duyet kiem tra: https://localhost:5001
start https://localhost:5001
echo.
pause
exit /b 0
