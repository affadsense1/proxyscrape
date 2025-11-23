#!/bin/bash

# ProxyScrape 快速启动脚本
# 使用 GitHub Container Registry 预构建镜像

set -e

echo "=========================================="
echo "ProxyScrape 快速启动"
echo "=========================================="
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    echo "   访问: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✓ Docker 已安装"

# 检查 docker-compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  docker-compose 未安装，将使用 docker run 方式"
    USE_COMPOSE=false
else
    echo "✓ docker-compose 已安装"
    USE_COMPOSE=true
fi

echo ""
echo "拉取最新镜像..."
docker pull ghcr.io/affadsense1/proxyscrape:latest

echo ""
echo "创建数据目录..."
mkdir -p data bin

echo ""
echo "设置目录权限..."
# 尝试设置权限（容器中的 nextjs 用户 UID 是 1001）
if [ "$(id -u)" -eq 0 ]; then
    # 以 root 运行
    chown -R 1001:1001 data bin
    chmod -R 755 data bin
    echo "✓ 权限已设置"
else
    # 非 root 用户
    if sudo -n true 2>/dev/null; then
        # 有 sudo 权限且无需密码
        sudo chown -R 1001:1001 data bin
        sudo chmod -R 755 data bin
        echo "✓ 权限已设置"
    else
        # 需要密码或没有 sudo
        echo "⚠️  需要 sudo 权限来设置目录权限"
        echo "   请输入密码，或按 Ctrl+C 取消"
        sudo chown -R 1001:1001 data bin 2>/dev/null || {
            echo "⚠️  无法设置权限，容器可能无法写入数据"
            echo "   如果遇到权限错误，请手动运行:"
            echo "   sudo chown -R 1001:1001 data bin"
        }
    fi
fi

if [ "$USE_COMPOSE" = true ]; then
    echo ""
    echo "使用 docker-compose 启动..."
    
    # 创建 docker-compose.yml
    cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  proxyscrape:
    image: ghcr.io/affadsense1/proxyscrape:latest
    container_name: proxyscrape
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./bin:/app/bin
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
    restart: unless-stopped
EOF

    docker-compose up -d
    
    echo ""
    echo "=========================================="
    echo "✅ 启动成功！"
    echo "=========================================="
    echo ""
    echo "访问地址: http://localhost:3000"
    echo "默认密码: affadsense"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker-compose logs -f"
    echo "  停止服务: docker-compose stop"
    echo "  重启服务: docker-compose restart"
    echo "  完全删除: docker-compose down"
    echo ""
else
    echo ""
    echo "使用 docker run 启动..."
    
    docker run -d \
      --name proxyscrape \
      -p 3000:3000 \
      -v "$(pwd)/data:/app/data" \
      -v "$(pwd)/bin:/app/bin" \
      -e NODE_ENV=production \
      -e TZ=Asia/Shanghai \
      --restart unless-stopped \
      ghcr.io/affadsense1/proxyscrape:latest
    
    echo ""
    echo "=========================================="
    echo "✅ 启动成功！"
    echo "=========================================="
    echo ""
    echo "访问地址: http://localhost:3000"
    echo "默认密码: affadsense"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker logs -f proxyscrape"
    echo "  停止服务: docker stop proxyscrape"
    echo "  重启服务: docker restart proxyscrape"
    echo "  完全删除: docker rm -f proxyscrape"
    echo ""
fi

echo "数据目录: $(pwd)/data"
echo "Clash Core: $(pwd)/bin"
echo ""
echo "🎉 享受使用！"
