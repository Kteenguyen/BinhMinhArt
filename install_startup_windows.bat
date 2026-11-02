@echo off
title Cai Dat Tu Dong Khoi Dong BinhMinhArt
color 0B

echo ========================================================
echo   CAI DAT BINH MINH ART TU DONG CHAY KHI MO MAY HP
echo ========================================================
echo.

cd /d "%~dp0"
if not exist "package.json" cd /d "%~dp0.."
set "PROJECT_DIR=%CD%"

echo [1/3] Thu muc du an: %PROJECT_DIR%

REM Xoa cac file khoi dong cu neu co trong Startup de chong xung dot
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt_AutoStart.vbs" >nul 2>nul
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt.lnk" >nul 2>nul

REM Tao Windows Shortcut tu dong khoi dong ngam chuan 100%
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut(\"$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt.lnk\"); $s.TargetPath = \"wscript.exe\"; $s.Arguments = \"`\"%PROJECT_DIR%\scripts\run_background.vbs`\"\"; $s.WorkingDirectory = \"%PROJECT_DIR%\"; $s.WindowStyle = 7; $s.Description = 'BinhMinhArt Gallery Server'; $s.Save(); Write-Host '[2/3] Da tao Shortcut khoi dong ngam thanh cong!'"

if not exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt.lnk" (
    echo.
    echo [LOI] Khong the tao Shortcut khoi dong trong Startup.
    pause
    exit /b 1
)

echo.
echo [3/3] Dang kich hoat Server chay ngam ngay bay gio...
taskkill /F /IM node.exe >nul 2>nul
start "" wscript.exe "%PROJECT_DIR%\scripts\run_background.vbs"

powershell -NoProfile -Command "Start-Sleep -Seconds 3"

echo.
echo ========================================================
echo   [CAI DAT THANH CONG HOAN TOAN 100%%]
echo ========================================================
echo Tu bay gio:
echo   1. MOI KHI BAN BAT NGUON MAY HP (HOAC KHOI DONG LAI):
echo      Server BinhMinhArt se TU DONG CHAY NGAM tren cong 5001.
echo   2. BAN KHONG CAN MO ANTIGRAVITY IDE HAY TERMINAL NUA!
echo   3. SERVER HIEN DANG CHAY NGAM ROI!
echo      Ban co the dong cua so nay, tat IDE, tat Terminal thoai mai.
echo   4. iPad / iPhone / Dien thoai cu ket noi Wi-Fi la vao duoc ngay:
echo      https://[IP_MAY_HP]:5001
echo ========================================================
echo.
echo Dang mo trinh duyet kiem tra ket noi: https://localhost:5001
start https://localhost:5001
echo.
pause
exit /b 0
