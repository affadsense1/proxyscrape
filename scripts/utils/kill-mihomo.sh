#!/bin/bash

# 清理所有 mihomo 进程

echo "正在查找 mihomo 进程..."

# 查找进程
PIDS=$(pgrep -f mihomo)

if [ -z "$PIDS" ]; then
    echo "✓ 没有找到 mihomo 进程"
else
    echo "找到以下 mihomo 进程:"
    ps aux | grep mihomo | grep -v grep
    
    echo ""
    echo "正在终止进程..."
    
    # 强制终止所有 mihomo 进程
    pkill -9 mihomo
    
    sleep 0.5
    
    # 验证是否清理成功
    REMAINING=$(pgrep -f mihomo)
    if [ -z "$REMAINING" ]; then
        echo "✓ 所有 mihomo 进程已清理"
    else
        echo "警告: 仍有进程未能终止"
        ps aux | grep mihomo | grep -v grep
    fi
fi

echo ""
echo "按 Enter 键退出..."
read
