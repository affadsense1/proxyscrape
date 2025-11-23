# Docker 环境故障排查

## Mihomo (Clash Core) 问题诊断

### 快速测试

```bash
# 方法 1: 使用测试脚本
chmod +x test-docker-mihomo.sh
docker cp test-docker-mihomo.sh autorss-web:/tmp/
docker exec -it autorss-web sh /tmp/test-docker-mihomo.sh

# 方法 2: 手动测试
docker exec -it autorss-web sh
```

### 常见问题

#### 1. Mihomo 文件不存在

**症状**：
```
Clash Core 未找到: /app/bin/mihomo
```

**解决方案**：
```bash
# 进入容器
docker exec -it autorss-web sh

# 检查文件
ls -la /app/bin/

# 如果文件不存在，手动下载
cd /app/bin
wget https://github.com/MetaCubeX/mihomo/releases/download/v1.18.10/mihomo-linux-amd64-v1.18.10.gz
gunzip mihomo-linux-amd64-v1.18.10.gz
mv mihomo-linux-amd64-v1.18.10 mihomo
chmod +x mihomo
```

#### 2. Mihomo 权限问题

**症状**：
```
permission denied: /app/bin/mihomo
```

**解决方案**：
```bash
docker exec -it autorss-web chmod +x /app/bin/mihomo
```

#### 3. Mihomo 进程残留

**症状**：
- 扫描卡住不动
- 日志显示 "Test timeout"
- 端口被占用

**解决方案**：
```bash
# 查看运行中的进程
docker exec -it autorss-web ps aux | grep mihomo

# 清理所有 mihomo 进程
docker exec -it autorss-web pkill -9 mihomo

# 或者重启容器
docker-compose restart
```

#### 4. 网络连接问题

**症状**：
- 所有节点测试都超时
- 无法下载订阅源

**解决方案**：
```bash
# 测试容器网络
docker exec -it autorss-web ping -c 3 1.1.1.1

# 测试 DNS
docker exec -it autorss-web nslookup www.cloudflare.com

# 测试 HTTPS
docker exec -it autorss-web wget -O- https://www.cloudflare.com/cdn-cgi/trace
```

#### 5. 端口冲突

**症状**：
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案**：
```bash
# 检查端口占用
netstat -tlnp | grep 3000

# 或更改 docker-compose.yml 中的端口映射
ports:
  - "3001:3000"  # 使用 3001 端口
```

### 调试模式

#### 启用详细日志

```bash
# 查看实时日志
docker-compose logs -f

# 查看 Mihomo 相关日志
docker-compose logs -f | grep -i mihomo

# 查看错误日志
docker-compose logs -f | grep -i error
```

#### 进入容器调试

```bash
# 进入容器
docker exec -it autorss-web sh

# 手动运行 Mihomo
cd /app/bin
./mihomo -v

# 测试配置文件
./mihomo -f config.yaml -t

# 查看进程
ps aux | grep mihomo

# 查看端口
netstat -tlnp
```

### 性能问题

#### 容器资源不足

**症状**：
- 扫描非常慢
- 容器频繁重启
- OOM (Out of Memory) 错误

**解决方案**：

在 `docker-compose.yml` 中增加资源限制：

```yaml
deploy:
  resources:
    limits:
      cpus: '4'      # 增加到 4 核
      memory: 4G     # 增加到 4GB
    reservations:
      cpus: '2'
      memory: 2G
```

#### 磁盘空间不足

```bash
# 检查磁盘使用
docker system df

# 清理未使用的资源
docker system prune -a

# 清理构建缓存
docker builder prune
```

### 数据持久化问题

#### Volume 映射失败

**症状**：
- 容器重启后数据丢失
- 无法写入配置

**解决方案**：

```bash
# 检查 Volume 映射
docker inspect autorss-web | grep -A 10 Mounts

# 检查宿主机目录权限
ls -la data/
ls -la bin/

# 修复权限（如果需要）
sudo chown -R 1001:1001 data/
sudo chown -R 1001:1001 bin/
```

### 多平台问题

#### ARM64 架构

如果在 ARM64 设备（如 Raspberry Pi、Apple Silicon）上运行：

```dockerfile
# 在 Dockerfile 中使用正确的架构
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then \
        MIHOMO_ARCH="arm64"; \
    else \
        MIHOMO_ARCH="amd64"; \
    fi && \
    curl -L -o mihomo.gz "https://github.com/MetaCubeX/mihomo/releases/download/v1.18.10/mihomo-linux-${MIHOMO_ARCH}-v1.18.10.gz"
```

### 完全重置

如果所有方法都失败，尝试完全重置：

```bash
# 1. 停止并删除容器
docker-compose down

# 2. 删除镜像
docker rmi autorss-web

# 3. 清理 Volume（⚠️ 会删除数据）
rm -rf data/* bin/*

# 4. 重新构建
docker-compose up -d --build

# 5. 查看日志
docker-compose logs -f
```

### 获取帮助

如果问题仍然存在，请提供以下信息：

```bash
# 系统信息
docker version
docker-compose version
uname -a

# 容器信息
docker ps -a
docker inspect autorss-web

# 日志
docker-compose logs --tail 100

# Mihomo 信息
docker exec -it autorss-web /app/bin/mihomo -v
docker exec -it autorss-web ls -la /app/bin/
```

## 参考资料

- [Mihomo GitHub](https://github.com/MetaCubeX/mihomo)
- [Docker 文档](./DOCKER.md)
- [故障排除指南](./TROUBLESHOOTING.md)
