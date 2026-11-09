# สร้างชุดไฟล์พร้อมรันบน server: .\deploy\build-release.ps1
# ผลลัพธ์อยู่ที่ .\release  (คัดลอกทั้งโฟลเดอร์ไป server แล้วรัน node server.js)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

npm ci
npx prisma generate
npm run build

$out = Join-Path (Get-Location) "release"
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
Copy-Item -Recurse .next\standalone $out
New-Item -ItemType Directory -Force "$out\.next" | Out-Null
Copy-Item -Recurse .next\static "$out\.next\static"
if (Test-Path public) { Copy-Item -Recurse public "$out\public" }
Copy-Item -Recurse prisma "$out\prisma"
Copy-Item deploy\web.config "$out\web.config"
Write-Host "เสร็จแล้ว: $out  (อย่าลืมสร้างไฟล์ .env บน server)"
