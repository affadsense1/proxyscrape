#!/bin/bash

# 快速重建 Docker 镜像并测试
set -e

echo "🔨 开始构建 Docker 镜像..."
docker build -t proxy-pool:test .

echo ""
echo "✅ 构建完成！"
echo ""
echo "🔍 验证 mihomo 二进制文件..."
docker run --rm proxy-pool:test ls -lh /app/bin/mihomo

echo ""
echo "📦 测试 mihomo 版本..."
docker run --rm proxy-pool:test /app/bin/mihomo -v

echo ""
echo "✅ 所有验证通过！"
echo ""
echo "🚀 启动容器测试："
echo "   docker run -d -p 3000:3000 --name proxy-pool-test proxy-pool:test"
echo ""
echo "📋 查看日志："
echo "   docker logs -f proxy-pool-test"
echo ""
echo "🛑 停止并删除："
echo "   docker stop proxy-pool-test && docker rm proxy-pool-test"
