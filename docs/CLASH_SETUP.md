# Clash Core 集成说明

## 📦 下载 Mihomo Core

为了实现真实的节点连接测试（而非仅 TCP Ping），本项目集成了 Mihomo (Clash Meta) 核心。

### Windows 用户

1. **下载核心文件**
   - 访问：https://github.com/MetaCubeX/mihomo/releases
   - 下载：`mihomo-windows-amd64-{版本}.zip`（推荐 v1.18.0 或更新）
   - 文件大小约 10-15MB

2. **放置文件**
   - 解压下载的 zip 文件
   - 将 `mihomo-windows-amd64.exe` 重命名为 `mihomo.exe`
   - 放到项目的 `bin` 目录下：
     ```
     c:/Users/Administrator/Desktop/autorss/autorss-web/bin/mihomo.exe
     ```

3. **验证安装**
   - 打开 PowerShell，运行：
     ```powershell
     cd c:/Users/Administrator/Desktop/autorss/autorss-web/bin
     ./mihomo.exe -v
     ```
   - 应该显示版本信息

### Linux 用户

1. **下载核心文件**
   - 访问：https://github.com/MetaCubeX/mihomo/releases
   - 下载：`mihomo-linux-amd64-{版本}.gz`

2. **放置文件**
   ```bash
   gunzip mihomo-linux-amd64-{版本}.gz
   mv mihomo-linux-amd64-{版本} bin/mihomo
   chmod +x bin/mihomo
   ```

3. **验证安装**
   ```bash
   ./bin/mihomo -v
   ```

## 🚀 使用方法

安装完成后：
1. 刷新网页
2. 点击"立即扫描"
3. 系统会自动：
   - **第一步**：TCP Ping 初筛（快速过滤无效 IP）
   - **第二步**：Clash 真机测试（验证代理连通性）
4. 在"爬虫"页面可以看到详细的测试日志

## 📝 工作原理

### TCP Ping（旧方式）
- ✅ 速度快
- ❌ 只检测端口开放
- ❌ 无法验证代理协议
- ❌ CDN 节点会误报为"存活"

### Clash URL Test（新方式）
- ✅ 模拟真实客户端连接
- ✅ 验证密码、加密方式
- ✅ 通过代理访问测试 URL
- ✅ 准确判断节点可用性
- ⚠️ 速度较慢（每个节点 5-10 秒）

## 🔧 故障排除

### 1. 找不到 Clash Core
日志显示：`Clash Core 未找到`
- **原因**：未下载或文件名/路径错误
- **解决**：按上述步骤重新放置文件

### 2. Clash 启动失败
日志显示：`Clash Core 启动超时`
- **原因**：端口被占用或防火墙阻止
- **解决**：检查防火墙设置，或重启电脑

### 3. 仍然显示 TCP 结果
日志显示：`降级使用 TCP 结果`
- **原因**：Clash 启动失败，系统自动降级
- **影响**：不影响基本功能，但准确性降低

## 💡 提示

- 如果不需要高精度测试，可以不安装 Clash Core，系统会自动使用 TCP Ping
- Clash Core 仅在扫描时运行，测试完成后会自动关闭
- 支持 Shadowsocks、VMess、Trojan 等常见协议
