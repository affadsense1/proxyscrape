# 订阅 API 使用说明

## 概述

系统提供了灵活的订阅 API，支持多种格式导出，可以直接在各种代理客户端中使用。

## API 端点

```
GET /api/subscribe
```

## 支持的格式

### 1. Base64 格式（默认）

**用途**: 适用于大多数代理客户端（V2Ray、Shadowrocket、Clash 等）

**URL 格式**:
```
https://your-domain.com/api/subscribe?key=your-key
```

**返回内容**: Base64 编码的代理 URL 列表
```
c3M6Ly9ZV1Z6TFRJMU5pMW5ZMjA2Y0dGemMzZHZjbVJBYzJWeWRtVnlMbU52YlRvNE16ZzQjJUYwJTlGJTg3JUFEJUYwJTlGJTg3JUIwJTIwJUU5JUE2JTk5JUU2JUI4JUFGJUU4JThBJTgyJUU3JTgyJUI5CnZtZXNzOi8vZXlKMklqb2lNaUlzSW5Ceklqb2k4SitIcmZDZmg3QWc1cGF3NVlxZzVaMmhJaXdpWVdSa0lqb2ljMmN1WlhoaGJYQnNaUzVqYjIwaUxDSndiM0owSWpvaU5EUXpJaXdpYVdRaU9pSXhNak0wTlRZM09DMHhNak0wTFRFeU16UXRNVEl6TkMweE1qTTBOVFkzT0Rrd01USWlMQ0poYVdRaU9pSXdJaXdpYm1WMElqb2lkM01pTENKMGVYQmxJam9pYm05dVpTSXNJbWh2YzNRaU9pSnpaeTVsZUdGdGNHeGxMbU52YlNJc0luQmhkR2dpT2lJdmRtMWxjM01pTENKMGJITWlPaUowYkhNaUxDSnpibWtpT2lKelp5NWxlR0Z0Y0d4bExtTnZiU0o5Cg==
```

**解码后内容**:
```
ss://YWVzLTI1Ni1nY206cGFzc3dvcmRAc2VydmVyLmNvbTo4Mzg4#🇭🇰 香港节点
vmess://eyJ2IjoiMiIsInBzIjoi8J+HrfCfh7Ag6aaZ5riv6IqC54K5IiwiYWRkIjoic2cuZXhhbXBsZS5jb20iLCJwb3J0IjoiNDQzIiwiaWQiOiIxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODkwMTIiLCJhaWQiOiIwIiwibmV0Ijoid3MiLCJ0eXBlIjoibm9uZSIsImhvc3QiOiJzZy5leGFtcGxlLmNvbSIsInBhdGgiOiIvdm1lc3MiLCJ0bHMiOiJ0bHMiLCJzbmkiOiJzZy5leGFtcGxlLmNvbSJ9
...
```

### 2. Clash YAML 格式（新增）

**用途**: 专门用于 Clash / Clash for Windows / Clash for Android 等客户端

**URL 格式**:
```
https://your-domain.com/api/subscribe?key=your-key&format=clash
```

或

```
https://your-domain.com/api/subscribe?key=your-key&format=yaml
```

**返回内容**: 完整的 Clash 配置文件（YAML 格式）

```yaml
port: 7890
socks-port: 7891
allow-lan: false
mode: Rule
log-level: info
external-controller: 127.0.0.1:9090

proxies:
  - name: 🇭🇰 香港 IEPL
    type: vless
    server: hk.example.com
    port: 443
    uuid: 12345678-1234-1234-1234-123456789012
    tls: true
    network: ws
    ws-opts:
      path: /vless
      headers:
        Host: hk.example.com
  
  - name: 🇸🇬 新加坡 BGP
    type: vmess
    server: sg.example.com
    port: 443
    uuid: 87654321-4321-4321-4321-210987654321
    alterId: 0
    cipher: auto
    tls: true
    network: ws
    ws-opts:
      path: /vmess
      headers:
        Host: sg.example.com

proxy-groups:
  - name: 🚀 节点选择
    type: select
    proxies:
      - ♻️ 自动选择
      - 🎯 全球直连
      - 🇭🇰 香港 IEPL
      - 🇸🇬 新加坡 BGP
  
  - name: ♻️ 自动选择
    type: url-test
    proxies:
      - 🇭🇰 香港 IEPL
      - 🇸🇬 新加坡 BGP
    url: http://www.gstatic.com/generate_204
    interval: 300
  
  - name: 🎯 全球直连
    type: select
    proxies:
      - DIRECT

rules:
  - DOMAIN-SUFFIX,local,DIRECT
  - IP-CIDR,127.0.0.0/8,DIRECT
  - IP-CIDR,172.16.0.0/12,DIRECT
  - IP-CIDR,192.168.0.0/16,DIRECT
  - IP-CIDR,10.0.0.0/8,DIRECT
  - GEOIP,CN,DIRECT
  - MATCH,🚀 节点选择
```

