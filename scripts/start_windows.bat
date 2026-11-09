@echo off
title BinhMinhArt Gallery Server
color 0A

cd /d "%~dp0"
if not exist "package.json" cd /d "%~dp0.."

set "IS_BG=0"
if "%~1"=="--background" set "IS_BG=1"
if "%~1"=="/background" set "IS_BG=1"
if "%~1"=="-b" set "IS_BG=1"

REM Kiem tra xem Server co dang chay san tren cong 5001 khong
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 5001); Write-Output 'ALIVE'; $c.Close() } catch { Write-Output 'DEAD' }" > "%TEMP%\bm_check_port.tmp" 2>nul
set /p PORT_STATE=<"%TEMP%\bm_check_port.tmp"
del /f /q "%TEMP%\bm_check_port.tmp" >nul 2>nul

if "%PORT_STATE%"=="ALIVE" (
    if "%IS_BG%"=="1" (
        if not exist "logs" mkdir "logs"
        echo [%date% %time%] Server BinhMinhArt da dang chay san tren cong 5001. Khong can chay them. >> logs\server.log
        exit /b 0
    )
    echo ========================================================
    echo   [THONG BAO] SERVER BINH MINH ART DA DANG CHAY SAN!
    echo ========================================================
    echo.
    echo Server dang hoat dong ngam 24/7 tai:
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169\.' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|VMware|VirtualBox' } | Select-Object -ExpandProperty IPAddress -First 1); if (-not $ip) { $ip = 'localhost' }; Write-Output $ip" > "%TEMP%\bm_wifi_ip.tmp" 2>nul
    set /p WIFI_IP=<"%TEMP%\bm_wifi_ip.tmp"
    del /f /q "%TEMP%\bm_wifi_ip.tmp" >nul 2>nul
    echo   👉 https://%WIFI_IP%:5001  (IP Wi-Fi mang noi bo cho iPad / iPhone / May khac)
    echo   👉 https://localhost:5001  (Truy cap cuc bo tai may HP)
    echo.
    echo Ban khong can chay lai trong cua so nay nua.
    echo ========================================================
    echo.
    pause
    exit /b 0
)

where node >nul 2>nul
if %errorlevel% equ 0 goto :NODE_OK
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files\Git\cmd" set "PATH=C:\Program Files\Git\cmd;C:\Program Files\Git\usr\bin;%PATH%"
if exist "C:\Program Files (x86)\Git\cmd" set "PATH=C:\Program Files (x86)\Git\cmd;C:\Program Files (x86)\Git\usr\bin;%PATH%"
if exist "%LOCALAPPDATA%\Programs\Git\cmd" set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%LOCALAPPDATA%\Programs\Git\usr\bin;%PATH%"
where node >nul 2>nul
if %errorlevel% equ 0 goto :NODE_OK
if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
where node >nul 2>nul
if %errorlevel% equ 0 goto :NODE_OK

if "%IS_BG%"=="1" (
    if not exist "logs" mkdir "logs"
    echo [%date% %time%] [LOI] Khong tim thay Node.js tren he thong HP >> logs\server.log
    exit /b 1
)

echo ========================================================
echo       BINH MINH ART - KHO LUU TRU TRANH NGHE THUAT
echo ========================================================
echo.
echo [LOI] May HP chua cai dat Node.js hoac can khoi dong lai!
echo Vui long truy cap https://nodejs.org de tai ban LTS va cai dat.
echo.
pause
exit /b 1

:NODE_OK
set "NODE_BIN=node"
if exist "C:\Program Files\nodejs\node.exe" set "NODE_BIN=C:\Program Files\nodejs\node.exe"
if exist "C:\Program Files (x86)\nodejs\node.exe" set "NODE_BIN=C:\Program Files (x86)\nodejs\node.exe"
if "%IS_BG%"=="1" goto :FAST_BG_START

echo ========================================================
echo       BINH MINH ART - KHO LUU TRU TRANH NGHE THUAT
echo ========================================================
echo.

echo [1/3] Kiem tra thu vien he thong...
if exist "node_modules\" goto :SKIP_NPM_INSTALL
echo Dang cai dat thu vien (npm install)... Vui long cho trong giay lat...
call npm install
if %errorlevel% neq 0 goto :NPM_ERR
echo.

:SKIP_NPM_INSTALL
echo [2/3] Kiem tra giao dien web...
if exist "dist\" goto :SKIP_BUILD
echo Dang bien dich giao dien (npm run build)...
call npm run build
if %errorlevel% neq 0 goto :BUILD_ERR
echo.

:SKIP_BUILD
if not exist "uploads\word_media" mkdir "uploads\word_media"
if not exist "uploads\folder_images" mkdir "uploads\folder_images"
if not exist "thumbnails" mkdir "thumbnails"
if not exist "data" mkdir "data"
if not exist "TRANH" mkdir "TRANH"
if not exist "DA BAN" mkdir "DA BAN"
if not exist "logs" mkdir "logs"

netsh advfirewall firewall add rule name="BinhMinhArt Server (Port 5001)" dir=in action=allow protocol=TCP localport=5001 profile=any >nul 2>nul
echo [3/3] Dang khoi dong BinhMinhArt Server tren cong 5001 (HTTPS)...
echo.
echo ========================================================
echo  May chu dang hoat dong tai:
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169\.' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|VMware|VirtualBox' } | Select-Object -ExpandProperty IPAddress -First 1); if (-not $ip) { $ip = 'localhost' }; Write-Output $ip" > "%TEMP%\bm_wifi_ip.tmp" 2>nul
set /p WIFI_IP=<"%TEMP%\bm_wifi_ip.tmp"
del /f /q "%TEMP%\bm_wifi_ip.tmp" >nul 2>nul
echo    - IP Wi-Fi mang noi bo: https://%WIFI_IP%:5001
echo    - May HP (cuc bo): https://localhost:5001
echo    - Dien thoai / iPad truy cap qua mot trong cac dia chi duoi:
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169\.' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|VMware|VirtualBox' } | ForEach-Object { Write-Output ('      >> https://' + $_.IPAddress + ':5001') }"
echo ========================================================
echo.

"%NODE_BIN%" server/index.js
echo.
echo Server da dung.
pause
exit /b 0

:FAST_BG_START
REM Che do chay ngam: dam bao dist va node_modules ton tai
if not exist "node_modules\" call npm install
if not exist "dist\" call npm run build
if not exist "uploads\word_media" mkdir "uploads\word_media"
if not exist "uploads\folder_images" mkdir "uploads\folder_images"
if not exist "thumbnails" mkdir "thumbnails"
if not exist "data" mkdir "data"
if not exist "TRANH" mkdir "TRANH"
if not exist "DA BAN" mkdir "DA BAN"
if not exist "logs" mkdir "logs"

echo [%date% %time%] Khoi dong BinhMinhArt Server ngam tren cong 5001 >> logs\server.log
"%NODE_BIN%" server/index.js >> logs\server.log 2>&1
exit /b 0

:NPM_ERR
echo.
echo [LOI] Qua trinh cai dat thu vien (npm install) gap loi!
pause
exit /b 1

:BUILD_ERR
echo.
echo [LOI] Qua trinh bien dich giao dien (npm run build) gap loi!
pause
exit /b 1
