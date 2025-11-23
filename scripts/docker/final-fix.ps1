#!/usr/bin/env pwsh
# 最终修复脚本 - 确保 mihomo 文件正确复制

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  最终修复：Mihomo 文件复制问题" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "问题分析：" -ForegroundColor Yellow
Write-Host "Next.js standalone 模式不会自动复制 bin 目录。" -ForegroundColor Gray
Write-Host "我们需要在 Dockerfile 中单独复制 mihomo 文件。" -ForegroundColor Gray
Write-Host ""

# 检查 Docker
Write-Host "📋 检查 Docker..." -ForegroundColor Yellow
try {
    $version = docker version --format '{{.Server.Version}}' 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker 未运行"
    }
    Write-Host "✅ Docker 正在运行 (版本: $version)" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker 未运行！请先启动 Docker Desktop。" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 清理旧资源
Write-Host "📋 清理旧资源..." -ForegroundColor Yellow
docker stop proxy-pool 2>$null | Out-Null
docker rm proxy-pool 2>$null | Out-Null
docker rmi proxy-pool:latest 2>$null | Out-Null
docker rmi proxy-pool:builder 2>$null | Out-Null
docker rmi proxy-pool:debug 2>$null | Out-Null
Write-Host "✅ 清理完成" -ForegroundColor Green

Write-Host ""

# 步骤 1: 测试 builder 阶段
Write-Host "📋 步骤 1/4: 测试 builder 阶段..." -ForegroundColor Yellow
Write-Host "这将验证 mihomo 是否被正确下载..." -ForegroundColor Gray
Write-Host ""

docker build --target builder -t proxy-pool:builder .

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Builder 阶段失败！" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "1. 网络问题，无法从 GitHub 下载 mihomo" -ForegroundColor Gray
    Write-Host "2. GitHub API 限流" -ForegroundColor Gray
    Write-Host ""
    Write-Host "解决方案：" -ForegroundColor Yellow
    Write-Host "1. 检查网络连接" -ForegroundColor Gray
    Write-Host "2. 使用代理：docker build --build-arg HTTP_PROXY=... " -ForegroundColor Gray
    Write-Host "3. 稍后重试" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "✅ Builder 阶段成功" -ForegroundColor Green
Write-Host ""

# 验证 builder 阶段的文件
Write-Host "验证 builder 阶段的 mihomo 文件..." -ForegroundColor Gray
$builderCheck = docker run --rm proxy-pool:builder ls -lh /app/bin/mihomo 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host $builderCheck -ForegroundColor Gray
    Write-Host "✅ Builder 阶段：mihomo 文件存在" -ForegroundColor Green
} else {
    Write-Host "❌ Builder 阶段：mihomo 文件不存在！" -ForegroundColor Red
    Write-Host $builderCheck -ForegroundColor Gray
    exit 1
}

Write-Host ""

# 步骤 2: 构建完整镜像
Write-Host "📋 步骤 2/4: 构建完整镜像..." -ForegroundColor Yellow
Write-Host "这将复制 mihomo 到 runner 阶段..." -ForegroundColor Gray
Write-Host ""

docker build -t proxy-pool:latest .

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 完整构建失败！" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ 完整构建成功" -ForegroundColor Green
Write-Host ""

# 步骤 3: 验证 runner 阶段
Write-Host "📋 步骤 3/4: 验证 runner 阶段..." -ForegroundColor Yellow
Write-Host ""

Write-Host "检查 bin 目录..." -ForegroundColor Gray
$runnerDirCheck = docker run --rm proxy-pool:latest ls -la /app/bin/ 2>&1
Write-Host $runnerDirCheck -ForegroundColor Gray

Write-Host ""
Write-Host "检查 mihomo 文件..." -ForegroundColor Gray
$runnerFileCheck = docker run --rm proxy-pool:latest ls -lh /app/bin/mihomo 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host $runnerFileCheck -ForegroundColor Gray
    Write-Host "✅ Runner 阶段：mihomo 文件存在" -ForegroundColor Green
} else {
    Write-Host "❌ Runner 阶段：mihomo 文件不存在！" -ForegroundColor Red
    Write-Host $runnerFileCheck -ForegroundColor Gray
    Write-Host ""
    Write-Host "这是关键问题！文件没有被复制到 runner 阶段。" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请检查 Dockerfile 中的 COPY 命令：" -ForegroundColor Yellow
    Write-Host "COPY --from=builder /app/bin/mihomo ./bin/mihomo" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "测试 mihomo 版本..." -ForegroundColor Gray
$versionCheck = docker run --rm proxy-pool:latest /app/bin/mihomo -v 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host $versionCheck -ForegroundColor Gray
    Write-Host "✅ mihomo 可执行" -ForegroundColor Green
} else {
    Write-Host "❌ mihomo 不可执行" -ForegroundColor Red
    Write-Host $versionCheck -ForegroundColor Gray
    exit 1
}

Write-Host ""

# 步骤 4: 启动容器
Write-Host "📋 步骤 4/4: 启动容器..." -ForegroundColor Yellow
Write-Host ""

$dataPath = Join-Path $PSScriptRoot "data"
if (-not (Test-Path $dataPath)) {
    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
}

docker run -d `
    -p 3000:3000 `
    -v "${dataPath}:/app/data" `
    --name proxy-pool `
    proxy-pool:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 容器启动失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 容器启动成功" -ForegroundColor Green
Write-Host ""

# 等待启动
Write-Host "等待容器启动..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# 显示启动日志
Write-Host ""
Write-Host "📋 容器启动日志（最近 20 行）:" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
docker logs --tail 20 proxy-pool
Write-Host "----------------------------------------" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ 修复完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 访问应用: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 查看实时日志:" -ForegroundColor Yellow
Write-Host "   docker logs -f proxy-pool" -ForegroundColor White
Write-Host ""
Write-Host "🔍 验证 mihomo 文件:" -ForegroundColor Yellow
Write-Host "   docker exec proxy-pool ls -la /app/bin/mihomo" -ForegroundColor White
Write-Host "   docker exec proxy-pool /app/bin/mihomo -v" -ForegroundColor White
Write-Host ""
Write-Host "现在可以测试扫描功能了！" -ForegroundColor Green
Write-Host ""
