# สำรองฐานข้อมูล (เรียกโดย Scheduled Task ทุกคืน) ตรวจความถูกต้องของไฟล์ และก๊อปซ้ำไป drive กลางถ้าตั้งไว้
param(
  [Parameter(Mandatory)] [string] $AppDir,
  [Parameter(Mandatory)] [string] $EnvFile,
  [Parameter(Mandatory)] [string] $BackupDir,
  [int] $KeepDays = 30,
  [string] $NodePath = "node",
  [string] $CopyTo = "",
  [string] $Label = ""
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "load-env.ps1")

function Write-Event([string] $msg, [string] $type) {
  try { Write-EventLog -LogName Application -Source "MeetingBooking" -EntryType $type -EventId 2000 -Message $msg } catch { }
}

try {
  Import-DotEnv $EnvFile
  Set-Location $AppDir
  $out = & $NodePath backup-db.cjs $BackupDir $KeepDays $Label
  if ($LASTEXITCODE -ne 0) { throw "backup-db.cjs ล้มเหลว (exit $LASTEXITCODE)" }
  $file = ($out | Select-Object -Last 1).ToString().Trim()
  Write-Host "สำรองแล้ว: $file"
  if ($CopyTo) {
    try {
      New-Item -ItemType Directory -Force $CopyTo | Out-Null
      Copy-Item $file $CopyTo -Force
      $limit = (Get-Date).AddDays(-$KeepDays)
      Get-ChildItem $CopyTo -Filter "meeting_booking_*.db" | Where-Object { $_.LastWriteTime -lt $limit } | Remove-Item -Force
      Write-Host "ก๊อปไป $CopyTo แล้ว"
    } catch {
      Write-Event "สำรองสำเร็จแต่ก๊อปไป $CopyTo ไม่ได้: $($_.Exception.Message)" "Warning"
      Write-Warning $_.Exception.Message
    }
  }
  Write-Output $file
} catch {
  Write-Event "สำรองฐานข้อมูลล้มเหลว: $($_.Exception.Message)" "Error"
  throw
}
