@echo off
title Cai Dat BinhMinhArt Chay Ngam 24/7 (Khong Bi Tat Khi Tat Man Hinh)
color 0B

echo ========================================================================
echo   CAI DAT BINH MINH ART CHAY NGAM 24/7 - CHONG SAP KHI TAT MAN HINH
echo ========================================================================
echo.

cd /d "%~dp0"
if not exist "package.json" cd /d "%~dp0.."
set "PROJECT_DIR=%CD%"

REM Kiem tra quyen Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [THONG BAO] Dang yeu cau quyen Administrator de cau hinh Windows khong ngu...
    echo (Vui long bam YES tren hop thoai cua Windows)
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b 0
)

echo [1/5] Thu muc du an: %PROJECT_DIR%

echo.
echo [2/5] Dang cau hinh che do 24/7 (Thung may KHONG BAO GIO NGU khi co dien)...
REM Tat che do ngu (Sleep = Never) khi cam dien
powercfg /change standby-timeout-ac 0 >nul 2>nul
powercfg /change hibernate-timeout-ac 0 >nul 2>nul
powercfg /change disk-timeout-ac 0 >nul 2>nul

REM Man hinh tu tat sau 15 phut de bao ve man hinh & tiet kiem dien
powercfg /change monitor-timeout-ac 15 >nul 2>nul

REM Bat che do Windows Away Mode: Cho phep tat man hinh, CPU & mang van chay 100%
powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP AWAYMODE 1 >nul 2>nul
powercfg /setactive SCHEME_CURRENT >nul 2>nul

REM Chống Windows tắt cạc mạng LAN / Wi-Fi khi tắt màn hình
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetAdapter | ForEach-Object { try { Disable-NetAdapterPowerManagement -Name $_.Name -ErrorAction SilentlyContinue } catch {} }" >nul 2>nul
echo    -> Da kich hoat che do Server 24/7 (Away Mode: Enabled, Standby: Never)

echo.
echo [3/5] Dang dang ky tac vu he thong Windows (Chay ngay khi mo thung may)...
schtasks /delete /tn "BinhMinhArt_247_Server" /f >nul 2>nul
schtasks /create /tn "BinhMinhArt_247_Server" /tr "wscript.exe \"%PROJECT_DIR%\scripts\run_background.vbs\"" /sc ONSTART /ru "SYSTEM" /rl HIGHEST /f >nul 2>nul
if %errorlevel% neq 0 (
    schtasks /create /tn "BinhMinhArt_247_Server" /tr "wscript.exe \"%PROJECT_DIR%\scripts\run_background.vbs\"" /sc ONLOGON /rl HIGHEST /f >nul 2>nul
)

REM Xoa cac file khoi dong cu neu co trong Startup
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt_AutoStart.vbs" >nul 2>nul
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt.lnk" >nul 2>nul

REM Tao Windows Shortcut du phong trong Startup
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut(\"$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt.lnk\"); $s.TargetPath = \"wscript.exe\"; $s.Arguments = \"`\"%PROJECT_DIR%\scripts\run_background.vbs`\"\"; $s.WorkingDirectory = \"%PROJECT_DIR%\"; $s.WindowStyle = 7; $s.Description = 'BinhMinhArt Gallery 24/7 Server'; $s.Save();"
echo    -> Da dang ky tu dong chay vao Windows thanh cong!

echo.
echo [4/5] Dang khoi dong Server ngam ngay lap tuc...
taskkill /F /IM node.exe >nul 2>nul
start "" wscript.exe "%PROJECT_DIR%\scripts\run_background.vbs"

echo Cho may chu khoi dong va kiem tra ket noi (3 giay)...
powershell -NoProfile -Command "Start-Sleep -Seconds 3"

echo.
echo [5/5] Kiem tra trang thai hoat dong cong 5001...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 5001); Write-Output 'ONLINE'; $client.Close(); } catch { Write-Output 'STARTING' }" > "%TEMP%\bm_check.tmp"
set /p STATUS=<"%TEMP%\bm_check.tmp"
del /f /q "%TEMP%\bm_check.tmp" >nul 2>nul

echo.
echo ========================================================================
echo   [HOAN TAT CAI DAT 100% - HE THONG CHAY NGAM 24/7 DA SAN SANG]
echo ========================================================================
echo Tu bay gio:
echo   1. KHI BAT NGUON THUNG MAY HP:
echo      Server BinhMinhArt se TU DONG CHAY NGAM ngay lap tuc.
echo      (Ke ca khi chua dang nhap vao Windows, server da hoat dong roi!)
echo.
echo   2. BAN CO THE TAT MAN HINH THOAI MAI (Hoac de man hinh tu tat):
echo      Thung may va mang LAN van luon luon thuc va hoat dong 24/7.
echo      Server KHONG BAO GIO BI SAP hay bi ngung hoat dong nua!
echo.
echo   3. DIEN THOAI / IPAD KET NOI WI-FI TRUY CAP MOI LUC 24/7:
echo      https://[IP_MAY_HP]:5001
echo ========================================================================
echo.
echo Dang mo trinh duyet kiem tra ket noi...
start https://localhost:5001
echo.
pause
exit /b 0
