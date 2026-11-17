# อัปเกรดระบบเป็นเวอร์ชันใหม่จาก GitHub Release (ต้องรันด้วยสิทธิ์ Administrator)
#   .\update.ps1                      เช็กเวอร์ชันล่าสุด ถ้าใหม่กว่าก็ติดตั้ง
#   .\update.ps1 -Version v1.2.0      บังคับติดตั้ง/ย้อนไปเวอร์ชันนั้น
#   .\update.ps1 -Source D:\release   ติดตั้งจากโฟลเดอร์ release ที่แตกไว้แล้ว (ไม่ใช้ GitHub)
# ลำดับ: สำรอง DB (pre-upgrade) -> เก็บ app เดิมเป็น app.prev -> รัน install.ps1 ของเวอร์ชันใหม่
#        -> ถ้าเว็บไม่ผ่าน health check จะย้อนกลับ app + DB อัตโนมัติ
param(
  [string] $Root = "C:\MeetingBooking",
  [string] $Repo = "pongvitsam/Meeting_booking",
  [string] $Version,
  [string] $Source,
  [switch] $Force
)
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"   # ดาวน์โหลดไฟล์ใหญ่ได้เร็วขึ้นมาก
. (Join-Path $PSScriptRoot "load-env.ps1")

$app = Join-Path $Root "app"
$prev = Join-Path $Root "app.prev"
$tmp = Join-Path $Root "update-tmp"
$logs = Join-Path $Root "logs"
$envFile = Join-Path $Root ".env"
$log = Join-Path $logs "update.log"
New-Item -ItemType Directory -Force $logs | Out-Null

function Write-Log([string] $msg, [string] $level = "Information") {
  "[{0:yyyy-MM-dd HH:mm:ss}] {1}" -f (Get-Date), $msg | Out-File $log -Append -Encoding utf8
  Write-Host $msg
  if ($level -ne "Information") {
    try { Write-EventLog -LogName Application -Source "MeetingBooking" -EntryType $level -EventId 3000 -Message $msg } catch { }
  }
}

function Stop-App {
  Stop-ScheduledTask -TaskName "MeetingBooking" -ErrorAction SilentlyContinue
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*ip-header.cjs*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*run-server.ps1*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
}

function Test-Healthy([int] $port) {
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 1
    try { if ((Invoke-WebRequest "http://127.0.0.1:$port/api/health" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) { return $true } } catch { }
  }
  return $false
}

function Read-Ver([string] $dir) {
  $f = Join-Path $dir "VERSION"
  if (Test-Path $f) { return (Get-Content $f -Raw).Trim() }
  return "0.0.0"
}

