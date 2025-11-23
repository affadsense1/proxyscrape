# 故障排除指南

## 问题：扫描时节点测活全部失败

### 症状
- Clash Core 启动成功
- 但所有节点测试都返回失败
- 日志显示 "Clash Core 启动成功" 后没有进一步输出

### 原因
`mihomo.exe` 进程在扫描结束后没有完全退出，导致端口被占用。

### 解决方案

#### Windows

**方法 1: 使用清理脚本（推荐）**
```powershell
powershell -ExecutionPolicy Bypass -File kill-mihomo.ps1
```

**方法 2: 手动清理**
1. 打开任务管理器（Ctrl + Shift + Esc）
2. 找到所有 `mihomo.exe` 进程
3. 右键 -> 结束任务

**方法 3: 使用命令行**
```cmd
taskkill /IM mihomo.exe /F
```

#### Linux/macOS

**方法 1: 使用清理脚本（推荐）**
```bash
# 首次使用需要添加执行权限
chmod +x kill-mihomo.sh

# 运行脚本
./kill-mihomo.sh
```

**方法 2: 使用命令行**
```bash
# 查找进程
ps aux | grep mihomo

# 强制终止所有 mihomo 进程
pkill -9 mihomo

# 或者使用 killall
killall -9 mihomo
```

### 预防措施
代码已经更新，现在会：
1. 启动前自动清理残留进程
2. 使用随机端口避免冲突
3. 停止时强制终止进程树

## 问题：多个窗口数据不同步

### 症状
- 在一个窗口执行操作，另一个窗口没有更新

### 解决方案
1. 刷新页面
2. 检查浏览器控制台是否有 SSE 连接错误
3. 确保 `/api/events` 端点正常工作

## 问题：扫描中断后数据丢失

### 症状
- 扫描进行到一半时关闭浏览器
- 重新打开后没有看到已扫描的节点

### 解决方案
现在已经实现了增量保存，每批节点测试完成后会自动保存。如果仍然遇到问题：
1. 检查 `data/nodes.json` 文件是否存在
2. 查看文件内容是否有数据
3. 检查文件权限

## 问题：构建失败

### 症状
```
⚠ Restarted static page generation for /api/events because it took more than 60 seconds
```

### 解决方案
已修复。SSE 端点现在使用 `export const dynamic = 'force-dynamic'` 避免静态生成。

如果仍然遇到问题：
```bash
# 清理构建缓存
Remove-Item -Recurse -Force .next
npm run build
```

## 问题：并发扫描导致数据混乱

### 症状
- 日志显示重复的扫描开始
- 节点数量不一致

### 解决方案
已修复。现在使用任务锁机制防止并发扫描：
- Cron 任务会检查是否有扫描正在运行
- 手动扫描会返回 409 Conflict 如果已有任务运行

## 获取帮助

如果以上方法都无法解决问题，请：
1. 查看浏览器控制台日志
2. 查看 Next.js 服务器日志
3. 检查 `data/` 目录下的文件
4. 提供完整的错误日志
