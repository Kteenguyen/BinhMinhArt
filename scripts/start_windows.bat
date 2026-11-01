@echo off
title BinhMinhArt Gallery Server
color 0A

echo ========================================================
echo       BINH MINH ART - KHO LUU TRU TRANH NGHE THUAT
echo ========================================================
echo.

if exist "%~dp0package.json" (
    cd /d "%~dp0"
) else (
    cd /d "%~dp0.."
)

REM Kiem tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] May HP chua cai dat Node.js!
    echo Vui long truy cap https://nodejs.org de tai va cai dat Node.js LTS.
    echo.
    pause
    exit /b 1
)

REM Kiem tra va cai thu vien neu chua co
if not exist "node_modules\" (
    echo [1/3] Dang cai dat thu vien (npm install)...
    call npm install
    echo.
)

REM Kiem tra va build giao dien neu chua co
if not exist "dist\" (
    echo [2/3] Dang bien dich giao dien (npm run build)...
    call npm run build
    echo.
)

REM Tao cac thu muc luu tru anh tren SSD may HP
if not exist "uploads\word_media\" mkdir "uploads\word_media"
if not exist "uploads\folder_images\" mkdir "uploads\folder_images"
if not exist "thumbnails\" mkdir "thumbnails"
if not exist "data\" mkdir "data"
if not exist "TRANH\" mkdir "TRANH"
if not exist "DA BAN\" mkdir "DA BAN"

echo [3/3] Dang khoi dong BinhMinhArt Server tren cong 5001 (HTTPS)...
echo.
echo ========================================================
echo  May chu dang hoat dong tai:
echo    - May HP: https://localhost:5001
echo    - Dien thoai / iPad: https://[IP_MAY_HP]:5001
echo ========================================================
echo.

node server/index.js
pause
