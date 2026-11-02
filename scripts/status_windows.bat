@echo off
title Kiem Tra Trang Thai Server BinhMinhArt
color 0E

echo ========================================================
echo      KIEM TRA TRANG THAI SERVER BINH MINH ART
echo ========================================================
echo.

cd /d "%~dp0"
if not exist "package.json" cd /d "%~dp0.."

netstat -ano | findstr :5001 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [TRANG THAI] SERVER DANG HOAT DONG NGAM (PORT 5001)!
    echo.
    echo Dia chi truy cap tren may HP:
    echo   - https://localhost:5001
    echo.
    echo Dia chi IP noi bo may HP de iPad / iPhone truy cap:
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
        echo   - https:%%a:5001
    )
    echo.
    echo Nhat ky hoat dong: logs\server.log
) else (
    echo [TRANG THAI] SERVER DANG DUNG (CHUA CHAY).
    echo.
    echo De bat chay ngam ngay, hay nhap dup chuot vao:
    echo   - start_background.bat
)

echo.
echo ========================================================
pause
exit /b 0
