@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 辣奶火锅 · 官方小站
echo.
echo   🍲 正在启动辣奶火锅的官方小站...
echo.
where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
) else (
  if exist "C:\Users\suya\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" (
    "C:\Users\suya\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" server.js
  ) else (
    echo 没有找到 Node.js，请先安装：https://nodejs.org/
  )
)
echo.
pause
