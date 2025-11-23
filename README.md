# AutoRSS - 自动代理池管理系统

一个基于 Next.js 的智能代理池管理系统，支持自动爬取、测试和管理代理节点。

## 📁 项目结构

```
.
├── docs/              # 📚 所有文档
│   ├── DOCKER.md                    # Docker 部署指南
│   ├── SUBSCRIPTION_API.md          # 订阅 API 文档
│   ├── CLASH_YAML_SUPPORT.md        # Clash 格式支持
│   └── TROUBLESHOOTING.md           # 故障排查
├── scripts/           # 🔧 脚本工具
│   ├── docker/                      # Docker 相关脚本
│   │   ├── rebuild-docker.ps1       # 重建镜像（Windows）
│   │   ├── check-status.ps1         # 状态检查
│   │   └── final-fix.ps1            # 完整修复流程
│   ├── utils/                       # 工具脚本
│   └── download-core.mjs            # 下载 Clash Core
├── src/               # 💻 源代码
│   ├── app/                         # Next.js App Router
│   ├── lib/                         # 核心逻辑
│   └── hooks/                       # React Hooks
├── data/              # 💾 数据存储
│   ├── nodes.json                   # 节点数据
│   └── config.json                  # 系统配置
└── bin/               # 🔨 二进制文件
    └── mihomo                       # Clash Core
```

**快速导航**:
- 📖 [完整文档列表](./docs/README.md)
- 🐳 [Docker 脚本说明](./scripts/README.md)
- 🚀 [快速开始](#-快速开始)

## ✨ 特性

- 🔄 **自动爬取**：支持多个订阅源自动爬取节点，每 24 小时自动扫描
- ✅ **双重验证**：TCP Ping + Clash Core 真机测试
- 📊 **实时统计**：成功率、延迟、地理位置信息
- 🌍 **IP 分析**：自动识别原生IP/广播IP、地区、运营商
- 💾 **增量保存**：扫描过程中自动保存，中断不丢失数据
- 🔗 **多窗口同步**：支持多个浏览器窗口实时数据同步
- ⚙️ **灵活配置**：可自定义测活 URL，支持多种预设选项
- 🛡️ **容错机制**：Clash 批次失败自动跳过，进程自动清理
- 🔐 **访问控制**：密码保护 + 订阅 Key
- 🐳 **Docker 支持**：一键部署，数据持久化，多平台支持

## 🚀 快速开始

### 一键启动（最简单）

```bash
# 下载并运行快速启动脚本
curl -fsSL https://raw.githubusercontent.com/affadsense1/proxyscrape/main/quick-start.sh | bash

# 或者手动下载后运行
wget https://raw.githubusercontent.com/affadsense1/proxyscrape/main/quick-start.sh
chmod +x quick-start.sh
./quick-start.sh
```

### Docker 部署（推荐）

#### 方式一：使用 GitHub Packages 镜像（最快）

```bash
# 1. 创建并设置目录权限（重要！）
mkdir -p data bin
sudo chown -R 1001:1001 data bin

# 2. 拉取预构建镜像
docker pull ghcr.io/affadsense1/proxyscrape:latest

# 3. 运行容器
docker run -d \
  --name proxyscrape \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/bin:/app/bin \
  --restart unless-stopped \
  ghcr.io/affadsense1/proxyscrape:latest

# 4. 访问
open http://localhost:3000
```

> ⚠️ **重要**: 如果遇到权限错误，请查看 [权限问题解决指南](./DOCKER_PERMISSIONS.md)

**或使用 docker-compose（推荐）：**

创建 `docker-compose.yml` 文件：

```yaml
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
```

然后运行：

```bash
docker-compose up -d
```

详细说明: [GITHUB_PACKAGES.md](./GITHUB_PACKAGES.md)

#### 方式二：本地构建

```bash
# 1. 克隆项目
git clone <your-repo>
cd autorss-web

# 2. 修复权限（重要！）
chmod +x fix-permissions.sh
./fix-permissions.sh

# 3. 一键启动
chmod +x start-docker.sh
./start-docker.sh

# 3. 访问
open http://localhost:3000
```

**默认密码**: `affadsense`

详细说明请查看 [DOCKER.md](./DOCKER.md)

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 下载 Clash Core
# Windows
.\download-clash.ps1

# Linux/Mac
chmod +x download-clash-linux.sh
./download-clash-linux.sh

# 3. 启动开发服务器
npm run dev

# 4. 访问
open http://localhost:3000
```

## 📦 技术栈

- **前端**: Next.js 14 (App Router) + React + TypeScript
- **样式**: Vanilla CSS + Framer Motion
- **测试**: Clash Core (Mihomo) + TCP Ping
- **部署**: Docker + Standalone Mode

## 📁 项目结构

```
autorss-web/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API 路由
│   │   └── page.tsx      # 主页面
│   └── lib/              # 核心逻辑
│       ├── scanner.ts    # 扫描引擎
│       ├── clash.ts      # Clash 集成
│       ├── store.ts      # 数据存储
│       └── events.ts     # SSE 事件
├── bin/                  # Clash Core 可执行文件
├── data/                 # 数据持久化目录
│   ├── config.json       # 配置文件
│   └── nodes.json        # 节点数据
├── Dockerfile            # Docker 镜像
├── docker-compose.yml    # Docker Compose 配置
└── DOCKER.md             # Docker 部署文档
```

## 🔧 配置说明

### 订阅源管理

在设置页面添加订阅链接：

```
https://example.com/sub1
https://example.com/sub2
```

支持批量导入/导出。

### 安全设置

- **网页访问密码**: 保护管理界面
- **订阅 Key**: 保护订阅链接 `?key=your-key`

### 扫描策略

1. **TCP初筛**: 快速过滤不可达节点
2. **Clash复核**: 真机测试（分批50个）
3. **增量保存**: 每批完成立即保存
4. **异常保护**: 中途失败也保存已测试节点

## 📊 数据持久化

### Docker 环境

数据通过 Volume 映射保存在宿主机：

```yaml
volumes:
  - ./data:/app/data    # 配置和节点
  - ./bin:/app/bin      # Clash Core
```

**容器删除重建后数据完全保留！**

### 备份

```bash
# 备份
tar -czf backup.tar.gz data/

# 恢复
tar -xzf backup.tar.gz
```

## 🔌 API 文档

### 获取节点列表

```bash
curl http://localhost:3000/api/nodes
```

### 订阅地址

```
http://localhost:3000/api/subscribe
http://localhost:3000/api/subscribe?key=your-key
```

返回 Base64 编码的节点列表，支持 Clash/V2Ray 等客户端。

### 手动扫描

```bash
curl -X POST http://localhost:3000/api/scan
```

### 配置管理

```bash
# 获取配置
curl http://localhost:3000/api/config

# 更新配置
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"subscriptions": ["url1", "url2"]}'
```

## 🐛 故障排查

### Clash Core 无法启动

```bash
# 检查文件
ls -la bin/mihomo

# 手动测试
./bin/mihomo -v

# 重新下载
./download-clash-linux.sh
```

### Docker 容器无法启动

```bash
# 查看日志
docker-compose logs

# 重建容器
docker-compose down
docker-compose up -d --build
```

### 扫描失败

1. 检查订阅源是否可访问
2. 查看日志中的异常记录
3. 检查 Clash Core 权限

## 📝 更新日志

查看 [扫描历史功能文档](./SCAN_HISTORY.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**技术支持**: 查看详细文档
- [Docker 部署](./DOCKER.md)
- [扫描历史](./SCAN_HISTORY.md)
- [跨平台支持](./CROSS_PLATFORM.md)
