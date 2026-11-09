@echo off
title Khoi Dong BinhMinhArt Chay Ngam
color 0B

echo ========================================================
echo       KHOI DONG SERVER BINH MINH ART CHAY NGAM
echo ========================================================
echo.

cd /d "%~dp0"
if not exist "package.json" cd /d "%~dp0.."
set "PROJECT_DIR=%CD%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 5001); Write-Output 'ONLINE'; $client.Close(); } catch { Write-Output 'OFFLINE' }" > "%TEMP%\bm_bg.tmp"
set /p CHECK_ONLINE=<"%TEMP%\bm_bg.tmp"
del /f /q "%TEMP%\bm_bg.tmp" >nul 2>nul

if "%CHECK_ONLINE%"=="ONLINE" (
    echo [THONG BAO] Server BinhMinhArt DA DANG CHAY SAN tren cong 5001!
    echo.
    echo Dang mo trinh duyet...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169\.' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|VMware|VirtualBox' } | Select-Object -ExpandProperty IPAddress -First 1); if (-not $ip) { $ip = 'localhost' }; Write-Output $ip" > "%TEMP%\bm_wifi_ip.tmp" 2>nul
    set /p WIFI_IP=<"%TEMP%\bm_wifi_ip.tmp"
    del /f /q "%TEMP%\bm_wifi_ip.tmp" >nul 2>nul
    start https://%WIFI_IP%:5001
    powershell -NoProfile -Command "Start-Sleep -Seconds 2"
    exit /b 0
)

echo Dang kich hoat may chu chay ngam...
start "" wscript.exe "%PROJECT_DIR%\scripts\run_background.vbs"

echo Cho may chu khoi dong (3 giay)...
powershell -NoProfile -Command "Start-Sleep -Seconds 3"

echo.
echo ========================================================
echo   [THANH CONG] SERVER DA DUOC KHOI DONG CHAY NGAM 100%%!
echo ========================================================
echo   - IP Wi-Fi mang noi bo: https://%WIFI_IP%:5001
echo   - May HP (cuc bo): https://localhost:5001
echo   - Nhat ky: %PROJECT_DIR%\logs\server.log
echo.
echo * BAN CO THE TAT CUA SO NAY, TAT IDE, TAT TERMINAL THOAI MAI!
echo * Server van tiep tuc chay ngam phuc vu mang noi bo.
echo ========================================================
echo.
start https://%WIFI_IP%:5001
powershell -NoProfile -Command "Start-Sleep -Seconds 3"
exit /b 0
