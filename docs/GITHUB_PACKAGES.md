# GitHub Packages 自动构建与部署

本项目配置了 GitHub Actions，可以自动构建 Docker 镜像并推送到 GitHub Container Registry (ghcr.io)。

---

## 🚀 自动构建触发条件

GitHub Actions 会在以下情况自动构建并发布镜像：

1. **推送到主分支** (`main` 或 `master`)
2. **创建新标签** (例如 `v1.0.0`)
3. **Pull Request** 到主分支（仅构建不推送）
4. **手动触发** (在 Actions 页面)

---

## 📦 镜像地址

构建完成后，镜像会发布到：

```
ghcr.io/affadsense1/proxyscrape:latest
```

### 可用标签

| 标签 | 说明 | 示例 |
|------|------|------|
| `latest` | 最新的主分支构建 | `ghcr.io/affadsense1/proxyscrape:latest` |
| `main` | main 分支最新构建 | `ghcr.io/affadsense1/proxyscrape:main` |
| `v1.0.0` | 特定版本标签 | `ghcr.io/affadsense1/proxyscrape:v1.0.0` |
| `main-abc1234` | 特定提交的 SHA | `ghcr.io/affadsense1/proxyscrape:main-387d347` |

---

## 🔧 首次配置步骤

### 1. 启用 GitHub Packages

确保你的 GitHub 仓库已启用 Packages：

1. 进入仓库 **Settings** → **Actions** → **General**
2. 在 **Workflow permissions** 中选择 **Read and write permissions**
3. 勾选 **Allow GitHub Actions to create and approve pull requests**

### 2. 推送代码触发构建

```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

### 3. 查看构建状态

1. 进入仓库的 **Actions** 标签页
2. 查看 "Build and Push Docker Image" 工作流
3. 等待构建完成（约 5-10 分钟）

### 4. 查看发布的镜像

1. 进入仓库主页
2. 点击右侧 **Packages**
3. 查看 `autorss-web` 镜像

---

## 🐳 使用 GitHub Packages 镜像

### 方法一：使用预配置的 docker-compose（推荐）

```bash
# 1. 下载 docker-compose 配置文件
wget https://raw.githubusercontent.com/affadsense1/proxyscrape/main/docker-compose.ghcr.yml

# 2. 启动容器
docker-compose -f docker-compose.ghcr.yml up -d

# 3. 查看日志
docker-compose -f docker-compose.ghcr.yml logs -f
```

### 方法二：直接拉取镜像

```bash
# 拉取最新镜像
docker pull ghcr.io/affadsense1/proxyscrape:latest

# 运行容器
docker run -d \
  --name proxyscrape \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/bin:/app/bin \
  --restart unless-stopped \
  ghcr.io/affadsense1/proxyscrape:latest
```

### 方法三：指定特定版本

```bash
# 拉取特定提交版本
docker pull ghcr.io/affadsense1/proxyscrape:main-387d347

# 使用特定版本
docker run -d \
  --name proxyscrape \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/bin:/app/bin \
  --restart unless-stopped \
  ghcr.io/affadsense1/proxyscrape:main-387d347
```

---

## 🔐 私有镜像访问

如果镜像是私有的，需要先登录：

### 生成 Personal Access Token (PAT)

1. GitHub 头像 → **Settings** → **Developer settings**
2. **Personal access tokens** → **Tokens (classic)**
3. **Generate new token** → 勾选 `read:packages` 和 `write:packages`
4. 复制生成的 token

### 登录 Docker

```bash
# 使用 PAT 登录
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR-USERNAME --password-stdin

# 验证登录
docker pull ghcr.io/YOUR-USERNAME/autorss-web:latest
```

### 服务器上配置

```bash
# 保存凭证
cat <<EOF > ~/.docker/config.json
{
  "auths": {
    "ghcr.io": {
      "auth": "$(echo -n 'YOUR-USERNAME:YOUR-TOKEN' | base64)"
    }
  }
}
EOF

