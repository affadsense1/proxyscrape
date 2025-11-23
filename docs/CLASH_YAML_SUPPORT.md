# Clash YAML 格式支持

## 概述

系统现在支持解析 **Clash YAML 格式**的订阅源，可以自动识别并转换为标准代理 URL 格式进行测试。

## 支持的格式

### 1. 标准 URL 格式（原有支持）
```
ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@server.com:8388
vmess://eyJ2IjoiMiIsInBzIjoi...
trojan://password@server.com:443
vless://uuid@server.com:443?type=ws&security=tls
```

### 2. Clash YAML 格式（新增支持）
```yaml
proxies:
  - name: 节点名称
    type: vless
    server: server.com
    port: 443
    uuid: uuid-here
    tls: true
    network: ws
    ws-opts:
      path: /path
      headers:
        Host: server.com
```

### 3. Base64 编码的内容
系统会自动解码 Base64 内容，然后尝试解析为 Clash YAML 或 URL 列表。

## 支持的协议

### 1. Shadowsocks (SS)
- ✅ 标准 URL 格式
- ✅ Clash YAML 格式

### 2. VMess
- ✅ 标准 URL 格式
- ✅ Clash YAML 格式

### 3. Trojan
- ✅ 标准 URL 格式
- ✅ Clash YAML 格式

### 4. VLESS（新增）
- ✅ 标准 URL 格式
- ✅ Clash YAML 格式

## 工作原理

### 解析流程

```
订阅内容
    ↓
检测是否为 Clash YAML
    ↓ 是
解析 YAML → 转换为 URL
    ↓
    ↓ 否
检测是否为 Base64
    ↓ 是
解码 → 递归解析
    ↓
    ↓ 否
按行解析 URL
    ↓
返回节点列表
```

### Clash YAML 检测

系统通过以下特征识别 Clash YAML 格式：
- 包含 `proxies:` 关键字
- 包含 `- {name:` 或 `- name:` 模式

### 代理转换

Clash YAML 代理对象会被转换为标准 URL 格式：

#### VLESS 示例
```yaml
# Clash YAML
- name: 🇭🇰 香港节点
  type: vless
  server: hk.example.com
  port: 443
  uuid: 12345678-1234-1234-1234-123456789012
  tls: true
  network: ws
  ws-opts:
    path: /path
    headers:
      Host: hk.example.com
  skip-cert-verify: true
  client-fingerprint: random

# 转换为
vless://12345678-1234-1234-1234-123456789012@hk.example.com:443?type=ws&security=tls&sni=hk.example.com&path=/path&host=hk.example.com&allowInsecure=1#%F0%9F%87%AD%F0%9F%87%B0%20%E9%A6%99%E6%B8%AF%E8%8A%82%E7%82%B9
```

#### VMess 示例
```yaml
# Clash YAML
- name: 🇺🇸 美国节点
  type: vmess
  server: us.example.com
  port: 443
  uuid: 12345678-1234-1234-1234-123456789012
  alterId: 0
  cipher: auto
  tls: true
  network: ws
  ws-opts:
    path: /vmess
    headers:
      Host: us.example.com

# 转换为
vmess://eyJ2IjoiMiIsInBzIjoi8J+HuvCfh7gg576O5Zu96IqC54K5IiwiYWRkIjoidXMuZXhhbXBsZS5jb20iLCJwb3J0IjoiNDQzIiwiaWQiOiIxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODkwMTIiLCJhaWQiOiIwIiwibmV0Ijoid3MiLCJ0eXBlIjoibm9uZSIsImhvc3QiOiJ1cy5leGFtcGxlLmNvbSIsInBhdGgiOiIvdm1lc3MiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJ1cy5leGFtcGxlLmNvbSJ9
```

## 使用方法

### 1. 添加 Clash 订阅源

在系统配置中添加 Clash 格式的订阅链接：

```json
{
  "subscriptions": [
    "https://example.com/clash-subscription.yaml",
    "https://example.com/base64-encoded-clash"
  ]
}
```

### 2. 执行扫描

点击"立即扫描"按钮，系统会：
1. 下载订阅内容
2. 自动识别格式（Clash YAML / URL 列表 / Base64）
3. 提取所有代理节点
4. 转换为标准格式
5. 进行 TCP 初筛
6. 使用 Clash Core 真机测试

### 3. 查看结果

扫描完成后，所有可用节点会显示在列表中，包括：
- 节点名称（从 Clash YAML 中提取）
- 服务器地址
- 延迟
- 地理位置信息

## 示例订阅源

