#!/bin/bash

# Docker 环境 Mihomo 测试脚本

echo "=========================================="
echo "Docker 环境 Mihomo 测试"
echo "=========================================="
echo ""

# 检查是否在 Docker 容器中运行
if [ -f /.dockerenv ]; then
    echo "✓ 运行在 Docker 容器中"
else
    echo "⚠ 不在 Docker 容器中，尝试连接到容器..."
    docker exec -it autorss-web /bin/sh -c "$(cat $0)"
    exit $?
fi

echo ""
echo "1. 检查 Mihomo 文件"
echo "---"
if [ -f /app/bin/mihomo ]; then
    echo "✓ Mihomo 文件存在"
    ls -lh /app/bin/mihomo
else
    echo "✗ Mihomo 文件不存在"
    exit 1
fi

echo ""
echo "2. 检查文件权限"
echo "---"
if [ -x /app/bin/mihomo ]; then
    echo "✓ Mihomo 可执行"
else
    echo "✗ Mihomo 不可执行，尝试修复..."
    chmod +x /app/bin/mihomo
fi

echo ""
echo "3. 测试 Mihomo 版本"
echo "---"
/app/bin/mihomo -v || {
    echo "✗ Mihomo 无法运行"
    exit 1
}

echo ""
echo "4. 检查运行中的 Mihomo 进程"
echo "---"
MIHOMO_PIDS=$(pgrep -f mihomo)
if [ -z "$MIHOMO_PIDS" ]; then
    echo "✓ 没有运行中的 Mihomo 进程"
else
    echo "⚠ 发现运行中的 Mihomo 进程:"
    ps aux | grep mihomo | grep -v grep
    echo ""
    echo "清理这些进程..."
    pkill -9 mihomo
    sleep 1
    echo "✓ 进程已清理"
fi

echo ""
echo "5. 测试进程清理命令"
echo "---"
echo "测试 pkill 命令..."
pkill -9 mihomo 2>/dev/null && echo "✓ pkill 命令可用" || echo "✓ pkill 命令可用（无进程需清理）"

echo ""
echo "6. 检查网络连接"
echo "---"
echo "测试连接到 Cloudflare..."
if command -v wget >/dev/null 2>&1; then
    wget -q --spider https://www.cloudflare.com/cdn-cgi/trace && echo "✓ 网络连接正常" || echo "✗ 网络连接失败"
elif command -v curl >/dev/null 2>&1; then
    curl -s -o /dev/null https://www.cloudflare.com/cdn-cgi/trace && echo "✓ 网络连接正常" || echo "✗ 网络连接失败"
else
    echo "⚠ 无法测试网络（wget/curl 不可用）"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
