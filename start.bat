@echo off
chcp 65001 >nul
echo ========================================
echo    IndieGameHub 项目调试启动脚本
echo ========================================
echo.

echo [信息] 正在启动服务器端...
start "IndieGameHub-服务器" cmd /k "cd /d %~dp0server && npm run dev"

REM 等待服务器启动
timeout /t 2 /nobreak >nul

echo [信息] 正在启动客户端...
start "IndieGameHub-客户端" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ========================================
echo    启动完成！
echo ========================================
echo 服务器端和客户端已在新的窗口中启动
echo 关闭对应的窗口即可停止对应的服务
echo.
pause
