@echo off
title Dung May Chu BinhMinhArt
color 0C

echo ========================================================
echo           DUNG MAY CHU BINH MINH ART
echo ========================================================
echo.

taskkill /F /IM node.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [THANH CONG] Da dung toan bo tien trinh Server BinhMinhArt.
) else (
    echo [THONG BAO] Khong co tien trinh Server nao dang chay.
)

echo.
pause
exit /b 0
