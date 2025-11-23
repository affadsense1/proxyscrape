# 清理所有 mihomo.exe 进程
Write-Host "正在查找 mihomo.exe 进程..." -ForegroundColor Yellow

$processes = Get-Process -Name "mihomo" -ErrorAction SilentlyContinue

if ($processes) {
    Write-Host "找到 $($processes.Count) 个 mihomo.exe 进程" -ForegroundColor Cyan
    
    foreach ($proc in $processes) {
        Write-Host "终止进程 PID: $($proc.Id)" -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    
    Start-Sleep -Milliseconds 500
    
    # 验证是否清理成功
    $remaining = Get-Process -Name "mihomo" -ErrorAction SilentlyContinue
    if ($remaining) {
        Write-Host "警告: 仍有 $($remaining.Count) 个进程未能终止" -ForegroundColor Red
    } else {
        Write-Host "✓ 所有 mihomo.exe 进程已清理" -ForegroundColor Green
    }
} else {
    Write-Host "✓ 没有找到 mihomo.exe 进程" -ForegroundColor Green
}

Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
