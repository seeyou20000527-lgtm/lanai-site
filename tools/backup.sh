#!/usr/bin/env bash
# 备份内容：data / 上传的二创 / 音乐 / 后台上传的物料
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
tar -czf "backups/site-$STAMP.tar.gz" data uploads public/music public/materials/uploads public/assets/img/uploads 2>/dev/null || true
# 只保留最近 14 份
ls -1t backups/site-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "备份完成：backups/site-$STAMP.tar.gz"
