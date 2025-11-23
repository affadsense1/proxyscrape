#!/bin/bash

# GitHub Packages 快速配置脚本

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  GitHub Packages 配置向导${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 获取 GitHub 用户名
read -p "请输入你的 GitHub 用户名: " GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo -e "${RED}❌ 用户名不能为空${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}📝 配置信息：${NC}"
echo -e "  GitHub 用户名: ${BLUE}$GITHUB_USERNAME${NC}"
echo -e "  镜像地址: ${BLUE}ghcr.io/$GITHUB_USERNAME/autorss-web${NC}"
echo ""

# 更新 docker-compose.ghcr.yml
echo -e "${GREEN}🔧 更新 docker-compose.ghcr.yml...${NC}"
sed -i "s/your-username/$GITHUB_USERNAME/g" docker-compose.ghcr.yml
echo -e "${GREEN}✅ 配置文件已更新${NC}"
echo ""

# 询问是否需要登录
read -p "是否需要登录 GitHub Container Registry? (镜像私有时需要) [y/N]: " LOGIN_CHOICE

if [[ "$LOGIN_CHOICE" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}📌 需要 GitHub Personal Access Token (PAT)${NC}"
    echo -e "${YELLOW}   生成地址: https://github.com/settings/tokens${NC}"
    echo -e "${YELLOW}   需要权限: read:packages, write:packages${NC}"
    echo ""
    read -sp "请输入你的 GitHub Token: " GITHUB_TOKEN
    echo ""
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${RED}❌ Token 不能为空${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}🔐 登录到 ghcr.io...${NC}"
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USERNAME" --password-stdin
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 登录成功${NC}"
    else
        echo -e "${RED}❌ 登录失败，请检查 Token 是否正确${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 配置完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "下一步操作："
echo -e "  1. ${BLUE}docker-compose -f docker-compose.ghcr.yml pull${NC}"
echo -e "  2. ${BLUE}docker-compose -f docker-compose.ghcr.yml up -d${NC}"
echo -e "  3. 访问 ${BLUE}http://localhost:3000${NC}"
echo ""
echo -e "完整文档: ${BLUE}GITHUB_PACKAGES.md${NC}"
echo ""
