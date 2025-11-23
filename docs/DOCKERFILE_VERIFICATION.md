# Dockerfile 顺序验证清单

## ✅ 正确的执行顺序

### Builder 阶段 (构建镜像)
```dockerfile
1. 安装 curl 和 file 工具
2. 创建 bin 目录
3. 下载 mihomo 压缩包
4. 解压并移动到 bin/mihomo
5. 设置执行权限 (chmod +x)
6. 验证文件类型 (file)
7. 列出文件信息 (ls -lh)
8. 测试版本 (mihomo -v)
9. 构建 Next.js 项目
```

### Runner 阶段 (运行镜像)
```dockerfile
1. 创建 nextjs 用户和 nodejs 组
2. ✅ 创建 data 和 bin 目录（空目录）
3. ✅ 复制 Next.js 构建产物
4. ✅ 复制 mihomo 二进制文件到 bin/mihomo
5. ✅ 设置 mihomo 执行权限 + 设置目录所有者
6. ✅ 验证文件存在 (ls -la)
7. 创建 entrypoint.sh 启动脚本
8. 安装 su-exec 工具
```

## 🔍 关键验证点

### ✅ 1. 目录创建在文件复制之前
```dockerfile
# ✅ 正确：先创建目录
RUN mkdir -p data bin

# ✅ 然后复制文件
COPY --from=builder /app/bin/mihomo ./bin/mihomo
```

**为什么重要**：确保目标目录存在，避免复制失败。

### ✅ 2. 文件复制在权限设置之前
```dockerfile
# ✅ 正确：先复制文件
COPY --from=builder /app/bin/mihomo ./bin/mihomo

# ✅ 然后设置权限
RUN chmod +x bin/mihomo && chown -R nextjs:nodejs data bin
```

**为什么重要**：只能对已存在的文件设置权限。

### ✅ 3. 权限设置合并为一个 RUN 命令
```dockerfile
# ✅ 正确：一次性设置所有权限
RUN chmod +x bin/mihomo && \
    chown -R nextjs:nodejs data bin && \
    ls -la bin/mihomo
```

**为什么重要**：
- 减少镜像层数
- 确保权限设置的原子性
- 立即验证结果

### ✅ 4. 不在 runner 阶段使用 file 命令
```dockerfile
# ❌ 错误：runner 阶段没有 file 命令
RUN file bin/mihomo

# ✅ 正确：只在 builder 阶段使用
# (builder 阶段已安装 file 工具)
```

**为什么重要**：runner 阶段基于 alpine，默认不包含 file 命令。

## 📋 完整的 Runner 阶段流程

```dockerfile
# 生产运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 步骤 1: 创建用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 步骤 2: 创建目录
RUN mkdir -p data bin

# 步骤 3: 复制 Next.js 构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 步骤 4: 复制 mihomo 二进制文件
COPY --from=builder /app/bin/mihomo ./bin/mihomo

# 步骤 5: 设置权限并验证
RUN chmod +x bin/mihomo && \
    chown -R nextjs:nodejs data bin && \
    ls -la bin/mihomo && \
    echo "✓ Mihomo binary copied and verified"

# 步骤 6: 创建启动脚本
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    # ... (启动脚本内容)
    chmod +x /app/entrypoint.sh

# 步骤 7: 安装运行时依赖
USER root
RUN apk add --no-cache su-exec

# 步骤 8: 配置容器
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 步骤 9: 设置启动命令
CMD ["/app/entrypoint.sh"]
```

## 🧪 验证测试

### 测试 1: 验证 Builder 阶段生成文件
```bash
docker build --target builder -t proxy-pool:builder .
docker run --rm proxy-pool:builder ls -la /app/bin/
```

**预期输出**：
```
-rwxr-xr-x    1 root     root      12.5M mihomo
```

### 测试 2: 验证 Runner 阶段复制文件
```bash
docker build -t proxy-pool:test .
docker run --rm proxy-pool:test ls -la /app/bin/
```

**预期输出**：
```
-rwxr-xr-x    1 nextjs   nodejs    12.5M mihomo
```

### 测试 3: 验证文件可执行
```bash
docker run --rm proxy-pool:test /app/bin/mihomo -v
```

**预期输出**：
```
Mihomo v1.18.10 linux/amd64 with go1.21.5 ...
```

### 测试 4: 验证启动脚本
```bash
docker run --rm proxy-pool:test cat /app/entrypoint.sh
```

**预期输出**：应该包含 mihomo 验证逻辑。

## ❌ 常见错误模式

### 错误 1: 在创建目录前复制文件
```dockerfile
# ❌ 错误
COPY --from=builder /app/bin/mihomo ./bin/mihomo
RUN mkdir -p bin  # 太晚了
```

### 错误 2: 在复制文件前设置权限
```dockerfile
# ❌ 错误
RUN chmod +x bin/mihomo  # 文件还不存在
COPY --from=builder /app/bin/mihomo ./bin/mihomo
```

### 错误 3: 使用不存在的命令
```dockerfile
# ❌ 错误：runner 阶段没有 file 命令
RUN file bin/mihomo
```

### 错误 4: 复制整个目录但目录已存在
```dockerfile
# ❌ 可能有问题
RUN mkdir -p bin
COPY --from=builder /app/bin ./bin  # 可能覆盖或合并
```

## ✅ 当前 Dockerfile 状态

- ✅ 目录创建顺序正确
- ✅ 文件复制顺序正确
- ✅ 权限设置顺序正确
- ✅ 没有使用不存在的命令
- ✅ 权限设置合并优化
- ✅ 包含验证步骤

## 🚀 构建测试命令

```bash
# 完整构建测试
docker build -t proxy-pool:test . && \
docker run --rm proxy-pool:test ls -la /app/bin/mihomo && \
docker run --rm proxy-pool:test /app/bin/mihomo -v && \
echo "✅ All tests passed!"
```

## 📝 总结

当前 Dockerfile 的顺序是**完全正确**的：

1. ✅ 先创建目录
2. ✅ 再复制文件
3. ✅ 最后设置权限
4. ✅ 立即验证结果

这个顺序确保了：
- 文件能够成功复制
- 权限能够正确设置
- 构建过程可以及时发现问题
- 最终镜像包含可执行的 mihomo 文件
