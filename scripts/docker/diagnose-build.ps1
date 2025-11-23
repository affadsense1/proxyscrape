#!/usr/bin/env pwsh
# 诊断 Docker 构建问题

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Docker 构建诊断" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 测试 builder 阶段
Write-Host "📋 步骤 1: 测试 builder 阶段..." -ForegroundColor Yellow
Write-Host ""

Write-Host "构建 builder 阶段..." -ForegroundColor Gray
docker build --target builder -t proxy-pool:builder -f Dockerfile.debug .

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Builder 阶段构建成功" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "检查 builder 阶段的 bin 目录..." -ForegroundColor Gray
    docker run --rm proxy-pool:builder ls -laR /app/bin/
    
    Write-Host ""
    Write-Host "测试 mihomo 版本..." -ForegroundColor Gray
    docker run --rm proxy-pool:builder /app/bin/mihomo -v
    
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Builder 阶段构建失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "1. 网络问题，无法从 GitHub 下载" -ForegroundColor Gray
    Write-Host "2. 架构不匹配" -ForegroundColor Gray
    Write-Host "3. 版本号错误" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# 步骤 2: 测试完整构建
Write-Host "📋 步骤 2: 测试完整构建..." -ForegroundColor Yellow
Write-Host ""

Write-Host "构建完整镜像..." -ForegroundColor Gray
docker build -t proxy-pool:debug -f Dockerfile.debug .

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 完整构建成功" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ 完整构建失败" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# 步骤 3: 验证 runner 阶段
Write-Host "📋 步骤 3: 验证 runner 阶段..." -ForegroundColor Yellow
Write-Host ""

Write-Host "检查 runner 阶段的 bin 目录..." -ForegroundColor Gray
docker run --rm proxy-pool:debug ls -laR /app/bin/

Write-Host ""
Write-Host "测试 mihomo 文件..." -ForegroundColor Gray
$testResult = docker run --rm proxy-pool:debug test -f /app/bin/mihomo 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ mihomo 文件存在" -ForegroundColor Green
} else {
    Write-Host "❌ mihomo 文件不存在" -ForegroundColor Red
    Write-Host ""
    Write-Host "这是问题所在！文件在 builder 阶段存在，但没有被复制到 runner 阶段。" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "测试 mihomo 版本..." -ForegroundColor Gray
$versionResult = docker run --rm proxy-pool:debug /app/bin/mihomo -v 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ mihomo 可执行" -ForegroundColor Green
    Write-Host $versionResult -ForegroundColor Gray
} else {
    Write-Host "❌ mihomo 不可执行或不存在" -ForegroundColor Red
    Write-Host $versionResult -ForegroundColor Gray
}

# 步骤 4: 测试容器启动
Write-Host ""
Write-Host "📋 步骤 4: 测试容器启动..." -ForegroundColor Yellow
Write-Host ""

Write-Host "启动测试容器..." -ForegroundColor Gray
docker run --rm --name proxy-pool-test -d proxy-pool:debug

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "查看启动日志..." -ForegroundColor Gray
Write-Host "----------------------------------------" -ForegroundColor Gray
docker logs proxy-pool-test
Write-Host "----------------------------------------" -ForegroundColor Gray

Write-Host ""
Write-Host "停止测试容器..." -ForegroundColor Gray
docker stop proxy-pool-test 2>$null | Out-Null

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  诊断完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "如果 mihomo 文件在 builder 阶段存在但在 runner 阶段不存在，" -ForegroundColor Yellow
Write-Host "可能是 COPY 命令的路径问题或 Next.js 构建配置问题。" -ForegroundColor Yellow
Write-Host ""
