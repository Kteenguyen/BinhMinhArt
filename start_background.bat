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

REM Kiem tra xem server da chay chua qua cong 5001
netstat -ano | findstr :5001 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [THONG BAO] Server BinhMinhArt DA DANG CHAY NGAM tren cong 5001 roi!
    echo.
    echo Dang mo trinh duyet...
    start https://localhost:5001
    timeout /t 3 >nul
    exit /b 0
)

echo Dang kich hoat may chu chay ngam...
start "" wscript.exe "%PROJECT_DIR%\scripts\run_background.vbs"

echo Cho may chu san sang trong giay lat...
timeout /t 3 /nobreak >nul

netstat -ano | findstr :5001 >nul
if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   [THANH CONG] SERVER DA DUOC KHOI DONG CHAY NGAM 100%%!
    echo ========================================================
    echo   - May HP: https://localhost:5001
    echo   - Log he thong: %PROJECT_DIR%\logs\server.log
    echo.
    echo * BAN CO THE TAT CUA SO NAY, TAT IDE, TAT TERMINAL THOAI MAI!
    echo * Server van tiep tuc chay ngam phuc vu mang noi bo.
    echo ========================================================
    start https://localhost:5001
) else (
    echo.
    echo [THONG BAO] Server dang khoi dong trong nen, mo trinh duyet:
    start https://localhost:5001
)

echo.
timeout /t 3 >nul
exit /b 0
