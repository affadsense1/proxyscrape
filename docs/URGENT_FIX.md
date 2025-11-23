# 🚨 紧急修复：Clash Core 未找到

## 问题

你看到的错误：
```
❌ Clash Core 未找到: /app/bin/mihomo
```

## 原因

你正在运行的是**旧的 Docker 镜像**，不是我们刚修复的版本。

## ✅ 解决方案（3 步）

### 步骤 1: 启动 Docker Desktop

从 Windows 开始菜单启动 **Docker Desktop**，等待它完全启动。

### 步骤 2: 运行修复脚本

打开 PowerShell，在项目目录运行：

```powershell
.\fix-and-restart.ps1
```

这个脚本会自动：
1. ✅ 检查 Docker 状态
2. ✅ 停止并删除旧容器
3. ✅ 删除旧镜像
4. ✅ 构建新镜像（包含修复）
5. ✅ 验证 mihomo 文件
6. ✅ 启动新容器
7. ✅ 显示启动日志

### 步骤 3: 验证修复

访问 http://localhost:3000 并测试扫描功能。

日志应该显示：
```
[Startup] Mihomo binary found
-rwxr-xr-x    1 nextjs   nodejs      12.5M /app/bin/mihomo
[Docker] 检测到 Docker 环境
[文件验证] 大小: 12.50 MB
[文件验证] 权限正常
✅ Clash Core 启动成功
```

## 🔧 手动修复（如果脚本失败）

如果自动脚本失败，手动执行：

```powershell
# 1. 停止旧容器
docker stop proxy-pool
docker rm proxy-pool

# 2. 删除旧镜像
docker rmi proxy-pool:latest

# 3. 构建新镜像
docker build -t proxy-pool:latest .

# 4. 验证 mihomo 文件
docker run --rm proxy-pool:latest ls -la /app/bin/mihomo
docker run --rm proxy-pool:latest /app/bin/mihomo -v

# 5. 启动新容器
docker run -d -p 3000:3000 -v ${PWD}/data:/app/data --name proxy-pool proxy-pool:latest

# 6. 查看日志
docker logs -f proxy-pool
```

## ❓ 常见问题

### Q: Docker 命令无法识别

**A**: Docker Desktop 没有运行。请启动 Docker Desktop。

### Q: 构建失败

**A**: 检查网络连接，GitHub 下载可能需要代理：
```powershell
docker build --build-arg HTTP_PROXY=http://your-proxy:port -t proxy-pool:latest .
```

### Q: 仍然提示文件未找到

**A**: 检查是否使用了新镜像：
```powershell
# 查看镜像创建时间
docker images proxy-pool

# 应该显示刚才的时间
```

如果时间不对，说明容器使用了旧镜像，重新执行步骤 2。

## 📋 验证清单

运行修复后，验证以下内容：

- [ ] Docker Desktop 正在运行
- [ ] 新镜像构建成功
- [ ] mihomo 文件存在于 `/app/bin/mihomo`
- [ ] mihomo 文件可执行
- [ ] 容器启动成功
- [ ] 日志显示 "Mihomo binary found"
- [ ] 日志显示 "Clash Core 启动成功"
- [ ] 扫描功能正常工作

## 🆘 需要帮助？

如果修复后仍有问题：

1. 查看完整日志：
   ```powershell
   docker logs proxy-pool > logs.txt
   ```

2. 检查容器内文件：
   ```powershell
   docker exec proxy-pool ls -la /app/bin/
   docker exec proxy-pool /app/bin/mihomo -v
   ```

3. 查看详细文档：
   - [DOCKER_BUILD_INSTRUCTIONS.md](./DOCKER_BUILD_INSTRUCTIONS.md)
   - [DOCKER_CLASH_FIX.md](./DOCKER_CLASH_FIX.md)
   - [DOCKERFILE_VERIFICATION.md](./DOCKERFILE_VERIFICATION.md)
