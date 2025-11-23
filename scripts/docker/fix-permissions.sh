#!/bin/bash

# 修复 Docker 数据目录权限

echo "=========================================="
echo "修复 Docker 数据目录权限"
echo "=========================================="
echo ""

# 创建目录
echo "创建数据目录..."
mkdir -p data bin

# 设置权限
echo "设置权限..."
# UID 1001 是容器中 nextjs 用户的 ID
sudo chown -R 1001:1001 data bin
sudo chmod -R 755 data bin

echo ""
echo "✅ 权限修复完成！"
echo ""
echo "目录权限:"
ls -la data bin

echo ""
echo "现在可以启动容器了:"
echo "  docker-compose up -d"
