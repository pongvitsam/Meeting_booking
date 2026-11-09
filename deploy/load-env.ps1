# ฟังก์ชันอ่านไฟล์ .env (บรรทัด KEY="value") เข้า environment ของ process นี้ ใช้ร่วมกันหลายสคริปต์ (dot-source)
function Import-DotEnv([string] $Path) {
  if (-not (Test-Path $Path)) { return }
  foreach ($line in Get-Content $Path -Encoding UTF8) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      $v = $Matches[2].Trim()
      if ($v.Length -ge 2 -and $v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
      [Environment]::SetEnvironmentVariable($Matches[1], $v, "Process")
    }
  }
}
