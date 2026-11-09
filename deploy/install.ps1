# ติดตั้ง/อัปเกรดระบบจองห้องประชุมบน Windows Server (ต้องรันด้วยสิทธิ์ Administrator)
#   cd <โฟลเดอร์ release>
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
# รันซ้ำได้ = อัปเกรด (เก็บ .env และฐานข้อมูลเดิมไว้)
# สิ่งที่ทำ: คัดลอกไฟล์ → สร้าง .env → สร้าง/อัปเดตฐานข้อมูล → ลงทะเบียน Scheduled Task ให้เริ่มเองตอนเปิดเครื่อง
#          (และเริ่มใหม่เองถ้าล่ม) → เปิด Firewall เฉพาะวง LAN → ตั้งสำรองฐานข้อมูลทุกคืน → ตรวจว่าเว็บตอบสนอง
param(
  [string] $Root = "C:\MeetingBooking",
  [int] $Port = 80,
  [string] $RoomName = "ห้องประชุม",
  [int] $RoomCapacity = 20,
  [string] $AdminPassword,
  [int] $BackupKeepDays = 30
)
$ErrorActionPreference = "Stop"
$src = $PSScriptRoot
. (Join-Path $src "load-env.ps1")

function Step($t) { Write-Host "`n==> $t" -ForegroundColor Cyan }

# --- ตรวจเงื่อนไข ---
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "กรุณารันด้วยสิทธิ์ Administrator (คลิกขวา PowerShell > Run as administrator)" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "ไม่พบ Node.js กรุณาติดตั้ง Node.js LTS (https://nodejs.org) เลือก 'Add to PATH' แล้วเปิด PowerShell ใหม่" }
if (-not (Test-Path (Join-Path $src "server.js"))) { throw "ไม่พบ server.js: ต้องรันสคริปต์นี้จากโฟลเดอร์ release ที่ได้จาก build-release.ps1" }

$app = Join-Path $Root "app"
$data = Join-Path $Root "data"
$logs = Join-Path $Root "logs"
$backup = Join-Path $Root "backup"
$envFile = Join-Path $Root ".env"
$taskName = "MeetingBooking"
$nodePath = (Get-Command node).Source   # ใช้ path เต็ม เพราะ Task รันด้วยบัญชี SYSTEM
$backupTask = "MeetingBooking-Backup"

# --- หยุดบริการเดิม (กรณีอัปเกรด) ---
Step "หยุดบริการเดิม (ถ้ามี)"
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
}
# ปิด node ที่รันจากโฟลเดอร์ app เดิม เพื่อไม่ให้ไฟล์ถูกล็อก
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like "*$app*" -or $_.CommandLine -like "*ip-header.cjs*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like "*run-server.ps1*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

# --- คัดลอกไฟล์ ---
Step "คัดลอกไฟล์ไป $app"
foreach ($d in @($Root, $app, $data, $logs, $backup)) { New-Item -ItemType Directory -Force $d | Out-Null }
robocopy $src $app /MIR /NFL /NDL /NJH /NJS /NP /XF install.ps1 uninstall.ps1 .env | Out-Null
if ($LASTEXITCODE -ge 8) { throw "คัดลอกไฟล์ไม่สำเร็จ (robocopy exit $LASTEXITCODE)" }
Copy-Item (Join-Path $src "install.ps1"), (Join-Path $src "uninstall.ps1") $app -Force -ErrorAction SilentlyContinue

