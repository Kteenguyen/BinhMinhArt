#Requires -RunAsAdministrator
<#
  Binh Minh Art - remove auto-start + firewall rule on this Windows PC.
  Does NOT delete the project folder or any data.

    powershell -ExecutionPolicy Bypass -File .\deploy\windows\uninstall.ps1

  NOTE: keep this file ASCII-only (Windows PowerShell 5.1 reads BOM-less files as ANSI).
#>
$ErrorActionPreference = 'Stop'

$Port     = 5001
$TaskName = 'BinhMinhArt'
$RuleName = "BinhMinhArt (TCP $Port)"

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Removed scheduled task '$TaskName'."
}
else {
  Write-Host "Scheduled task '$TaskName' not found (nothing to remove)."
}

if (Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue) {
  Remove-NetFirewallRule -DisplayName $RuleName
  Write-Host "Removed firewall rule '$RuleName'."
}
else {
  Write-Host "Firewall rule '$RuleName' not found (nothing to remove)."
}

Write-Host 'Done. Your data folders were not touched.'
