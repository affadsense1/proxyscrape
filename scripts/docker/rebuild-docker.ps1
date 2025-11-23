# 快速重建 Docker 镜像并测试
$ErrorActionPreference = "Stop"

Write-Host "🔨 开始构建 Docker 镜像..." -ForegroundColor Cyan
docker build -t proxy-pool:test .

Write-Host ""
Write-Host "✅ 构建完成！" -ForegroundColor Green
Write-Host ""

Write-Host "🔍 验证 mihomo 二进制文件..." -ForegroundColor Cyan
docker run --rm proxy-pool:test ls -lh /app/bin/mihomo

Write-Host ""
Write-Host "📦 测试 mihomo 版本..." -ForegroundColor Cyan
docker run --rm proxy-pool:test /app/bin/mihomo -v

Write-Host ""
Write-Host "✅ 所有验证通过！" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 启动容器测试：" -ForegroundColor Yellow
Write-Host "   docker run -d -p 3000:3000 --name proxy-pool-test proxy-pool:test"
Write-Host ""
Write-Host "📋 查看日志：" -ForegroundColor Yellow
Write-Host "   docker logs -f proxy-pool-test"
Write-Host ""
Write-Host "🛑 停止并删除：" -ForegroundColor Yellow
Write-Host "   docker stop proxy-pool-test; docker rm proxy-pool-test"
