@echo off
title Kiem Tra Trang Thai Server BinhMinhArt 24/7
color 0E

echo ========================================================================
echo         KIEM TRA TRANG THAI SERVER BINH MINH ART 24/7
echo ========================================================================
echo.
echo Dang kiem tra ket noi den cong 5001...
echo.

cd /d "%~dp0"
if not exist "package.json" cd /d "%~dp0.."

powershell -NoProfile -ExecutionPolicy Bypass -Command "$client = New-Object System.Net.Sockets.TcpClient; try { $client.Connect('127.0.0.1', 5001); Write-Output 'ONLINE'; $client.Close(); } catch { Write-Output 'OFFLINE' }" > "%TEMP%\bm_status.tmp"

set /p SERVER_STATUS=<"%TEMP%\bm_status.tmp"
del /f /q "%TEMP%\bm_status.tmp" >nul 2>nul

if "%SERVER_STATUS%"=="ONLINE" (
    color 0A
    echo ========================================================================
    echo   [TRANG THAI] SERVER DANG HOAT DONG 24/7 (PORT 5001 - ONLINE)!
    echo ========================================================================
    echo.
    echo 1. Dia chi truy cap tren may HP:
    echo    👉 https://localhost:5001
    echo.
    echo 2. Dia chi truy cap tren iPad / iPhone / Dien thoai khac:
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169\.' } | ForEach-Object { Write-Output ('   👉 https://' + $_.IPAddress + ':5001') }"
    echo.
    echo 3. Tinh trang ngu dong cua Windows (Power Sleep):
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ac = (powercfg /q | Select-String 'Setting Current AC Power Setting Index: (0x[0-9a-fA-F]+)' | Select-Object -First 1).Matches.Groups[1].Value; if ($ac -eq '0x00000000') { Write-Output '   -> Da bat che do KHONG NGU (Sleep: Never). Tat man hinh van chay 24/7!' } else { Write-Output '   -> Chuan bi san sang phuc vu mang noi bo.' }"
    echo.
    echo 4. Nhat ky hoat dong: logs\server.log
) else (
    color 0C
    echo ========================================================================
    echo   [TRANG THAI] SERVER DANG DUNG (OFFLINE).
    echo ========================================================================
    echo.
    echo De bat server chay ngam 24/7 ngay lap tuc, hay nhap dup chuot vao:
    echo   👉 install_startup_windows.bat
    echo   (hoac start_background.bat)
)

echo.
echo ========================================================================
pause
exit /b 0
