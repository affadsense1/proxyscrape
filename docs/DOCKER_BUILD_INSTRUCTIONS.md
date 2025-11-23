# Docker 构建和部署说明

## 前提条件

确保 Docker Desktop 正在运行：
```powershell
# 检查 Docker 是否运行
docker version

# 如果没有运行，启动 Docker Desktop
# Windows: 从开始菜单启动 "Docker Desktop"
```

## 快速构建和测试

### 方式 1: 使用自动化脚本（推荐）

```powershell
# Windows PowerShell
.\rebuild-docker.ps1
```

这个脚本会：
1. 构建新的 Docker 镜像
2. 验证 mihomo 二进制文件
3. 测试 mihomo 版本
4. 提供启动命令

### 方式 2: 手动构建

```powershell
# 1. 构建镜像
docker build -t proxy-pool:latest .

# 2. 验证 mihomo 文件存在
docker run --rm proxy-pool:latest ls -lh /app/bin/mihomo

# 3. 测试 mihomo 版本
docker run --rm proxy-pool:latest /app/bin/mihomo -v

# 4. 停止旧容器（如果存在）
docker stop proxy-pool
docker rm proxy-pool

# 5. 启动新容器
docker run -d `
  -p 3000:3000 `
  -v ${PWD}/data:/app/data `
  --name proxy-pool `
  proxy-pool:latest

# 6. 查看日志
docker logs -f proxy-pool
```

## 验证修复

启动容器后，查看日志应该看到：

```
[Startup] Mihomo binary found
-rwxr-xr-x    1 nextjs   nodejs      12.5M /app/bin/mihomo
```

然后访问 http://localhost:3000 并测试扫描功能。

扫描日志应该显示：

```
[Docker] 检测到 Docker 环境
[文件验证] 大小: 12.50 MB
[文件验证] 权限正常
[版本检测] Mihomo v1.18.10
启动 Clash Core (API Port: 15002)...
✅ Clash Core 启动成功 (版本: v1.18.10)
```

## 故障排查

### 问题 1: Docker 构建失败

**错误**: `ERROR: failed to build`

**解决方案**:
```powershell
# 清理 Docker 缓存
docker builder prune -a

# 重新构建（不使用缓存）
docker build --no-cache -t proxy-pool:latest .
```

### 问题 2: 仍然提示 "Clash Core 未找到"

**检查步骤**:

1. 验证 builder 阶段是否生成了文件：
```powershell
docker build --target builder -t proxy-pool:builder .
docker run --rm proxy-pool:builder ls -la /app/bin/
```

2. 验证 runner 阶段是否复制了文件：
```powershell
docker run --rm proxy-pool:latest ls -la /app/bin/
```

3. 检查文件权限：
```powershell
docker run --rm proxy-pool:latest stat /app/bin/mihomo
```

### 问题 3: Clash Core 启动超时

**查看详细日志**:
```powershell
docker logs -f proxy-pool
```

**进入容器调试**:
```powershell
docker exec -it proxy-pool sh

# 在容器内执行
ls -la /app/bin/mihomo
/app/bin/mihomo -v
ps aux | grep mihomo
netstat -tlnp | grep 15000
```

### 问题 4: 网络问题

如果在中国大陆，GitHub 下载可能很慢：

```powershell
# 使用代理构建
docker build `
  --build-arg HTTP_PROXY=http://your-proxy:port `
  --build-arg HTTPS_PROXY=http://your-proxy:port `
  -t proxy-pool:latest .
```

## Docker Compose 部署（推荐生产环境）

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  proxy-pool:
    build: .
    image: proxy-pool:latest
    container_name: proxy-pool
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    mem_limit: 1g
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
```

启动：
```powershell
docker-compose up -d
docker-compose logs -f
```

## 更新镜像

```powershell
# 1. 拉取最新代码
git pull

# 2. 重新构建
docker-compose build

# 3. 重启服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

## 清理旧镜像

```powershell
# 删除未使用的镜像
docker image prune -a

# 删除所有停止的容器
docker container prune

# 完整清理（谨慎使用）
docker system prune -a --volumes
```

## 性能优化

### 增加内存限制

如果处理大量节点（>1000），增加内存：

```powershell
docker run -d `
  -p 3000:3000 `
  -v ${PWD}/data:/app/data `
  --memory="2g" `
  --name proxy-pool `
  proxy-pool:latest
```

### 增加文件描述符限制

```powershell
docker run -d `
  -p 3000:3000 `
  -v ${PWD}/data:/app/data `
  --ulimit nofile=65536:65536 `
  --name proxy-pool `
  proxy-pool:latest
```

## 监控和日志

### 实时查看日志
```powershell
docker logs -f proxy-pool
```

### 查看最近 100 行日志
```powershell
docker logs --tail 100 proxy-pool
```

### 查看容器资源使用
```powershell
docker stats proxy-pool
```

### 导出日志到文件
```powershell
docker logs proxy-pool > proxy-pool.log 2>&1
```

## 备份和恢复

### 备份数据
```powershell
# 备份 data 目录
docker cp proxy-pool:/app/data ./backup-data-$(Get-Date -Format 'yyyyMMdd')
```

### 恢复数据
```powershell
# 恢复 data 目录
docker cp ./backup-data-20250123 proxy-pool:/app/data
docker restart proxy-pool
```

## 多架构支持

构建支持多架构的镜像（amd64, arm64）：

```powershell
# 创建 buildx builder
docker buildx create --name multiarch --use

# 构建并推送多架构镜像
docker buildx build `
  --platform linux/amd64,linux/arm64 `
  -t your-registry/proxy-pool:latest `
  --push .
```

## 相关文档

- [DOCKER_CLASH_FIX.md](./DOCKER_CLASH_FIX.md) - Clash Core 修复详情
- [DOCKER.md](./DOCKER.md) - Docker 部署指南
- [DOCKER_PERMISSIONS.md](./DOCKER_PERMISSIONS.md) - 权限问题排查
