# Docker 部署文档

## 📦 快速开始

### 1. 构建并启动容器

```bash
# 使用 docker-compose（推荐）
docker-compose up -d

# 或者手动构建
docker build -t autorss-web .
docker run -d \
  --name autorss-web \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/bin:/app/bin \
  --restart unless-stopped \
  autorss-web
```

### 2. 访问应用

打开浏览器访问 `http://localhost:3000`

默认密码：`affadsense`（可在设置中修改）

---

## 🔧 常用命令

### 启动/停止/重启

```bash
# 启动
docker-compose up -d

# 停止
docker-compose stop

# 重启
docker-compose restart

# 完全停止并删除容器
docker-compose down
```

### 查看日志

```bash
# 实时查看日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail 100

# 查看特定服务日志
docker logs -f autorss-web
```

### 更新容器

```bash
# 拉取最新代码后重建
git pull
docker-compose down
docker-compose up -d --build
```

---

## 💾 数据持久化

### 数据存储位置

项目使用 **Volume 映射**确保数据持久化：

```yaml
volumes:
  - ./data:/app/data    # 配置和节点数据
  - ./bin:/app/bin      # Clash Core 可执行文件
```

### 数据文件说明

| 目录/文件 | 说明 | 持久化 |
|---------|------|--------|
| `data/config.json` | 订阅源配置、密钥、扫描历史 | ✅ |
| `data/nodes.json` | 节点数据 | ✅ |
| `bin/mihomo` | Clash Core 可执行文件 | ✅ |
| `bin/config.yaml` | Clash 临时配置 | ✅ |

### 数据备份

```bash
# 备份数据
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 恢复数据
tar -xzf backup-20231123.tar.gz
```

---

## 🔄 容器重建后数据保留

### ✅ 数据会保留的情况

```bash
# 删除容器但保留数据卷
docker-compose down

# 重新启动（数据完整保留）
docker-compose up -d
```

**原因**：Volume 映射到宿主机 `./data` 和 `./bin` 目录，容器删除不影响宿主机文件。

### ⚠️ 数据会丢失的情况

```bash
# 手动删除宿主机目录
rm -rf data/ bin/

# 或使用 -v 标志删除 volumes
docker-compose down -v  # ❌ 不要使用！
```

---

## 🐛 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查端口占用
netstat -tlnp | grep 3000

# 手动运行查看错误
docker run --rm -it autorss-web sh
```

### Clash Core 无法运行

```bash
# 进入容器检查
docker exec -it autorss-web sh

# 检查文件权限
ls -la /app/bin/mihomo

# 手动测试
/app/bin/mihomo -v
```

### 数据权限问题

```bash
# 修复宿主机权限
sudo chown -R 1001:1001 data/
sudo chown -R 1001:1001 bin/
```

---

## 🚀 生产环境部署建议

### 1. 反向代理（Nginx）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. HTTPS 支持

使用 Let's Encrypt + Certbot：

```bash
sudo certbot --nginx -d your-domain.com
```

### 3. 资源限制

在 `docker-compose.yml` 中已配置：

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

### 4. 自动重启

```yaml
restart: unless-stopped
```

### 5. 健康检查

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/nodes"]
  interval: 30s
```

---

## 📊 监控和维护

### 查看容器状态

```bash
# 容器运行状态
docker-compose ps

# 资源使用情况
docker stats autorss-web

# 健康检查状态
docker inspect --format='{{json .State.Health}}' autorss-web | jq
```

### 定期维护

```bash
# 清理未使用的镜像
docker image prune -a

# 清理构建缓存
docker builder prune

# 查看磁盘使用
docker system df
```

---

## 🔐 安全建议

1. **修改默认密码**：首次运行后立即在设置中修改
2. **启用订阅 Key**：防止订阅地址被盗用
3. **使用 HTTPS**：生产环境必须启用 SSL
4. **限制端口访问**：使用防火墙只允许必要的端口
5. **定期备份数据**：建议每天备份 `data/` 目录

---

## 📝 环境变量（可选）

在 `docker-compose.yml` 中添加：

```yaml
environment:
  - NODE_ENV=production
  - TZ=Asia/Shanghai           # 时区
  - NEXT_TELEMETRY_DISABLED=1  # 禁用遥测
```

---

## ✨ 新功能说明

### 1. 可配置的测活 URL

在设置页面可以选择不同的测活 URL：
- Cloudflare Trace (推荐)
- Cloudflare DNS (1.1.1.1)
- Google Generate 204
- 百度首页
- 自定义 URL

配置保存在 `data/config.json` 中，容器重启后保留。

### 2. 多窗口实时同步

- 支持多个浏览器窗口同时访问
- 所有窗口实时同步数据变更
- 使用 Server-Sent Events (SSE) 技术
- 自动重连机制

### 3. 增量保存机制

- 扫描过程中每批节点测试完成后自动保存
- 即使扫描中断，已验证的节点也会保留
- 防止数据丢失

### 4. Clash Core 进程管理

- 自动清理残留的 mihomo 进程
- 使用随机端口避免冲突
- 批次测试容错机制

---

## 🆘 常见问题

### Q: 容器重启后节点数据丢失？
**A**: 检查 Volume 映射是否正确，确保 `./data` 目录存在且有写权限。

### Q: 权限错误 "EACCES: permission denied"？
**A**: 这是最常见的问题！容器中的应用以 UID 1001 运行，需要正确的目录权限。

**快速修复：**
```bash
# 方法 1: 使用修复脚本
chmod +x fix-permissions.sh
./fix-permissions.sh

# 方法 2: 手动修复
sudo chown -R 1001:1001 data bin
sudo chmod -R 755 data bin

# 方法 3: 使用当前用户（不推荐，但可以工作）
sudo chown -R $(id -u):$(id -g) data bin
```

**验证权限：**
```bash
ls -la data bin
# 应该显示 1001:1001 或你的用户 ID
```

### Q: Clash Core 报错 "permission denied"？
**A**: 在容器内执行 `chmod +x /app/bin/mihomo`

### Q: 如何更新到最新版本？
**A**: 
```bash
git pull
docker-compose down
docker-compose up -d --build
```

### Q: 如何迁移到另一台服务器？
**A**: 
1. 备份 `data/` 目录
2. 在新服务器部署 Docker
3. 恢复 `data/` 目录
4. 运行 `docker-compose up -d`

### Q: 扫描时所有节点都超时？
**A**: 
1. 检查 Clash Core 是否正常运行：`docker exec -it autorss-web /app/bin/mihomo -v`
2. 清理残留进程：`docker exec -it autorss-web pkill -9 mihomo`
3. 尝试更换测活 URL（在设置中选择）
4. 检查容器网络连接

### Q: 多个窗口数据不同步？
**A**: 
1. 检查浏览器控制台是否有 SSE 连接错误
2. 刷新页面重新建立连接
3. 检查容器日志：`docker-compose logs -f`

### Q: 测活后节点大量减少？
**A**: 
1. 检查使用的测活 URL 是否可访问
2. 增加超时时间（当前为 8 秒）
3. 考虑节点本身可能确实不可用
4. 查看详细日志了解失败原因

---

## 📖 参考资料

- [Next.js Standalone](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Docker Compose](https://docs.docker.com/compose/)
- [Mihomo (Clash Core)](https://github.com/MetaCubeX/mihomo)
- [故障排除指南](./TROUBLESHOOTING.md)
