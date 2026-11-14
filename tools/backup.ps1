# 备份内容：data / 上传的二创 / 音乐 / 后台上传的物料
Set-Location (Split-Path $PSScriptRoot -Parent)
New-Item -ItemType Directory -Force -Path backups | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = "backups\site-$stamp.zip"
$items = @("data", "uploads", "public\music", "public\materials\uploads", "public\assets\img\uploads") | Where-Object { Test-Path $_ }
Compress-Archive -Path $items -DestinationPath $target -CompressionLevel Optimal -Force
Get-ChildItem backups\site-*.zip | Sort-Object LastWriteTime -Descending | Select-Object -Skip 14 | Remove-Item -Force
Write-Output "备份完成：$target"
