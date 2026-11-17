# รันเว็บแอป (ถูกเรียกโดย Scheduled Task ตอนเครื่องเปิด)
# - ถ้า node หยุดทำงาน จะเริ่มใหม่เองใน 5 วินาที
# - ตรวจสุขภาพ /api/health ทุก 60 วินาที ถ้าล้มเหลว 3 ครั้งติด (เช่น ค้าง/DB ล็อก) จะปิดแล้วเริ่มใหม่
# - เขียนเหตุการณ์สำคัญลง Windows Event Log (Application, source "MeetingBooking")
param(
  [Parameter(Mandatory)] [string] $AppDir,
  [Parameter(Mandatory)] [string] $EnvFile,
  [Parameter(Mandatory)] [string] $LogDir,
  [string] $NodePath,
  [int] $CheckSeconds = 60,
  [int] $MaxFailures = 3
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
$outLog = Join-Path $LogDir "node-out.log"      # stdout ของ node (แยกไฟล์จาก server.log เพื่อไม่ให้ชนกัน)
$errLog = Join-Path $LogDir "node-error.log"
$healthUrl = "http://127.0.0.1:$($env:PORT)/api/health"

function Write-Log([string] $msg, [string] $level = "Information") {
  "[{0:yyyy-MM-dd HH:mm:ss}] {1}" -f (Get-Date), $msg | Out-File $log -Append -Encoding utf8
  if ($level -ne "Information") {
    try { Write-EventLog -LogName Application -Source "MeetingBooking" -EntryType $level -EventId 1000 -Message $msg } catch { }
  }
}

function Test-Health {
  try {
    $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 10
    return ($r.StatusCode -eq 200)
  } catch { return $false }
}

while ($true) {
  foreach ($f in @($log, $outLog, $errLog)) {
    if ((Test-Path $f) -and (Get-Item $f).Length -gt 10MB) { Move-Item -Force $f "$f.old" }
  }
  Write-Log "start (port $($env:PORT))"
  $proc = Start-Process -FilePath $node -ArgumentList @("-r", "`"$(Join-Path $AppDir 'ip-header.cjs')`"", "server.js") `
    -WorkingDirectory $AppDir -NoNewWindow -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog

  $fails = 0
  $waited = 0
  while (-not $proc.HasExited) {
    Start-Sleep -Seconds 5
    $waited += 5
    if ($waited -lt $CheckSeconds) { continue }
    $waited = 0
    if (Test-Health) { $fails = 0; continue }
    $fails++
    Write-Log "health check ล้มเหลว ($fails/$MaxFailures)" "Warning"
    if ($fails -ge $MaxFailures) {
      Write-Log "เว็บไม่ตอบสนอง $MaxFailures ครั้งติด จะรีสตาร์ท" "Error"
      Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
      break
    }
  }
  if ($proc.HasExited) { Write-Log "node หยุดทำงาน (exit code $($proc.ExitCode)) เริ่มใหม่ใน 5 วินาที" "Warning" }
  Start-Sleep -Seconds 5
}
