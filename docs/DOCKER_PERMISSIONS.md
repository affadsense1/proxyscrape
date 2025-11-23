# Docker 权限问题完全解决指南

## 问题症状

```
Error: EACCES: permission denied, open '/app/data/config.json'
```

这是 Docker 容器中最常见的问题之一。

---

## 原因分析

1. **容器内用户**: 应用以 `nextjs` 用户（UID 1001）运行
2. **宿主机目录**: `./data` 和 `./bin` 目录可能属于其他用户
3. **权限冲突**: 容器内的用户无法写入宿主机的目录

---

## 解决方案

### 方案 1: 使用修复脚本（推荐）

#### Linux/macOS

```bash
chmod +x fix-permissions.sh
./fix-permissions.sh
```

#### Windows

```powershell
powershell -ExecutionPolicy Bypass -File fix-permissions.ps1
```

### 方案 2: 手动修复权限

#### Linux/macOS

```bash
# 创建目录
mkdir -p data bin

# 设置权限（UID 1001 是容器中 nextjs 用户的 ID）
sudo chown -R 1001:1001 data bin
sudo chmod -R 755 data bin

# 验证
ls -la data bin
```

#### Windows (Docker Desktop)

```powershell
# 创建目录
New-Item -ItemType Directory -Force -Path "data", "bin"

# Windows 上 Docker Desktop 会自动处理权限
# 只需确保目录存在即可
```

### 方案 3: 使用当前用户权限

```bash
# 使用当前用户的 UID/GID
sudo chown -R $(id -u):$(id -g) data bin

# 然后在 docker-compose.yml 中添加
services:
  proxyscrape:
    user: "${UID}:${GID}"
```

### 方案 4: 以 root 运行（不推荐）

```yaml
# docker-compose.yml
services:
  proxyscrape:
    user: "0:0"  # root 用户
```

⚠️ **安全警告**: 以 root 运行容器存在安全风险，仅用于测试。

---

## 验证权限

### 检查目录权限

```bash
ls -la data bin
```

应该看到类似输出：
```
drwxr-xr-x  2 1001 1001 4096 Nov 23 10:00 data
drwxr-xr-x  2 1001 1001 4096 Nov 23 10:00 bin
```

### 测试写入

```bash
# 创建测试文件
docker run --rm -v $(pwd)/data:/app/data ghcr.io/affadsense1/proxyscrape:latest sh -c "touch /app/data/test.txt && echo 'success' || echo 'failed'"

# 清理
rm data/test.txt
```

---

## 不同环境的特殊说明

### Docker Desktop (Windows/Mac)

Docker Desktop 使用虚拟机，权限处理方式不同：

**Windows:**
- 确保目录在 Docker Desktop 的文件共享设置中
- Settings → Resources → File Sharing
- 添加项目目录

**Mac:**
- Docker Desktop 自动处理权限映射
- 通常不需要手动设置权限

### Linux (原生 Docker)

需要手动设置权限：

```bash
# 方法 1: 使用容器的 UID
sudo chown -R 1001:1001 data bin

# 方法 2: 使用当前用户
sudo chown -R $USER:$USER data bin
# 然后在 docker-compose.yml 中设置 user: "${UID}:${GID}"
```

### NAS (Synology/QNAP)

```bash
# SSH 到 NAS
ssh admin@nas-ip

# 设置权限
cd /volume1/docker/proxyscrape
sudo chown -R 1001:1001 data bin
```

---

## 持久化解决方案

### 方法 1: 使用命名卷（推荐）

```yaml
# docker-compose.yml
services:
  proxyscrape:
    volumes:
      - data:/app/data
      - bin:/app/bin

volumes:
  data:
  bin:
```

优点：
- Docker 自动管理权限
- 跨平台兼容
- 备份简单

缺点：
- 数据不在项目目录中
- 需要使用 `docker volume` 命令管理

### 方法 2: 使用 .env 文件

```bash
# .env
UID=1001
GID=1001
```

```yaml
# docker-compose.yml
services:
  proxyscrape:
    user: "${UID}:${GID}"
```

### 方法 3: 启动时修复权限

在 `docker-compose.yml` 中添加初始化容器：

```yaml
services:
  init:
    image: alpine
    volumes:
      - ./data:/data
      - ./bin:/bin
    command: sh -c "chown -R 1001:1001 /data /bin"
    
  proxyscrape:
    depends_on:
      - init
```

---

## 故障排查

### 问题 1: 权限修复后仍然报错

```bash
# 停止容器
docker-compose down

# 删除旧数据（⚠️ 会丢失数据）
sudo rm -rf data/* bin/*

# 重新设置权限
sudo chown -R 1001:1001 data bin

# 重新启动
docker-compose up -d
```

### 问题 2: sudo 命令不可用

```bash
# 使用 su 切换到 root
su -
chown -R 1001:1001 /path/to/project/data /path/to/project/bin
exit
```

### 问题 3: Windows 上权限问题

1. 确保 Docker Desktop 正在运行
2. 检查文件共享设置
3. 重启 Docker Desktop
4. 以管理员身份运行 PowerShell

### 问题 4: SELinux 阻止访问（CentOS/RHEL）

```bash
# 临时禁用 SELinux
sudo setenforce 0

# 或添加 SELinux 标签
sudo chcon -Rt svirt_sandbox_file_t data bin

# 或在 docker-compose.yml 中添加
services:
  proxyscrape:
    volumes:
      - ./data:/app/data:z
      - ./bin:/app/bin:z
```

---

## 预防措施

### 1. 使用初始化脚本

在启动容器前运行：

```bash
#!/bin/bash
mkdir -p data bin
sudo chown -R 1001:1001 data bin
docker-compose up -d
```

### 2. 添加到文档

在 README 中明确说明权限要求。

### 3. 使用健康检查

```yaml
healthcheck:
  test: ["CMD", "test", "-w", "/app/data"]
  interval: 30s
```

---

## 快速参考

| 操作系统 | 命令 |
|---------|------|
| Linux | `sudo chown -R 1001:1001 data bin` |
| macOS | `sudo chown -R 1001:1001 data bin` |
| Windows | 确保 Docker Desktop 文件共享已启用 |
| NAS | SSH 后执行 `chown -R 1001:1001 data bin` |

---

## 获取帮助

如果以上方法都无法解决问题：

1. 查看容器日志：`docker-compose logs -f`
2. 检查目录权限：`ls -la data bin`
3. 进入容器检查：`docker exec -it proxyscrape sh`
4. 提供完整错误信息和环境信息

---

## 相关资源

- [Docker 文档](./DOCKER.md)
- [故障排除指南](./TROUBLESHOOTING.md)
- [Docker 官方文档 - Volumes](https://docs.docker.com/storage/volumes/)