## 参数说明

### 必需参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `key` | 订阅密钥（在系统配置中设置） | `?key=your-secret-key` |

### 可选参数

| 参数 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| `format` | 导出格式 | `base64`, `clash`, `yaml` | `base64` |

## 使用示例

### 示例 1: V2Ray / V2RayN

1. 打开 V2RayN
2. 订阅 → 订阅设置
3. 添加订阅地址：
   ```
   https://your-domain.com/api/subscribe?key=your-key
   ```
4. 更新订阅

### 示例 2: Clash for Windows

1. 打开 Clash for Windows
2. Profiles → 输入订阅地址：
   ```
   https://your-domain.com/api/subscribe?key=your-key&format=clash
   ```
3. Download
4. 选择配置文件

### 示例 3: Clash for Android

1. 打开 Clash for Android
2. 配置 → 新配置 → URL
3. 输入订阅地址：
   ```
   https://your-domain.com/api/subscribe?key=your-key&format=clash
   ```
4. 保存并选择配置

### 示例 4: Shadowrocket (iOS)

1. 打开 Shadowrocket
2. 首页 → 右上角 + → 类型选择 Subscribe
3. URL 输入：
   ```
   https://your-domain.com/api/subscribe?key=your-key
   ```
4. 保存

### 示例 5: Quantumult X (iOS)

1. 打开 Quantumult X
2. 设置 → 节点 → 引用（订阅）
3. 添加订阅地址：
   ```
   https://your-domain.com/api/subscribe?key=your-key
   ```
4. 更新

## Clash 配置说明

### 代理组

系统自动生成三个代理组：

1. **🚀 节点选择** (select)
   - 手动选择节点
   - 包含所有可用节点

2. **♻️ 自动选择** (url-test)
   - 自动选择延迟最低的节点
   - 每 5 分钟测试一次
   - 测试 URL: `http://www.gstatic.com/generate_204`

3. **🎯 全球直连** (select)
   - 直连模式（不使用代理）

### 规则

默认规则集：
- 本地地址直连
- 私有 IP 段直连
- 中国大陆 IP 直连
- 其他流量使用节点选择

### 自定义配置

如果需要自定义 Clash 配置，可以：

1. 下载订阅文件
2. 使用文本编辑器打开
3. 修改 `proxy-groups` 和 `rules` 部分
4. 保存并导入 Clash

## 订阅更新

### 自动更新

大多数客户端支持自动更新订阅：

- **Clash for Windows**: 设置 → 自动更新间隔
- **V2RayN**: 订阅设置 → 自动更新间隔
- **Shadowrocket**: 订阅设置 → 自动更新

### 手动更新

在客户端中点击"更新订阅"按钮即可。

### 更新频率建议

- 建议设置为 24 小时自动更新一次
- 系统会自动过滤掉不可用的节点
- 每次更新都会获取最新的可用节点列表

## 响应头说明

### Base64 格式

```
Content-Type: text/plain; charset=utf-8
Cache-Control: no-cache
Profile-Update-Interval: 24
Subscription-Userinfo: upload=0; download=0; total=10737418240; expire=1706227200
```

### Clash 格式

```
Content-Type: text/yaml; charset=utf-8
Content-Disposition: inline; filename="clash.yaml"
Cache-Control: no-cache
Profile-Update-Interval: 24
Subscription-Userinfo: upload=0; download=0; total=10737418240; expire=1706227200
```

