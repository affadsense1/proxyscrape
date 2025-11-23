# 修复 Docker 数据目录权限 (Windows)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "修复 Docker 数据目录权限" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 创建目录
Write-Host "创建数据目录..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "data" | Out-Null
New-Item -ItemType Directory -Force -Path "bin" | Out-Null

# 在 Windows 上，Docker Desktop 会自动处理权限映射
# 但我们需要确保目录存在且可写

Write-Host "设置目录权限..." -ForegroundColor Yellow

try {
    # 测试写入权限
    $testFile = "data\.permission_test"
    "test" | Out-File -FilePath $testFile -ErrorAction Stop
    Remove-Item $testFile -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "✓ 权限检查通过！" -ForegroundColor Green
    Write-Host ""
    Write-Host "目录已创建:"
    Get-ChildItem -Directory | Where-Object { $_.Name -eq "data" -or $_.Name -eq "bin" } | Format-Table Name, LastWriteTime
    
    Write-Host ""
    Write-Host "现在可以启动容器了:" -ForegroundColor Green
    Write-Host "  docker-compose up -d" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "✗ 权限检查失败！" -ForegroundColor Red
    Write-Host ""
    Write-Host "请确保:" -ForegroundColor Yellow
    Write-Host "  1. Docker Desktop 正在运行" -ForegroundColor White
    Write-Host "  2. 当前目录在 Docker Desktop 的文件共享设置中" -ForegroundColor White
    Write-Host "  3. 以管理员身份运行 PowerShell" -ForegroundColor White
    Write-Host ""
    Write-Host "Docker Desktop 设置:" -ForegroundColor Yellow
    Write-Host "  Settings -> Resources -> File Sharing" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
