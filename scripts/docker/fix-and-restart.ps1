#!/usr/bin/env pwsh
# Docker Clash Core 修复和重启脚本

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Docker Clash Core 修复和重启" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 检查 Docker 是否运行
Write-Host "📋 步骤 1: 检查 Docker 状态..." -ForegroundColor Yellow
try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker 正在运行 (版本: $dockerVersion)" -ForegroundColor Green
    } else {
        throw "Docker 未运行"
    }
} catch {
    Write-Host "❌ Docker 未运行！" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先启动 Docker Desktop，然后重新运行此脚本。" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "启动 Docker Desktop 后，运行：" -ForegroundColor Cyan
    Write-Host "  .\fix-and-restart.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""

# 步骤 2: 停止并删除旧容器
Write-Host "📋 步骤 2: 停止旧容器..." -ForegroundColor Yellow
try {
    $containers = docker ps -a --filter "name=proxy-pool" --format "{{.Names}}"
    if ($containers) {
        Write-Host "停止容器: $containers" -ForegroundColor Gray
        docker stop $containers 2>$null | Out-Null
        docker rm $containers 2>$null | Out-Null
        Write-Host "✅ 旧容器已删除" -ForegroundColor Green
    } else {
        Write-Host "✅ 没有旧容器需要删除" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  删除旧容器时出错: $_" -ForegroundColor Yellow
}

Write-Host ""

# 步骤 3: 删除旧镜像
Write-Host "📋 步骤 3: 删除旧镜像..." -ForegroundColor Yellow
try {
    $images = docker images --filter "reference=proxy-pool" --format "{{.Repository}}:{{.Tag}}"
    if ($images) {
        Write-Host "删除镜像: $images" -ForegroundColor Gray
        docker rmi -f $images 2>$null | Out-Null
        Write-Host "✅ 旧镜像已删除" -ForegroundColor Green
    } else {
        Write-Host "✅ 没有旧镜像需要删除" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  删除旧镜像时出错: $_" -ForegroundColor Yellow
}

Write-Host ""

# 步骤 4: 构建新镜像
Write-Host "📋 步骤 4: 构建新镜像（这可能需要几分钟）..." -ForegroundColor Yellow
Write-Host ""

try {
    docker build -t proxy-pool:latest .
    if ($LASTEXITCODE -ne 0) {
        throw "构建失败"
    }
    Write-Host ""
    Write-Host "✅ 镜像构建成功" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ 镜像构建失败！" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查构建日志中的错误信息。" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""

# 步骤 5: 验证 mihomo 文件
Write-Host "📋 步骤 5: 验证 mihomo 文件..." -ForegroundColor Yellow
try {
    Write-Host "检查文件是否存在..." -ForegroundColor Gray
    $fileCheck = docker run --rm proxy-pool:latest ls -la /app/bin/mihomo 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host $fileCheck -ForegroundColor Gray
        Write-Host "✅ mihomo 文件存在" -ForegroundColor Green
    } else {
        throw "文件不存在"
    }
    
    Write-Host ""
    Write-Host "测试 mihomo 版本..." -ForegroundColor Gray
    $versionCheck = docker run --rm proxy-pool:latest /app/bin/mihomo -v 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host $versionCheck -ForegroundColor Gray
        Write-Host "✅ mihomo 可执行" -ForegroundColor Green
    } else {
        throw "文件不可执行"
    }
} catch {
    Write-Host ""
    Write-Host "❌ mihomo 验证失败: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "镜像构建可能有问题，请检查 Dockerfile。" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""

# 步骤 6: 启动新容器
Write-Host "📋 步骤 6: 启动新容器..." -ForegroundColor Yellow

$dataPath = Join-Path $PSScriptRoot "data"
if (-not (Test-Path $dataPath)) {
    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
    Write-Host "创建数据目录: $dataPath" -ForegroundColor Gray
}

try {
    docker run -d `
        -p 3000:3000 `
        -v "${dataPath}:/app/data" `
        --name proxy-pool `
        proxy-pool:latest
    
    if ($LASTEXITCODE -ne 0) {
        throw "启动失败"
    }
    
    Write-Host "✅ 容器启动成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 容器启动失败: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host ""

# 步骤 7: 等待容器启动
Write-Host "📋 步骤 7: 等待容器启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 步骤 8: 显示启动日志
Write-Host ""
Write-Host "📋 步骤 8: 容器启动日志（最近 30 行）..." -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
docker logs --tail 30 proxy-pool
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
Write-Host "🔍 检查 mihomo 文件:" -ForegroundColor Yellow
Write-Host "   docker exec proxy-pool ls -la /app/bin/mihomo" -ForegroundColor White
Write-Host ""
Write-Host "🛑 停止容器:" -ForegroundColor Yellow
Write-Host "   docker stop proxy-pool" -ForegroundColor White
Write-Host ""
Write-Host "🔄 重启容器:" -ForegroundColor Yellow
Write-Host "   docker restart proxy-pool" -ForegroundColor White
Write-Host ""
