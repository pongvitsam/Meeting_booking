# สร้างชุดไฟล์พร้อมติดตั้งบน server: .\deploy\build-release.ps1
# ผลลัพธ์อยู่ที่ .\release (และ release.zip) ใช้ร่วมกับ install.ps1 ในโฟลเดอร์นั้น
# เครื่องที่ติดตั้ง ต้องมีแค่ Node.js (เวอร์ชันหลักเดียวกับเครื่อง build) ไม่ต้องมีอินเทอร์เน็ตหรือ npm
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

# npm เขียนคำเตือนลง stderr ซึ่ง PowerShell 5.1 มองเป็น error จึงปิด Stop ชั่วคราว แล้วตรวจจาก exit code แทน
function Run($cmd) {
  $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  & cmd /c $cmd
  $code = $LASTEXITCODE; $ErrorActionPreference = $old
  if ($code -ne 0) { throw "ล้มเหลว: $cmd" }
}

Run "npm ci"
Run "npx prisma generate"
Run "npm run build"

$out = Join-Path (Get-Location) "release"
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
Copy-Item -Recurse .next\standalone $out
New-Item -ItemType Directory -Force "$out\.next" | Out-Null
Copy-Item -Recurse .next\static "$out\.next\static"
if (Test-Path public) { Copy-Item -Recurse public "$out\public" }
Copy-Item -Recurse prisma "$out\prisma"
Remove-Item -Force "$out\prisma\*.db*" -ErrorAction SilentlyContinue
Remove-Item -Force "$out\.env*" -ErrorAction SilentlyContinue

# Prisma CLI ที่ใช้ migrate ฐานข้อมูลบน server (standalone ไม่รวมมาให้) ติดตั้งลงใน release ให้ครบ
$ver = (Get-Content package.json -Raw | ConvertFrom-Json).dependencies."@prisma/client" -replace '[^\d.]', ''
Push-Location $out
Run "npm install --no-save --omit=dev --no-audit --no-fund --ignore-scripts prisma@$ver @prisma/client@$ver"
Run "npx prisma generate --schema prisma\schema.prisma"
Pop-Location

# สคริปต์ติดตั้ง/รัน
foreach ($f in "install.ps1", "uninstall.ps1", "run-server.ps1", "run-backup.ps1", "load-env.ps1", "ip-header.cjs", "init-db.cjs", "backup-db.cjs") {
  Copy-Item "deploy\$f" "$out\$f"
}

$zip = Join-Path (Get-Location) "release.zip"
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path "$out\*" -DestinationPath $zip
Write-Host "`nเสร็จแล้ว: $out และ $zip"
Write-Host "บน server: แตก zip -> เปิด PowerShell (Run as administrator) -> .\install.ps1"
