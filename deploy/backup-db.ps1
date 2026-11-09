# สำรองไฟล์ฐานข้อมูล SQLite ไป drive กลาง ตั้งเวลาด้วย Task Scheduler ให้รันทุกคืน
# ใช้: .\backup-db.ps1 -Db "D:\data\meeting_booking.db" -Dest "\\fileserver\backup\meeting-booking"
# ใช้ VACUUM INTO ผ่าน sqlite3 (ได้ไฟล์สำเนาที่สอดคล้องกันแม้เว็บกำลังทำงาน) ถ้าไม่มี sqlite3 จะคัดลอกไฟล์ตรง ๆ
param(
  [Parameter(Mandatory)] [string] $Db,
  [Parameter(Mandatory)] [string] $Dest,
  [int] $KeepDays = 30
)
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force $Dest | Out-Null
$name = [IO.Path]::GetFileNameWithoutExtension($Db)
$file = Join-Path $Dest ("{0}_{1:yyyyMMdd_HHmm}.db" -f $name, (Get-Date))

if (Get-Command sqlite3 -ErrorAction SilentlyContinue) {
  $esc = $file.Replace("'", "''")
  sqlite3 $Db "VACUUM INTO '$esc'"
  if ($LASTEXITCODE -ne 0) { throw "sqlite3 VACUUM INTO ล้มเหลว" }
} else {
  Copy-Item $Db $file
}

Get-ChildItem $Dest -Filter "$name*.db" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } | Remove-Item
Write-Host "สำรองแล้ว: $file"
