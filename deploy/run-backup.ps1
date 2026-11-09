# สำรองฐานข้อมูล (เรียกโดย Scheduled Task ทุกคืน)
param(
  [Parameter(Mandatory)] [string] $AppDir,
  [Parameter(Mandatory)] [string] $EnvFile,
  [Parameter(Mandatory)] [string] $BackupDir,
  [int] $KeepDays = 30,
  [string] $NodePath = "node"
)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "load-env.ps1")
Import-DotEnv $EnvFile
Set-Location $AppDir
& $NodePath backup-db.cjs $BackupDir $KeepDays
