$ErrorActionPreference = "Stop"

$binDir = Join-Path $PSScriptRoot "bin"

Write-Host ""
Write-Host "Mihomo Core Downloader (Windows + Linux)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir | Out-Null
}

$version = "v1.18.10"

# 下载 Windows 版本
$winTarget = Join-Path $binDir "mihomo.exe"
if (Test-Path $winTarget) {
    Write-Host "[OK] Windows version already exists" -ForegroundColor Green
} else {
    $winUrl = "https://github.com/MetaCubeX/mihomo/releases/download/$version/mihomo-windows-amd64-$version.zip"
    $winZip = Join-Path $binDir "mihomo-win.zip"
    
    Write-Host "Downloading Windows version..." -ForegroundColor Yellow
    
    try {
        $client = New-Object System.Net.WebClient
        $client.DownloadFile($winUrl, $winZip)
        
        Expand-Archive -Path $winZip -DestinationPath $binDir -Force
        
        $exe = Get-ChildItem -Path $binDir -Filter "*.exe" | Where-Object { $_.Name -ne "mihomo.exe" } | Select-Object -First 1
        if ($exe) {
            Rename-Item -Path $exe.FullName -NewName "mihomo.exe" -Force
        }
        
        Remove-Item -Path $winZip -Force
        
        Write-Host "[OK] Windows version installed: $winTarget" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Windows download failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 下载 Linux 版本
$linuxTarget = Join-Path $binDir "mihomo"
if (Test-Path $linuxTarget) {
    Write-Host "[OK] Linux version already exists" -ForegroundColor Green
} else {
    $linuxUrl = "https://github.com/MetaCubeX/mihomo/releases/download/$version/mihomo-linux-amd64-$version.gz"
    $linuxGz = Join-Path $binDir "mihomo-linux.gz"
    
    Write-Host "Downloading Linux version..." -ForegroundColor Yellow
    
    try {
        $client = New-Object System.Net.WebClient
        $client.DownloadFile($linuxUrl, $linuxGz)
        
        # 解压 .gz (PowerShell 没有内置的 gunzip，需要特殊处理)
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $inFile = [System.IO.File]::OpenRead($linuxGz)
        $gzStream = New-Object System.IO.Compression.GZipStream($inFile, [System.IO.Compression.CompressionMode]::Decompress)
        $outFile = [System.IO.File]::Create($linuxTarget)
        $gzStream.CopyTo($outFile)
        $outFile.Close()
        $gzStream.Close()
        $inFile.Close()
        
        Remove-Item -Path $linuxGz -Force
        
        Write-Host "[OK] Linux version installed: $linuxTarget" -ForegroundColor Green
        Write-Host "    Note: Remember to chmod +x on Linux system" -ForegroundColor Yellow
    } catch {
        Write-Host "[ERROR] Linux download failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Windows: $(if (Test-Path $winTarget) { 'OK' } else { 'Missing' })" -ForegroundColor $(if (Test-Path $winTarget) { 'Green' } else { 'Red' })
Write-Host "  Linux:   $(if (Test-Path $linuxTarget) { 'OK' } else { 'Missing' })" -ForegroundColor $(if (Test-Path $linuxTarget) { 'Green' } else { 'Red' })
Write-Host ""
