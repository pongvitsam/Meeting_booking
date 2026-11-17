# ถอนการติดตั้ง (ต้องรันด้วยสิทธิ์ Administrator) ไม่ลบข้อมูลและ .env เว้นแต่ใส่ -RemoveData
param(
  [string] $Root = "C:\MeetingBooking",
  [switch] $RemoveData
)
$ErrorActionPreference = "Continue"
foreach ($t in @("MeetingBooking", "MeetingBooking-Backup", "MeetingBooking-Update")) {
  if (Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $t -Confirm:$false
  }
}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like "*ip-header.cjs*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like "*run-server.ps1*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Get-NetFirewallRule -DisplayName "MeetingBooking" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
Remove-Item -Recurse -Force (Join-Path $Root "app") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $Root "app.prev") -ErrorAction SilentlyContinue
if ($RemoveData) {
  Remove-Item -Recurse -Force $Root
  Write-Host "ลบทั้งหมดรวมข้อมูลแล้ว"
} else {
  Write-Host "ถอนการติดตั้งแล้ว ข้อมูลยังอยู่ที่ $Root (data, backup, logs, .env) ลบเองได้ถ้าไม่ใช้แล้ว"
}
