# รันเว็บแอป (ถูกเรียกโดย Scheduled Task ตอนเครื่องเปิด) ถ้า node หยุดทำงานจะเริ่มใหม่เองใน 5 วินาที
param(
  [Parameter(Mandatory)] [string] $AppDir,
  [Parameter(Mandatory)] [string] $EnvFile,
  [Parameter(Mandatory)] [string] $LogDir,
  [string] $NodePath
)
$ErrorActionPreference = "Continue"
. (Join-Path $PSScriptRoot "load-env.ps1")
Set-Location $AppDir
New-Item -ItemType Directory -Force $LogDir | Out-Null

Import-DotEnv $EnvFile
if (-not $env:PORT) { $env:PORT = "80" }
$env:HOSTNAME = "0.0.0.0"   # ตั้งชัดเจน เพราะ Windows ใช้ชื่อ HOSTNAME เป็นชื่อเครื่องในบางกรณี
$env:NODE_ENV = "production"
$env:TZ = "Asia/Bangkok"
$env:NEXT_TELEMETRY_DISABLED = "1"

if ($NodePath) { $node = $NodePath } else { $node = (Get-Command node -ErrorAction Stop).Source }
$log = Join-Path $LogDir "server.log"
while ($true) {
  # หมุน log เมื่อใหญ่เกิน 10 MB
  if ((Test-Path $log) -and (Get-Item $log).Length -gt 10MB) { Move-Item -Force $log "$log.old" }
  "[{0:yyyy-MM-dd HH:mm:ss}] start (port {1})" -f (Get-Date), $env:PORT | Out-File $log -Append -Encoding utf8
  & $node -r (Join-Path $AppDir "ip-header.cjs") server.js *>> $log
  "[{0:yyyy-MM-dd HH:mm:ss}] exited code {1}, restart in 5s" -f (Get-Date), $LASTEXITCODE | Out-File $log -Append -Encoding utf8
  Start-Sleep -Seconds 5
}
