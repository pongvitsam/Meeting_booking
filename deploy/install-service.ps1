# ติดตั้ง Next.js เป็น Windows Service ด้วย NSSM (รันด้วยสิทธิ์ Administrator)
# ใช้: .\install-service.ps1 -AppDir "D:\apps\meeting-booking" -Nssm "C:\tools\nssm.exe"
param(
  [Parameter(Mandatory)] [string] $AppDir,
  [string] $Nssm = "nssm.exe",
  [string] $ServiceName = "MeetingBooking"
)
$ErrorActionPreference = "Stop"
$node = (Get-Command node).Source

& $Nssm install $ServiceName $node "server.js"
& $Nssm set $ServiceName AppDirectory $AppDir
& $Nssm set $ServiceName AppEnvironmentExtra "HOSTNAME=127.0.0.1" "PORT=3000" "NODE_ENV=production" "TZ=Asia/Bangkok"
& $Nssm set $ServiceName Start SERVICE_AUTO_START
& $Nssm set $ServiceName AppStdout "$AppDir\logs\out.log"
& $Nssm set $ServiceName AppStderr "$AppDir\logs\err.log"
New-Item -ItemType Directory -Force "$AppDir\logs" | Out-Null
& $Nssm start $ServiceName
Write-Host "เริ่ม service $ServiceName แล้ว (ฟังที่ 127.0.0.1:3000 เฉพาะเครื่องนี้)"
