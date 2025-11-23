#!/bin/bash

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}  AutoRSS Docker 快速启动脚本${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 检查 docker-compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose 未安装，请先安装 docker-compose${NC}"
    exit 1
fi

# 创建必要的目录
echo -e "${GREEN}📁 创建数据目录...${NC}"
mkdir -p data bin

# 如果 bin 目录为空，下载 Clash Core
if [ ! -f "bin/mihomo" ]; then
    echo -e "${GREEN}⬇️  下载 Clash Core...${NC}"
    curl -L -o mihomo.gz https://github.com/MetaCubeX/mihomo/releases/download/v1.18.10/mihomo-linux-amd64-v1.18.10.gz
    gunzip mihomo.gz
    mv mihomo bin/mihomo
    chmod +x bin/mihomo
    echo -e "${GREEN}✅ Clash Core 下载完成${NC}"
fi

# 构建并启动容器
echo -e "${GREEN}🚀 构建并启动 Docker 容器...${NC}"
docker-compose up -d --build

# 等待容器启动
echo -e "${GREEN}⏳ 等待服务启动...${NC}"
sleep 5

# 检查容器状态
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo -e "${GREEN}==================================${NC}"
    echo -e "${GREEN}✅ 部署成功！${NC}"
    echo -e "${GREEN}==================================${NC}"
    echo ""
    echo -e "📍 访问地址: ${BLUE}http://localhost:3000${NC}"
    echo -e "🔑 默认密码: ${BLUE}affadsense${NC}"
    echo ""
    echo -e "常用命令:"
    echo -e "  查看日志: ${BLUE}docker-compose logs -f${NC}"
    echo -e "  停止服务: ${BLUE}docker-compose stop${NC}"
    echo -e "  重启服务: ${BLUE}docker-compose restart${NC}"
    echo ""
else
    echo -e "${RED}❌ 容器启动失败，请查看日志${NC}"
    docker-compose logs
    exit 1
fi
