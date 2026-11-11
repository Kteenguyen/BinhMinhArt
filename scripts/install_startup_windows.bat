@echo off
title Cai Dat BinhMinhArt Chay Ngam 24/7 (Tu Dong Khi Bat May)
color 0B

echo ========================================================================
echo       CAI DAT BINH MINH ART TU DONG KHOI DONG CUNG WINDOWS 24/7
echo ========================================================================
echo.

cd /d "%~dp0"
if not exist "package.json" cd /d "%~dp0.."
set "PROJECT_DIR=%CD%"

echo [1/4] Dang dung cac tien trinh cu de lam sach...
schtasks /delete /tn "BinhMinhArt" /f >nul 2>nul
schtasks /delete /tn "BinhMinhArt_247_Server" /f >nul 2>nul
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt.lnk" >nul 2>nul
del /f /q "%ProgramData%\Microsoft\Windows\Start Menu\Programs\Startup\BinhMinhArt.lnk" >nul 2>nul
taskkill /F /IM wscript.exe >nul 2>nul
taskkill /F /IM node.exe >nul 2>nul

echo.
echo [2/4] Cau hinh Windows khong ngu (Standby: Never) va mo Tuong lua 5001...
powercfg /change standby-timeout-ac 0 >nul 2>nul
powercfg /change hibernate-timeout-ac 0 >nul 2>nul
powercfg /change disk-timeout-ac 0 >nul 2>nul
powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP AWAYMODE 1 >nul 2>nul
powercfg /setactive SCHEME_CURRENT >nul 2>nul
netsh advfirewall firewall delete rule name="BinhMinhArt Server (Port 5001)" >nul 2>nul
netsh advfirewall firewall add rule name="BinhMinhArt Server (Port 5001)" dir=in action=allow protocol=TCP localport=5001 profile=any >nul 2>nul

echo.
echo [3/4] Dang dang ky Tu Dong Chay Ngam 24/7 vao Task Scheduler & Startup...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$vbs = Join-Path $env:PROJECT_DIR 'scripts\run_background.vbs'; " ^
  "$startupDir = [Environment]::GetFolderPath('Startup'); " ^
  "$s = $ws.CreateShortcut((Join-Path $startupDir 'BinhMinhArt.lnk')); " ^
  "$s.TargetPath = 'wscript.exe'; " ^
  "$s.Arguments = '\"' + $vbs + '\"'; " ^
  "$s.WorkingDirectory = $env:PROJECT_DIR; " ^
  "$s.WindowStyle = 7; " ^
  "$s.Description = 'BinhMinhArt 24/7 Background Server'; " ^
  "$s.Save(); " ^
  "$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('\"' + $vbs + '\"') -WorkingDirectory $env:PROJECT_DIR; " ^
  "$trigger1 = New-ScheduledTaskTrigger -AtLogon; " ^
  "$trigger2 = New-ScheduledTaskTrigger -AtStartup; " ^
  "$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew; " ^
  "try { Register-ScheduledTask -TaskName 'BinhMinhArt_Auto' -Action $action -Trigger @($trigger1, $trigger2) -Settings $settings -Description 'BinhMinhArt 24/7' -Force -ErrorAction SilentlyContinue | Out-Null } catch {}"

echo.
echo [4/4] Dang khoi dong Server ngam ngay lap tuc...
start "" wscript.exe "%PROJECT_DIR%\scripts\run_background.vbs"

echo Cho may chu san sang trong giay lat...
powershell -NoProfile -Command "Start-Sleep -Seconds 3"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -notmatch '^169\.' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|VMware|VirtualBox' } | Select-Object -ExpandProperty IPAddress -First 1); if (-not $ip) { $ip = 'localhost' }; Write-Output $ip" > "%TEMP%\bm_wifi_ip.tmp" 2>nul
set /p WIFI_IP=<"%TEMP%\bm_wifi_ip.tmp"
del /f /q "%TEMP%\bm_wifi_ip.tmp" >nul 2>nul

echo.
echo ========================================================================
echo   [HOAN TAT CAI DAT 100% - HE THONG CHAY NGAM YEN TINH 24/7]
echo ========================================================================
echo Tu bay gio:
echo   1. KHI BAT NGUON THUNG MAY HP:
echo      Server se TU DONG CHAY NGAM, khong can mo CMD, khong can dang nhap lai.
echo   2. TAT MAN HINH THOAI MAI:
echo      Thung may va mang LAN van luon luon hoat dong 24/7.
echo   3. DIA CHI TRUY CAP:
echo      - IP Wi-Fi mang noi bo: https://%WIFI_IP%:5001
echo      - May HP (cuc bo):      https://localhost:5001
echo ========================================================================
echo.
start https://%WIFI_IP%:5001
pause
exit /b 0