**字段说明**:
- `Profile-Update-Interval`: 建议更新间隔（小时）
- `Subscription-Userinfo`: 订阅信息
  - `upload`: 已上传流量（字节）
  - `download`: 已下载流量（字节）
  - `total`: 总流量（字节，10GB）
  - `expire`: 过期时间（Unix 时间戳，30 天后）

## 安全建议

### 1. 保护订阅密钥

- 不要在公共场合分享订阅链接
- 定期更换订阅密钥
- 使用强密码作为密钥

### 2. 使用 HTTPS

- 确保使用 HTTPS 访问订阅链接
- 避免在不安全的网络环境下更新订阅

### 3. 限制访问

- 可以在反向代理（如 Nginx）中添加 IP 白名单
- 使用 CDN 隐藏真实服务器 IP

## 故障排查

### 问题 1: 403 Forbidden

**原因**: 订阅密钥错误

**解决方案**:
1. 检查 URL 中的 `key` 参数
2. 确认系统配置中的 `subscribeKey`
3. 确保密钥完全匹配（区分大小写）

### 问题 2: 返回空内容

**原因**: 没有可用节点

**解决方案**:
1. 执行一次扫描
2. 确保有节点通过测试
3. 检查节点数据文件 `data/nodes.json`

### 问题 3: Clash 导入失败

**原因**: YAML 格式错误或客户端不支持

**解决方案**:
1. 使用在线 YAML 验证器检查格式
2. 确保使用最新版本的 Clash
3. 尝试使用 Base64 格式

### 问题 4: 节点无法连接

**原因**: 节点已失效或网络问题

**解决方案**:
1. 更新订阅获取最新节点
2. 在系统中重新扫描
3. 检查本地网络连接

## API 响应示例

### 成功响应（Base64）

```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Cache-Control: no-cache

c3M6Ly9ZV1Z6TFRJMU5pMW5ZMjA2Y0dGemMzZHZjbVJBYzJWeWRtVnlMbU52YlRvNE16ZzQjJUYwJTlGJTg3JUFEJUYwJTlGJTg3JUIwJTIwJUU5JUE2JTk5JUU2JUI4JUFGJUU4JThBJTgyJUU3JTgyJUI5...
```

### 成功响应（Clash）

```
HTTP/1.1 200 OK
Content-Type: text/yaml; charset=utf-8
Content-Disposition: inline; filename="clash.yaml"
Cache-Control: no-cache

port: 7890
socks-port: 7891
...
```

### 错误响应

```
HTTP/1.1 403 Forbidden
Forbidden
```

```
HTTP/1.1 500 Internal Server Error
Internal Server Error
```

## 技术实现

### URL 转 Clash 代理

系统会自动将存储的代理 URL 转换为 Clash 代理对象：

- **SS**: `ss://` → Clash SS 配置
- **VMess**: `vmess://` → Clash VMess 配置
- **Trojan**: `trojan://` → Clash Trojan 配置
- **VLESS**: `vless://` → Clash VLESS 配置

### 节点过滤

只导出满足以下条件的节点：
- `latency > 0`（延迟大于 0，表示可用）
- 成功通过 TCP 初筛或 Clash 测试

### 标签生成

节点标签包含以下信息：
- 国旗 Emoji
- 国家/地区名称
- ISP 信息
- 地区信息
- 原生/广播 IP 标识

示例：`🇭🇰|中国香港|HKT Limited|原生IP`

## 相关文件

- `src/app/api/subscribe/route.ts` - 订阅 API 实现
- `src/lib/store.ts` - 节点数据存储
- `data/nodes.json` - 节点数据文件
- `data/config.json` - 系统配置（包含订阅密钥）

## 更新日志

### v1.1.0 (2025-01-23)
- ✅ 新增 Clash YAML 格式导出
- ✅ 支持 VLESS 协议
- ✅ 自动生成代理组和规则
- ✅ 添加订阅信息响应头
- ✅ 改进节点标签生成

### v1.0.0
- ✅ Base64 格式导出
- ✅ 订阅密钥验证
- ✅ 节点过滤和标签
