@echo off
title Kiem Tra Trang Thai Server BinhMinhArt
color 0E

echo ========================================================
echo      KIEM TRA TRANG THAI SERVER BINH MINH ART
echo ========================================================
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
    echo [TRANG THAI] SERVER DANG HOAT DONG NGAM TOT (PORT 5001)!
    echo.
    echo 1. Dia chi tren may HP:
    echo    - https://localhost:5001
    echo.
    echo 2. Dia chi tren iPad / iPhone:
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169\.' } | ForEach-Object { Write-Output ('   - https://' + $_.IPAddress + ':5001') }"
    echo.
    echo 3. Nhat ky hoat dong: logs\server.log
) else (
    color 0C
    echo [TRANG THAI] SERVER DANG DUNG (CHUA CHAY).
    echo.
    echo De bat chay ngam ngay, hay nhap dup vao file:
    echo   - start_background.bat
)

echo.
echo ========================================================
pause
exit /b 0
