#!/bin/bash

# Docker 多架构构建脚本

set -e

echo "=========================================="
echo "Docker 多架构构建"
echo "=========================================="
echo ""

# 检查 Docker Buildx
if ! docker buildx version &> /dev/null; then
    echo "❌ Docker Buildx 未安装"
    echo "   请升级到 Docker 19.03 或更高版本"
    exit 1
fi

echo "✓ Docker Buildx 已安装"

# 创建 builder（如果不存在）
if ! docker buildx ls | grep -q multiarch; then
    echo ""
    echo "创建多架构 builder..."
    docker buildx create --name multiarch --driver docker-container --use
    docker buildx inspect --bootstrap
else
    echo "✓ 多架构 builder 已存在"
    docker buildx use multiarch
fi

echo ""
echo "选择构建选项:"
echo "1. 仅构建当前架构（快速测试）"
echo "2. 构建多架构（amd64 + arm64）"
echo "3. 构建并推送到 GitHub Container Registry"
echo ""
read -p "请选择 [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "构建当前架构..."
        docker buildx build \
            --platform linux/$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') \
            --load \
            -t proxyscrape:local \
            .
        echo ""
        echo "✅ 构建完成！"
        echo "   镜像: proxyscrape:local"
        echo ""
        echo "运行测试:"
        echo "   docker run --rm proxyscrape:local /app/bin/mihomo -v"
        ;;
    2)
        echo ""
        echo "构建多架构镜像..."
        docker buildx build \
            --platform linux/amd64,linux/arm64 \
            -t proxyscrape:multiarch \
            .
        echo ""
        echo "✅ 构建完成！"
        echo "   注意: 多架构镜像无法直接加载到本地"
        echo "   如需测试，请使用选项 1 或 3"
        ;;
    3)
        echo ""
        read -p "GitHub 用户名: " GITHUB_USER
        read -p "镜像名称 [proxyscrape]: " IMAGE_NAME
        IMAGE_NAME=${IMAGE_NAME:-proxyscrape}
        read -p "标签 [latest]: " TAG
        TAG=${TAG:-latest}
        
        echo ""
        echo "构建并推送到 ghcr.io/${GITHUB_USER}/${IMAGE_NAME}:${TAG}..."
        
        # 检查是否已登录
        if ! docker info 2>/dev/null | grep -q "ghcr.io"; then
            echo ""
            echo "请先登录 GitHub Container Registry:"
            echo "   echo \$GITHUB_TOKEN | docker login ghcr.io -u ${GITHUB_USER} --password-stdin"
            echo ""
            read -p "按 Enter 继续（如果已登录）或 Ctrl+C 取消..."
        fi
        
        docker buildx build \
            --platform linux/amd64,linux/arm64 \
            --push \
            -t ghcr.io/${GITHUB_USER}/${IMAGE_NAME}:${TAG} \
            .
        
        echo ""
        echo "✅ 构建并推送完成！"
        echo "   镜像: ghcr.io/${GITHUB_USER}/${IMAGE_NAME}:${TAG}"
        echo ""
        echo "拉取镜像:"
        echo "   docker pull ghcr.io/${GITHUB_USER}/${IMAGE_NAME}:${TAG}"
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac

echo ""
echo "🎉 完成！"
