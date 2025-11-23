#!/usr/bin/env pwsh
# 快速检查 Docker 和容器状态

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Docker 状态检查" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker
Write-Host "1️⃣  Docker 状态:" -ForegroundColor Yellow
try {
    $version = docker version --format '{{.Server.Version}}' 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Docker 正在运行 (版本: $version)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Docker 未运行" -ForegroundColor Red
        Write-Host ""
        Write-Host "   请启动 Docker Desktop" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
} catch {
    Write-Host "   ❌ Docker 未安装或未运行" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host ""

# 检查镜像
Write-Host "2️⃣  Docker 镜像:" -ForegroundColor Yellow
$images = docker images proxy-pool --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
if ($images) {
    Write-Host $images -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  没有找到 proxy-pool 镜像" -ForegroundColor Yellow
    Write-Host "   需要构建镜像" -ForegroundColor Gray
}

Write-Host ""

# 检查容器
Write-Host "3️⃣  Docker 容器:" -ForegroundColor Yellow
$containers = docker ps -a --filter "name=proxy-pool" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
if ($containers) {
    Write-Host $containers -ForegroundColor Gray
    
    # 检查容器是否运行
    $running = docker ps --filter "name=proxy-pool" --format "{{.Names}}"
    if ($running) {
        Write-Host ""
        Write-Host "   ✅ 容器正在运行" -ForegroundColor Green
        
        # 检查 mihomo 文件
        Write-Host ""
        Write-Host "4️⃣  检查 mihomo 文件:" -ForegroundColor Yellow
        try {
            $fileCheck = docker exec proxy-pool ls -la /app/bin/mihomo 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ mihomo 文件存在" -ForegroundColor Green
                Write-Host "   $fileCheck" -ForegroundColor Gray
                
                # 测试版本
                Write-Host ""
                Write-Host "5️⃣  测试 mihomo 版本:" -ForegroundColor Yellow
                $versionCheck = docker exec proxy-pool /app/bin/mihomo -v 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "   ✅ mihomo 可执行" -ForegroundColor Green
                    Write-Host "   $versionCheck" -ForegroundColor Gray
                } else {
                    Write-Host "   ❌ mihomo 不可执行" -ForegroundColor Red
                    Write-Host "   $versionCheck" -ForegroundColor Gray
                }
            } else {
                Write-Host "   ❌ mihomo 文件不存在" -ForegroundColor Red
                Write-Host "   $fileCheck" -ForegroundColor Gray
                Write-Host ""
                Write-Host "   🔧 需要重新构建镜像！" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ❌ 无法检查文件: $_" -ForegroundColor Red
        }
        
        # 显示最近日志
        Write-Host ""
        Write-Host "6️⃣  最近日志（最后 10 行）:" -ForegroundColor Yellow
        Write-Host "   ----------------------------------------" -ForegroundColor Gray
        docker logs --tail 10 proxy-pool 2>&1 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
        Write-Host "   ----------------------------------------" -ForegroundColor Gray
        
    } else {
        Write-Host ""
        Write-Host "   ⚠️  容器已停止" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  没有找到 proxy-pool 容器" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  建议操作" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 根据状态给出建议
$needRebuild = $false
try {
    $fileExists = docker exec proxy-pool test -f /app/bin/mihomo 2>$null
    if ($LASTEXITCODE -ne 0) {
        $needRebuild = $true
    }
} catch {
    $needRebuild = $true
}

if ($needRebuild) {
    Write-Host "❌ 检测到问题：mihomo 文件缺失" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 运行修复脚本：" -ForegroundColor Yellow
    Write-Host "   .\fix-and-restart.ps1" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "✅ 一切正常！" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 访问应用: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 查看实时日志:" -ForegroundColor Yellow
    Write-Host "   docker logs -f proxy-pool" -ForegroundColor White
    Write-Host ""
}
