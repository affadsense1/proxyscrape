# 🎉 Clash Core 集成完成

## ✅ 已完成的工作

### 1. **Clash 适配模块** (`src/lib/clash.ts`)
- ✅ 节点格式转换（SS/VMess/Trojan → Clash Config）
- ✅ 进程管理（启动/停止 Clash）
- ✅ API 调用（延迟测试）
- ✅ 跨平台支持（Windows/Linux）

### 2. **扫描器升级** (`src/lib/scanner.ts`)  
- ✅ **两阶段检测**：
  - 第一阶段：TCP Ping 快速初筛
  - 第二阶段：Clash 真机复核
- ✅ 实时进度和日志推送
- ✅ 自动降级（Clash 失败时使用 TCP 结果）

### 3. **Mihomo Core 下载**
- ✅ Windows 版本 v1.18.10 已安装
- ✅ 位置：`bin/mihomo.exe`
- ✅ 提供自动下载脚本：`download-clash.ps1`

### 4. **文档**
- ✅ 集成说明：`CLASH_SETUP.md`
- ✅ 下载助手：`scripts/download-core.mjs`

---

## 🚀 使用方法

### 1. **设置访问密码**
   - 访问 `http://localhost:3000`
   - 输入默认密码：`affadsense`
   - 进入后点击"设置"，可修改网页密码和订阅 Key

### 2. **添加订阅源**
   - 点击"设置"
   - 输入订阅链接并添加
   - 或使用"批量导入"粘贴多个链接

### 3. **开始扫描**
   - 点击"立即扫描"
   - 切换到"爬虫"页面查看实时日志
   - 观察两阶段检测过程：
     ```
     TCP 初筛 → Clash URL Test → 最终结果
     ```

### 4. **查看结果**
   - "代理池"页面：查看存活节点列表
   - "Dashboard"：查看统计数据
   - "健康检查"：查看系统状态

---

## 📊 检测原理对比

| 方式 | 速度 | 准确性 | 说明 |
|------|------|--------|------|
| **TCP Ping** | ⚡ 极快 | ⚠️ 低 | 仅检测端口开放，CDN 会误报 |
| **Clash URL Test** | 🐢 较慢 | ✅ 高 | 真实连接，验证协议、密码、网络 |
| **混合模式（当前）** | 🚀 快 | ✅ 高 | TCP 初筛 + Clash 复核 |

---

## 🔧 预期日志输出

扫描时，在"爬虫"页面会看到类似日志：

```
开始加载订阅源...
正在下载: https://example.com/sub
从 https://example.com/sub 解析到 150 个节点
去重后共 150 个节点，开始 TCP 初筛...
TCP 初筛完成，存活: 45，准备 Clash 真机复核...
启动 Clash Core (API Port: 15002)...
Clash Core 启动成功
Clash Core 已启动，开始 URL Test...
[可用] 🇭🇰|中国香港|HKT Limited|原生IP (245ms)
[可用] 🇸🇬|新加坡|XX Cloud|原生IP (189ms)
...
Clash Core 已停止
扫描完成，最终存活: 28
```

---

## ⚠️ 故障排除

### 问题 1: 显示"Clash 启动失败或未安装"
**原因**：
- Mihomo Core 未下载
- 文件路径错误
- 权限问题

**解决**：
1. 检查文件是否存在：`bin/mihomo.exe`
2. 重新运行下载脚本：`powershell -ExecutionPolicy Bypass -File download-clash.ps1`
3. 手动下载：https://github.com/MetaCubeX/mihomo/releases

### 问题 2: 进度条不显示
**原因**：服务未重启，事件单例未生效

**解决**：
1. 停止开发服务器（`Ctrl+C`）
2. 重新启动：`npm run dev`

### 问题 3: Key 验证不生效
**原因**：配置未保存或未刷新

**解决**：
1. 在"设置"中确认 Key 已保存
2. 刷新浏览器
3. 测试订阅链接（带错误 Key 应返回 403）

---

## 📝 技术细节

### Clash 配置生成
```typescript
{
  proxies: [
    {
      name: 'node_0',
      type: 'ss',
      server: '1.2.3.4',
      port: 443,
      cipher: 'aes-256-gcm',
      password: 'xxx'
    },
    // ...
  ]
}
```

### 延迟测试 API
```
GET http://127.0.0.1:{api_port}/proxies/{name}/delay?timeout=5000&url=http://www.gstatic.com/generate_204
```

### 端口分配
- HTTP Proxy: 15000 + offset
- SOCKS Proxy: 15001 + offset  
- API Port: 15002 + offset

---

## 🎯 下一步建议

1. **优化并发**：根据机器性能调整 `clashConcurrency`（当前 10）
2. **自定义测试 URL**：修改 `clash.ts` 中的测试 URL
3. **过滤规则**：在前端添加国家/ISP 过滤
4. **定时任务**：配置自动扫描并剔除失效节点

---

## 📚 相关文件

- `src/lib/clash.ts` - Clash 集成核心
- `src/lib/scanner.ts` - 扫描逻辑
- `src/lib/events.ts` - 事件总线（SSE）
- `src/app/api/scan/progress/route.ts` - 进度 API
- `bin/mihomo.exe` - Clash Core 可执行文件

---

**集成完成！享受精准的节点检测吧！** 🚀