# 拉取镜像
docker-compose -f docker-compose.ghcr.yml pull
docker-compose -f docker-compose.ghcr.yml up -d
```

---

## 🏷️ 版本发布流程

### 创建新版本

```bash
# 1. 更新代码
git add .
git commit -m "Release v1.0.0"

# 2. 创建标签
git tag v1.0.0

# 3. 推送标签（自动触发构建）
git push origin v1.0.0
git push origin main
```

### 自动生成的镜像标签

推送 `v1.0.0` 后，会自动生成：
- `ghcr.io/YOUR-USERNAME/autorss-web:v1.0.0`
- `ghcr.io/YOUR-USERNAME/autorss-web:1.0`
- `ghcr.io/YOUR-USERNAME/autorss-web:1`
- `ghcr.io/YOUR-USERNAME/autorss-web:latest`

---

## 📊 查看镜像信息

### 在 GitHub 上查看

1. 仓库页面 → **Packages**
2. 点击 `autorss-web`
3. 查看所有版本和大小

### 命令行查看

```bash
# 查看本地镜像
docker images | grep autorss-web

# 查看镜像详情
docker inspect ghcr.io/YOUR-USERNAME/autorss-web:latest
```

---

## 🔄 更新镜像

### 拉取最新版本

```bash
# 停止容器
docker-compose -f docker-compose.ghcr.yml down

# 拉取最新镜像
docker-compose -f docker-compose.ghcr.yml pull

# 重新启动
docker-compose -f docker-compose.ghcr.yml up -d

# 清理旧镜像
docker image prune -f
```

### 自动更新脚本

创建 `update.sh`：

```bash
#!/bin/bash
echo "🔄 更新 AutoRSS 镜像..."
docker-compose -f docker-compose.ghcr.yml pull
docker-compose -f docker-compose.ghcr.yml up -d
docker image prune -f
echo "✅ 更新完成！"
```

---

## 🐛 故障排查

### 构建失败

**查看构建日志**：
1. GitHub 仓库 → **Actions**
2. 点击失败的工作流
3. 查看详细日志

**常见问题**：

| 错误 | 解决方案 |
|------|---------|
| `Permission denied` | 检查仓库 Actions 权限设置 |
| `GITHUB_TOKEN` 无权限 | 启用 Read/Write 权限 |
| Dockerfile 错误 | 本地测试 `docker build .` |

### 无法拉取镜像

```bash
# 检查镜像是否存在
docker manifest inspect ghcr.io/YOUR-USERNAME/autorss-web:latest

# 检查登录状态
docker login ghcr.io

# 查看镜像可见性
# GitHub 仓库 → Packages → 镜像设置 → Change visibility
```

### 镜像拉取慢

使用镜像加速（中国大陆）：

```bash
# 配置 Docker 镜像加速
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://mirror.gcr.io"
  ]
}
EOF

sudo systemctl restart docker
```

---

## 🌟 最佳实践

### 1. 使用特定版本而非 latest

```yaml
# ❌ 不推荐
image: ghcr.io/YOUR-USERNAME/autorss-web:latest

# ✅ 推荐
image: ghcr.io/YOUR-USERNAME/autorss-web:v1.0.0
```

### 2. 定期清理旧镜像

```bash
# 清理未使用的镜像
docker image prune -a

# 清理构建缓存
docker builder prune
```

### 3. 设置自动更新（Watchtower）

```yaml
# docker-compose.yml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_POLL_INTERVAL=86400  # 每天检查
```

### 4. 监控镜像大小

优化 Dockerfile，减小镜像体积：
- 使用多阶段构建 ✅
- 使用 alpine 基础镜像 ✅
- 清理不必要的文件 ✅

---

## 📚 相关链接

- [GitHub Packages 文档](https://docs.github.com/en/packages)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker Hub vs GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

## 🆘 获取帮助

如果遇到问题：

1. 查看 [GitHub Actions 日志](#构建失败)
2. 查看 [Issues](https://github.com/YOUR-USERNAME/autorss-web/issues)
3. 提交新 Issue 附带完整日志