# --- .env ---
Step "ตั้งค่า .env"
if (-not (Test-Path $envFile)) {
  if (-not $AdminPassword) {
    $sec = Read-Host "ตั้งรหัสผ่านแอดมิน (อย่างน้อย 8 ตัวอักษร)" -AsSecureString
    $AdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  }
  if ($AdminPassword.Length -lt 8) { throw "รหัสผ่านแอดมินต้องยาวอย่างน้อย 8 ตัวอักษร" }
  if ($AdminPassword -match '["\r\n]') { throw "รหัสผ่านห้ามมีเครื่องหมายคำพูด (`") หรือขึ้นบรรทัดใหม่" }
  $bytes = New-Object byte[] 36
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $secret = [Convert]::ToBase64String($bytes)
  $dbUrl = "file:" + ((Join-Path $data "meeting_booking.db") -replace '\\', '/') + "?connection_limit=1"
  $content = @(
    "DATABASE_URL=`"$dbUrl`"",
    "ADMIN_PASSWORD=`"$AdminPassword`"",
    "SESSION_SECRET=`"$secret`"",
    "PORT=$Port"
  ) -join "`r`n"
  [IO.File]::WriteAllText($envFile, $content + "`r`n", (New-Object Text.UTF8Encoding($false)))
  # จำกัดสิทธิ์อ่านไฟล์ .env เฉพาะ Administrators และ SYSTEM
  icacls $envFile /inheritance:r /grant:r "Administrators:(F)" "SYSTEM:(F)" | Out-Null
  Write-Host "สร้าง $envFile แล้ว"
} else {
  Write-Host "พบ $envFile เดิม ใช้ต่อ (ไม่เขียนทับ)"
  # ให้พอร์ตตรงกับที่ระบุ ถ้าเปลี่ยน
  $t = Get-Content $envFile -Raw
  if ($t -match '(?m)^PORT=') { $t = $t -replace '(?m)^PORT=.*$', "PORT=$Port" } else { $t = $t.TrimEnd() + "`r`nPORT=$Port`r`n" }
  [IO.File]::WriteAllText($envFile, $t, (New-Object Text.UTF8Encoding($false)))
}
Import-DotEnv $envFile

# --- ฐานข้อมูล ---
Step "สร้าง/อัปเดตฐานข้อมูล"
Set-Location $app
& $nodePath node_modules\prisma\build\index.js migrate deploy --schema prisma\schema.prisma
if ($LASTEXITCODE -ne 0) { throw "migrate ฐานข้อมูลไม่สำเร็จ" }
& $nodePath init-db.cjs $RoomName $RoomCapacity
if ($LASTEXITCODE -ne 0) { throw "สร้างห้องเริ่มต้นไม่สำเร็จ" }

# --- ตรวจว่าพอร์ตว่าง ---
$busy = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
if ($busy) {
  $p = Get-Process -Id $busy[0].OwningProcess -ErrorAction SilentlyContinue
  throw "พอร์ต $Port ถูกใช้โดย '$($p.ProcessName)' (PID $($busy[0].OwningProcess)) ปิดโปรแกรมนั้นหรือเลือกพอร์ตอื่น เช่น -Port 8080"
}

# --- Scheduled Task: เริ่มตอนเปิดเครื่อง ---
Step "ลงทะเบียนให้เริ่มทำงานอัตโนมัติเมื่อเครื่องรีสตาร์ท"
$ps = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$runArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$app\run-server.ps1`" -AppDir `"$app`" -EnvFile `"$envFile`" -LogDir `"$logs`" -NodePath `"$nodePath`""
$action = New-ScheduledTaskAction -Execute $ps -Argument $runArgs -WorkingDirectory $app
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings `
  -Description "ระบบจองห้องประชุม (Next.js) เริ่มเองตอนเปิดเครื่อง" -Force | Out-Null

# --- สำรองฐานข้อมูลทุกคืน 02:00 ---
$bArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$app\run-backup.ps1`" -AppDir `"$app`" -EnvFile `"$envFile`" -BackupDir `"$backup`" -KeepDays $BackupKeepDays -NodePath `"$nodePath`""
Register-ScheduledTask -TaskName $backupTask -Force `
  -Action (New-ScheduledTaskAction -Execute $ps -Argument $bArgs -WorkingDirectory $app) `
  -Trigger (New-ScheduledTaskTrigger -Daily -At 2:00AM) -Principal $principal `
  -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)) `
  -Description "สำรองฐานข้อมูลระบบจองห้องประชุมทุกคืน" | Out-Null

# --- Firewall: เปิดเฉพาะวง LAN ---
Step "เปิด Firewall พอร์ต $Port เฉพาะวง LAN"
Get-NetFirewallRule -DisplayName "MeetingBooking" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName "MeetingBooking" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port `
  -RemoteAddress @("LocalSubnet", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16") -Profile Any | Out-Null

# --- เริ่มระบบและตรวจสอบ ---
Step "เริ่มระบบ"
Start-ScheduledTask -TaskName $taskName
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
  Start-Sleep -Seconds 1
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $ok = $true; break }
  } catch { }
}
if (-not $ok) {
  Write-Host "ระบบยังไม่ตอบสนอง ดู log: $logs\server.log" -ForegroundColor Yellow
  if (Test-Path "$logs\server.log") { Get-Content "$logs\server.log" -Tail 20 }
  exit 1
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
$suffix = if ($Port -eq 80) { "" } else { ":$Port" }
Write-Host "`nติดตั้งเสร็จแล้ว และระบบทำงานอยู่" -ForegroundColor Green
Write-Host "  เปิดใช้งาน : http://$ip$suffix/   หรือ  http://$env:COMPUTERNAME$suffix/"
Write-Host "  แอดมิน     : http://$ip$suffix/admin/login"
Write-Host "  ข้อมูล     : $data   (สำรองทุกคืนที่ $backup)"
Write-Host "  log        : $logs\server.log"
Write-Host "  เริ่มเองเมื่อเครื่องรีสตาร์ท: ลงทะเบียนเป็น Scheduled Task '$taskName' แล้ว"
