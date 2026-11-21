# 一键启动本地站点 + 公网隧道（Render 挂掉时的临时方案）
# 用法：右键 → 使用 PowerShell 运行
$ErrorActionPreference = 'SilentlyContinue'
$root = "C:\Users\suya\Documents\deepseek-harness\default-workspace\lanai-huoguo"
$node = "C:\Users\suya\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
$cf   = Join-Path $root "backups\bin\cloudflared.exe"
$tok  = (Get-Content (Join-Path $root "backups\gh-token.txt") -Raw).Trim()

Write-Host "1/2 启动网站服务…" -ForegroundColor Cyan
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*server.js*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep -Seconds 1
$env:GITHUB_TOKEN = $tok
Start-Process -FilePath $node -ArgumentList "server.js" -WorkingDirectory $root -WindowStyle Hidden
Start-Sleep -Seconds 3
$h = (curl.exe -s -m 8 "http://127.0.0.1:8787/api/health")
Write-Host "   本地状态: $h" -ForegroundColor Green

Write-Host "2/2 打开公网隧道（保持这个窗口别关）…" -ForegroundColor Cyan
Write-Host "   启动后会显示一个 https://xxxx.trycloudflare.com 的地址，把它发给别人即可" -ForegroundColor DarkGray
& $cf tunnel --url http://127.0.0.1:8787 --no-autoupdate