try {
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if (-not $isAdmin) { throw "กรุณารันด้วยสิทธิ์ Administrator" }
  if (-not (Test-Path $app)) { throw "ยังไม่ได้ติดตั้ง ($app ไม่มี) ให้รัน install.ps1 ก่อน" }

  $current = Read-Ver $app
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force $tmp | Out-Null

  # --- 1) หาเวอร์ชันใหม่ ---
  if ($Source) {
    $newDir = $Source
    $newVer = Read-Ver $newDir
  } else {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $headers = @{ "User-Agent" = "meeting-booking-updater"; "Accept" = "application/vnd.github+json" }
    $tokenFile = Join-Path $Root "update.token"      # ใช้เฉพาะถ้า repo เป็น private
    if (Test-Path $tokenFile) { $headers["Authorization"] = "Bearer " + (Get-Content $tokenFile -Raw).Trim() }
    $api = if ($Version) { "https://api.github.com/repos/$Repo/releases/tags/$Version" } else { "https://api.github.com/repos/$Repo/releases/latest" }
    $rel = Invoke-RestMethod -Uri $api -Headers $headers -TimeoutSec 60
    $newVer = ($rel.tag_name -replace '^v', '')
    Write-Log "เวอร์ชันปัจจุบัน $current / บน GitHub $newVer"
    $isNewer = $false
    try { $isNewer = ([version]$newVer -gt [version]$current) } catch { $isNewer = ($newVer -ne $current) }
    if (-not $Version -and -not $Force -and -not $isNewer) { Write-Log "เป็นเวอร์ชันล่าสุดแล้ว ไม่ต้องอัปเกรด"; exit 0 }
    if ($Version -and $newVer -eq $current -and -not $Force) { Write-Log "ติดตั้งเวอร์ชัน $newVer อยู่แล้ว (ใช้ -Force เพื่อติดตั้งซ้ำ)"; exit 0 }

    $zipAsset = $rel.assets | Where-Object { $_.name -eq "release.zip" } | Select-Object -First 1
    $shaAsset = $rel.assets | Where-Object { $_.name -eq "release.zip.sha256" } | Select-Object -First 1
    if (-not $zipAsset -or -not $shaAsset) { throw "Release $($rel.tag_name) ไม่มีไฟล์ release.zip หรือ release.zip.sha256" }

    Write-Log "ดาวน์โหลด $($rel.tag_name) ($([math]::Round($zipAsset.size / 1MB)) MB)..."
    $zip = Join-Path $tmp "release.zip"
    $dlHeaders = @{ "User-Agent" = "meeting-booking-updater" }
    if ($headers["Authorization"]) { $dlHeaders["Authorization"] = $headers["Authorization"]; $dlHeaders["Accept"] = "application/octet-stream"; $zipUrl = $zipAsset.url; $shaUrl = $shaAsset.url } else { $zipUrl = $zipAsset.browser_download_url; $shaUrl = $shaAsset.browser_download_url }
    Invoke-WebRequest -Uri $zipUrl -Headers $dlHeaders -OutFile $zip -TimeoutSec 1800
    $expected = ((Invoke-WebRequest -Uri $shaUrl -Headers $dlHeaders -UseBasicParsing -TimeoutSec 60).Content -split '\s+')[0].Trim().ToLower()
    $actual = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
    if ($actual -ne $expected) { throw "SHA-256 ของไฟล์ที่ดาวน์โหลดไม่ตรง (คาดหวัง $expected ได้ $actual) ยกเลิกการอัปเกรด" }

    $newDir = Join-Path $tmp "release"
    Expand-Archive -Path $zip -DestinationPath $newDir -Force
  }
  if (-not (Test-Path (Join-Path $newDir "install.ps1"))) { throw "ชุดติดตั้งไม่สมบูรณ์ (ไม่มี install.ps1 ใน $newDir)" }

  # --- 2) สำรอง DB ก่อนอัปเกรด (ถ้าสำรองไม่ได้ ไม่อัปเกรด) ---
  Write-Log "อัปเกรด $current -> $newVer : สำรองฐานข้อมูลก่อน"
  Import-DotEnv $envFile
  $port = if ($env:PORT) { [int]$env:PORT } else { 80 }
  $db = $null
  if ($env:DATABASE_URL -match '^file:([^?]+)') { $db = $Matches[1] -replace '/', '\' }
  $node = (Get-Command node -ErrorAction Stop).Source
  Push-Location $app
  $out = & $node backup-db.cjs (Join-Path $Root "backup") 30 "pre-upgrade-$current"
  $bkExit = $LASTEXITCODE
  Pop-Location
  if ($bkExit -ne 0) { throw "สำรองฐานข้อมูลก่อนอัปเกรดไม่สำเร็จ จึงไม่อัปเกรด" }
  $preBackup = ($out | Select-Object -Last 1).ToString().Trim()
  Write-Log "สำรองแล้ว: $preBackup"

  # --- 3) เก็บ app เดิมไว้เผื่อย้อนกลับ ---
  Stop-App
  robocopy $app $prev /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "เก็บ app เดิมไม่สำเร็จ (robocopy exit $LASTEXITCODE)" }

  # --- 4) ติดตั้งเวอร์ชันใหม่ (install.ps1 ของเวอร์ชันใหม่ ทำ migrate + เริ่มเว็บ + health check) ---
  $ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  & $ps -NoProfile -ExecutionPolicy Bypass -File (Join-Path $newDir "install.ps1") -Root $Root -NoPrompt
  $installExit = $LASTEXITCODE

  if ($installExit -eq 0 -and (Test-Healthy $port)) {
    Write-Log "อัปเกรดสำเร็จ: $current -> $newVer" "Information"
    try { Write-EventLog -LogName Application -Source "MeetingBooking" -EntryType Information -EventId 3001 -Message "อัปเกรดสำเร็จ: $current -> $newVer" } catch { }
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
    exit 0
  }

  # --- 5) ล้มเหลว: ย้อนกลับ ---
  Write-Log "อัปเกรดเป็น $newVer ล้มเหลว (install exit $installExit) กำลังย้อนกลับเป็น $current" "Error"
  Stop-App
  robocopy $prev $app /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($db -and (Test-Path $preBackup)) {
    Remove-Item "$db-journal", "$db-wal", "$db-shm" -Force -ErrorAction SilentlyContinue
    Copy-Item $preBackup $db -Force
  }
  Start-ScheduledTask -TaskName "MeetingBooking"
  if (Test-Healthy $port) {
    Write-Log "ย้อนกลับเป็น $current สำเร็จ ระบบทำงานปกติ (ข้อมูลคืนจาก $preBackup)" "Warning"
  } else {
    Write-Log "ย้อนกลับแล้วแต่เว็บยังไม่ตอบสนอง ต้องตรวจเอง ดู $logs" "Error"
  }
  exit 1
} catch {
  Write-Log "update.ps1 ผิดพลาด: $($_.Exception.Message)" "Error"
  # ถ้าหยุดเว็บไปแล้วก่อนเกิดข้อผิดพลาด ให้พยายามเปิดกลับ
  if (Test-Path (Join-Path $app "server.js")) { Start-ScheduledTask -TaskName "MeetingBooking" -ErrorAction SilentlyContinue }
  exit 1
}
