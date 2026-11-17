# กู้คืนฐานข้อมูลจากไฟล์สำรอง (ต้องรันด้วยสิทธิ์ Administrator)
#   .\restore.ps1 -From C:\MeetingBooking\backup\meeting_booking_20261117_020000.db
# ขั้นตอน: หยุดเว็บ -> เก็บ DB ปัจจุบันไว้เป็น before-restore_*.db -> ทับด้วยไฟล์สำรอง -> เริ่มเว็บ -> ตรวจสุขภาพ
param(
  [Parameter(Mandatory)] [string] $From,
  [string] $Root = "C:\MeetingBooking"
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "load-env.ps1")

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "กรุณารันด้วยสิทธิ์ Administrator" }
if (-not (Test-Path $From)) { throw "ไม่พบไฟล์สำรอง: $From" }

$envFile = Join-Path $Root ".env"
Import-DotEnv $envFile
if ($env:DATABASE_URL -notmatch '^file:([^?]+)') { throw "อ่าน DATABASE_URL จาก $envFile ไม่ได้" }
$db = $Matches[1] -replace '/', '\'
$port = if ($env:PORT) { $env:PORT } else { "80" }

Write-Host "หยุดเว็บ..."
Stop-ScheduledTask -TaskName "MeetingBooking" -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like "*ip-header.cjs*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like "*run-server.ps1*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep -Seconds 2

if (Test-Path $db) {
  $keep = Join-Path (Split-Path $db -Parent) ("before-restore_{0:yyyyMMdd_HHmmss}.db" -f (Get-Date))
  Copy-Item $db $keep -Force
  Write-Host "เก็บฐานข้อมูลเดิมไว้ที่ $keep"
}
Remove-Item "$db-journal", "$db-wal", "$db-shm" -Force -ErrorAction SilentlyContinue
Copy-Item $From $db -Force
Write-Host "กู้คืนจาก $From แล้ว"

Start-ScheduledTask -TaskName "MeetingBooking"
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 1
  try { if ((Invoke-WebRequest "http://127.0.0.1:$port/api/health" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) { Write-Host "เว็บกลับมาทำงานแล้ว"; exit 0 } } catch { }
}
Write-Warning "เว็บยังไม่ตอบสนอง ดู $Root\logs\server.log"
exit 1
