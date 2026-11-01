#Requires -RunAsAdministrator
<#
  Binh Minh Art - install / update on this Windows PC.

  HOW TO RUN (once, as Administrator):
    1. Start menu -> type "PowerShell" -> right-click -> Run as administrator
    2. cd to the project folder, then:
         powershell -ExecutionPolicy Bypass -File .\deploy\windows\install.ps1

  Safe to re-run: re-running acts as an UPDATE (stops server, reinstalls deps,
  rebuilds the frontend, starts again). Your data (data\binhminhart.db, TRANH\, uploads\)
  is never touched.

  NOTE: keep this file ASCII-only (Windows PowerShell 5.1 reads BOM-less files as ANSI).
#>
$ErrorActionPreference = 'Stop'

$Port     = 5001
$TaskName = 'BinhMinhArt'
$RuleName = "BinhMinhArt (TCP $Port)"
$Root     = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$RunBat   = Join-Path $PSScriptRoot 'run_server.bat'

Write-Host ''
Write-Host "Project folder: $Root"

# ---- 1. Node.js check --------------------------------------------------------
Write-Host '[1/7] Checking Node.js...'
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  throw 'Node.js not found. Install Node.js LTS (version 22.13 or newer): run "winget install OpenJS.NodeJS.LTS" or download from https://nodejs.org . Then open a NEW administrator PowerShell and run this script again.'
}
$nodeVersion = [version]((& node -v).TrimStart('v'))
if ($nodeVersion -lt [version]'22.13.0') {
  throw "Node.js $nodeVersion is too old (the built-in SQLite database needs 22.13 or newer). Please install the current Node.js LTS."
}
Write-Host "      Node.js $nodeVersion OK"

# ---- 2. Stop running instance (update case) ---------------------------------
Write-Host '[2/7] Stopping existing server (if any)...'
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

# ---- 3. Install dependencies + build ----------------------------------------
Write-Host '[3/7] Installing dependencies (npm ci) - this can take a few minutes...'
Push-Location $Root
try {
  npm ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed (is the internet connected?)' }
  Write-Host '[4/7] Building the web interface...'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }
}
finally {
  Pop-Location
}

# ---- 5. Firewall + power -----------------------------------------------------
Write-Host "[5/7] Opening Windows Firewall for port $Port and disabling sleep on AC power..."
if (-not (Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $RuleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
}
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0

# ---- 6. Auto-start at boot (Scheduled Task, runs as SYSTEM) ------------------
Write-Host '[6/7] Registering auto-start task...'
$action    = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"`"$RunBat`"`"" -WorkingDirectory $Root
$trigger   = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings  = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Principal $principal -Settings $settings `
  -Description 'Binh Minh Art Gallery dashboard server (auto-start at boot)' -Force | Out-Null

# ---- 7. Start + health check -------------------------------------------------
Write-Host '[7/7] Starting server...'
Start-ScheduledTask -TaskName $TaskName
$healthy = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 1
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$Port/api/paintings" -TimeoutSec 3
    if ($resp.StatusCode -eq 200) { $healthy = $true; break }
  }
  catch {
    # Server is still starting up - keep retrying until the timeout.
    Write-Verbose "Waiting for server: $($_.Exception.Message)"
  }
}
if (-not $healthy) {
  throw "Server did not answer on port $Port within 40 seconds. Check logs\server.log in the project folder."
}

# ---- LAN address -------------------------------------------------------------
$ips = @(Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and
    $_.InterfaceAlias -notmatch 'vEthernet|WSL|Loopback|VirtualBox|VMware|Bluetooth'
  } | Select-Object -ExpandProperty IPAddress)

# QR codes on paintings encode this address, so store it in the app if not configured yet.
$netCfg = Join-Path $Root 'data\network_config.json'
if (($ips.Count -eq 1) -and (-not (Test-Path $netCfg))) {
  $body = @{ customIp = $ips[0] } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "http://localhost:$Port/api/network-info" -ContentType 'application/json' -Body $body | Out-Null
  Write-Host "      Saved network address $($ips[0]) in the app (used by QR codes)."
}

Write-Host ''
Write-Host '=============================================================='
Write-Host ' DONE. Binh Minh Art is running and will start at every boot.'
Write-Host ''
Write-Host " On this PC : http://localhost:$Port"
foreach ($ip in $ips) {
  Write-Host " For family : http://${ip}:$Port   (phones/PCs on the same WiFi)"
}
if ($ips.Count -gt 1) {
  Write-Host ' Several network addresses found: open the app > network settings and pick the right one for QR codes.'
}
Write-Host ''
Write-Host ' IMPORTANT: give this PC a fixed IP (router DHCP reservation) -'
Write-Host '            the QR codes on paintings contain this address.'
Write-Host " Logs: $Root\logs\server.log"
Write-Host '=============================================================='
