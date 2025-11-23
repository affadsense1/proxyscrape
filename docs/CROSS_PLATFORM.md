# 🎉 Clash Core 跨平台支持

## ✅ 已下载的核心文件

- **Windows**: `bin/mihomo.exe` (v1.18.10) ✅
- **Linux**: `bin/mihomo` (v1.18.10) ✅

## 🔄 自动系统检测

代码已自动判断系统类型：

```typescript
// src/lib/clash.ts
const CORE_NAME = os.platform() === 'win32' ? 'mihomo.exe' : 'mihomo';
```

- **Windows** → 调用 `mihomo.exe`
- **Linux/Mac** → 调用 `mihomo`

## 📦 下载脚本

### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File download-clash.ps1
```
自动下载 Windows 和 Linux 两个版本。

### Linux (Bash)
```bash
chmod +x download-clash-linux.sh
./download-clash-linux.sh
```

## 🚀 部署到 Linux

1. **上传项目**到 Linux 服务器

2. **设置执行权限**：
   ```bash
   chmod +x bin/mihomo
   ```

3. **安装依赖并启动**：
   ```bash
   npm install
   npm run build
   npm start
   ```

4. **验证 Clash 功能**：
   访问网页，点击"立即扫描"，查看日志：
   ```
   启动 Clash Core (API Port: 15002)...
   Clash Core 启动成功
   ```

## 🔧 常见问题

### Linux 上提示 "Permission denied"
```bash
chmod +x bin/mihomo
```

### 找不到 glibc
Mihomo 需要 glibc 2.28+，如果系统太旧可能无法运行。
检查版本：
```bash
ldd --version
```

### 端口被占用
修改 `src/lib/clash.ts` 中的 `START_PORT` (默认 15000)。

## 📊 系统兼容性

| 系统 | 架构 | 核心文件 | 状态 |
|------|------|---------|------|
| Windows | x64 | mihomo.exe | ✅ 已测试 |
| Linux | x64 | mihomo | ✅ 已下载 |
| macOS | arm64 | mihomo | ⚠️ 需单独下载 |

### macOS (Apple Silicon) 用户
下载地址：
```
https://github.com/MetaCubeX/mihomo/releases/download/v1.18.10/mihomo-darwin-arm64-v1.18.10.gz
```
解压后重命名为 `mihomo` 并放到 `bin/` 目录。

---

**现在您的项目支持 Windows 和 Linux 自动切换！** 🎉
