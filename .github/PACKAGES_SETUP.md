# ✅ GitHub Packages 自动构建配置完成

## 📦 已创建的文件

1. **`.github/workflows/docker-build.yml`** - GitHub Actions 自动构建工作流
2. **`docker-compose.ghcr.yml`** - 使用 GitHub Packages 镜像的配置
3. **`GITHUB_PACKAGES.md`** - 完整使用文档
4. **`setup-ghcr.sh`** - 快速配置脚本

## 🚀 使用步骤

### 1. 推送代码到 GitHub

```bash
git add .
git commit -m "Add GitHub Actions for Docker build"
git push origin main
```

### 2. 启用 GitHub Actions 权限

1. 进入 GitHub 仓库 **Settings** → **Actions** → **General**
2. **Workflow permissions** 选择 **Read and write permissions**
3. 保存

### 3. 自动构建

推送后会自动触发构建，5-10分钟后镜像发布到：
```
ghcr.io/YOUR-USERNAME/autorss-web:latest
```

### 4. 使用预构建镜像

```bash
# 配置脚本
chmod +x setup-ghcr.sh
./setup-ghcr.sh

# 拉取镜像
docker-compose -f docker-compose.ghcr.yml pull

# 启动
docker-compose -f docker-compose.ghcr.yml up -d
```

## 🎯 功能特性

✅ **自动构建**: 推送代码自动构建镜像
✅ **多平台支持**: linux/amd64 + linux/arm64
✅ **版本管理**: 支持语义化版本标签
✅ **构建缓存**: GitHub Actions 缓存加速
✅ **多架构**: 支持 ARM 和 x86

## 📖 详细文档

查看 [GITHUB_PACKAGES.md](./GITHUB_PACKAGES.md) 了解：
- 如何配置私有镜像访问
- 如何创建版本标签
- 故障排查指南