### Clash YAML 格式
```yaml
port: 7890
socks-port: 7891
allow-lan: true
mode: Rule
log-level: info

proxies:
  - name: 🇭🇰 香港 IEPL
    type: vless
    server: hk1.example.com
    port: 443
    uuid: 12345678-1234-1234-1234-123456789012
    tls: true
    network: ws
    ws-opts:
      path: /vless
      headers:
        Host: hk1.example.com
    skip-cert-verify: false
    
  - name: 🇸🇬 新加坡 BGP
    type: vmess
    server: sg1.example.com
    port: 443
    uuid: 87654321-4321-4321-4321-210987654321
    alterId: 0
    cipher: auto
    tls: true
    network: ws
    ws-opts:
      path: /vmess
      headers:
        Host: sg1.example.com
```

### 混合格式（也支持）
```
# 可以混合 URL 和 Clash YAML
ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@server1.com:8388
vmess://eyJ2IjoiMiIsInBzIjoi...

proxies:
  - name: 节点1
    type: vless
    server: server2.com
    port: 443
```

## 技术细节

### 依赖
- `yaml` - YAML 解析库（已在 package.json 中）

### 关键函数

#### `extractNodes(content: string): string[]`
主解析函数，自动识别格式并提取节点。

#### `extractNodesFromClashYaml(content: string): string[]`
专门解析 Clash YAML 格式。

#### `convertClashProxyToUrl(proxy: any): string | null`
将 Clash 代理对象转换为标准 URL。

### 支持的 Clash 字段

#### 通用字段
- `name` - 节点名称
- `type` - 协议类型（ss/vmess/trojan/vless）
- `server` - 服务器地址
- `port` - 端口号

#### VLESS 特定字段
- `uuid` - 用户 ID
- `tls` - 是否启用 TLS
- `network` - 传输协议（tcp/ws）
- `servername` / `sni` - SNI
- `ws-opts` - WebSocket 选项
  - `path` - 路径
  - `headers.Host` - Host 头
- `skip-cert-verify` - 跳过证书验证
- `client-fingerprint` - 客户端指纹

#### VMess 特定字段
- `uuid` - 用户 ID
- `alterId` - 额外 ID
- `cipher` - 加密方式
- `tls` - 是否启用 TLS
- `network` - 传输协议
- `ws-opts` - WebSocket 选项

#### Trojan 特定字段
- `password` - 密码
- `sni` - SNI
- `network` - 传输协议
- `ws-opts` - WebSocket 选项
- `skip-cert-verify` - 跳过证书验证

#### Shadowsocks 特定字段
- `cipher` - 加密方式
- `password` - 密码

## 限制和注意事项

### 1. 不支持的传输协议
- ❌ gRPC
- ❌ HTTP/2
- ❌ QUIC
- ✅ TCP
- ✅ WebSocket

### 2. 不支持的协议类型
- ❌ Hysteria
- ❌ Hysteria2
- ❌ Tuic
- ❌ WireGuard

### 3. 字段映射
某些 Clash 特有的字段可能无法完全转换，但核心连接参数都会保留。

### 4. 性能考虑
- Clash YAML 解析比 URL 列表稍慢
- 大型订阅（>1000 节点）可能需要更长时间

## 故障排查

### 问题 1: 无法解析 Clash YAML

**症状**: 日志显示 "解析到 0 个节点"

**解决方案**:
1. 检查 YAML 格式是否正确
2. 确保包含 `proxies:` 字段
3. 查看日志中的详细错误信息

### 问题 2: 节点转换失败

**症状**: 部分节点没有被提取

**解决方案**:
1. 检查节点类型是否支持（ss/vmess/trojan/vless）
2. 确保必需字段存在（server, port, uuid/password）
3. 查看控制台日志

### 问题 3: 转换后的节点无法连接

**症状**: TCP 初筛或 Clash 测试失败

**解决方案**:
1. 验证原始 Clash 配置是否可用
2. 检查转换后的 URL 格式
3. 确认服务器地址和端口正确

## 更新日志

### v1.1.0 (2025-01-23)
- ✅ 新增 Clash YAML 格式支持
- ✅ 新增 VLESS 协议支持
- ✅ 自动识别订阅格式
- ✅ 支持 Base64 编码的 Clash YAML
- ✅ 改进节点提取逻辑

## 相关文件

- `src/lib/scanner.ts` - 节点提取和解析逻辑
- `src/lib/clash.ts` - Clash Core 测试和代理转换
- `package.json` - 依赖配置（yaml 库）

## 测试

### 测试 Clash YAML 解析

创建测试文件 `test-clash.yaml`:
```yaml
proxies:
  - name: 测试节点
    type: vless
    server: test.example.com
    port: 443
    uuid: 12345678-1234-1234-1234-123456789012
    tls: true
    network: ws
    ws-opts:
      path: /test
```

添加到订阅源并执行扫描，应该能看到节点被正确提取。
