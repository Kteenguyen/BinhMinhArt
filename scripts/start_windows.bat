@echo off
title BinhMinhArt Gallery Server
color 0A

echo ========================================================
echo       BINH MINH ART - KHO LUU TRU TRANH NGHE THUAT
echo ========================================================
echo.

cd /d "%~dp0"
if not exist "package.json" cd /d "%~dp0.."

where node >nul 2>nul
if %errorlevel% equ 0 goto :NODE_OK
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
where node >nul 2>nul
if %errorlevel% equ 0 goto :NODE_OK
if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
where node >nul 2>nul
if %errorlevel% equ 0 goto :NODE_OK

echo [LOI] May HP chua cai dat Node.js hoac can khoi dong lai!
echo Vui long truy cap https://nodejs.org de tai ban LTS va cai dat.
echo Neu ban vua cai xong, hay tat va bat lai Antigravity IDE.
echo.
pause
exit /b 1

:NODE_OK
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

echo [3/3] Dang khoi dong BinhMinhArt Server tren cong 5001 (HTTPS)...
echo.
echo ========================================================
echo  May chu dang hoat dong tai:
echo    - May HP: https://localhost:5001
echo    - Dien thoai / iPad: https://[IP_MAY_HP]:5001
echo ========================================================
echo.

node server/index.js
echo.
echo Server da dung.
pause
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
