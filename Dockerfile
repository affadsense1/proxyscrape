# 多阶段构建
FROM node:20-alpine AS base

# 安装依赖阶段
FROM base AS deps
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json* ./
RUN npm ci

# 构建阶段
FROM base AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 下载 Clash Core (支持多架构)
RUN apk add --no-cache curl file && \
    mkdir -p bin && \
    MIHOMO_VERSION="v1.18.10" && \
    # 使用 TARGETARCH 环境变量（由 buildx 自动设置）
    case ${TARGETARCH:-$(uname -m)} in \
        amd64|x86_64) MIHOMO_ARCH="amd64" ;; \
        arm64|aarch64) MIHOMO_ARCH="arm64" ;; \
        arm|armv7l) MIHOMO_ARCH="armv7" ;; \
        *) echo "Unsupported architecture: ${TARGETARCH:-$(uname -m)}" && exit 1 ;; \
    esac && \
    echo "Downloading Mihomo ${MIHOMO_VERSION} for ${MIHOMO_ARCH}..." && \
    curl -L -o mihomo.gz "https://github.com/MetaCubeX/mihomo/releases/download/${MIHOMO_VERSION}/mihomo-linux-${MIHOMO_ARCH}-${MIHOMO_VERSION}.gz" && \
    gunzip mihomo.gz && \
    mv mihomo bin/mihomo && \
    chmod +x bin/mihomo && \
    # 验证文件
    file bin/mihomo && \
    ls -lh bin/mihomo && \
    # 测试二进制文件
    bin/mihomo -v && \
    echo "✓ Mihomo ${MIHOMO_VERSION} (${MIHOMO_ARCH}) installed and verified successfully"

# 构建项目（使用 standalone 模式）
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 生产运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 创建目录（先创建，确保存在）
RUN mkdir -p data bin

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 重要：单独复制 mihomo 二进制文件（Next.js standalone 不会自动复制 bin 目录）
COPY --from=builder /app/bin/mihomo ./bin/mihomo

# 设置权限并验证
RUN chmod +x bin/mihomo && \
    chown -R nextjs:nodejs data bin && \
    echo "========== Mihomo 文件验证 ==========" && \
    ls -la bin/ && \
    echo "文件详情:" && \
    ls -lh bin/mihomo && \
    stat bin/mihomo && \
    echo "========== 验证完成 =========="

# 创建启动脚本来处理权限问题
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo '# 验证 mihomo 二进制文件' >> /app/entrypoint.sh && \
    echo 'if [ -f /app/bin/mihomo ]; then' >> /app/entrypoint.sh && \
    echo '  echo "[Startup] Mihomo binary found"' >> /app/entrypoint.sh && \
    echo '  ls -lh /app/bin/mihomo' >> /app/entrypoint.sh && \
    echo '  chmod +x /app/bin/mihomo 2>/dev/null || true' >> /app/entrypoint.sh && \
    echo 'else' >> /app/entrypoint.sh && \
    echo '  echo "[Startup] WARNING: Mihomo binary not found at /app/bin/mihomo"' >> /app/entrypoint.sh && \
    echo 'fi' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo '# 确保数据目录有正确的权限' >> /app/entrypoint.sh && \
    echo 'if [ -d /app/data ]; then' >> /app/entrypoint.sh && \
    echo '  chown -R nextjs:nodejs /app/data 2>/dev/null || true' >> /app/entrypoint.sh && \
    echo '  chmod -R 755 /app/data 2>/dev/null || true' >> /app/entrypoint.sh && \
    echo 'fi' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo 'if [ -d /app/bin ]; then' >> /app/entrypoint.sh && \
    echo '  chown -R nextjs:nodejs /app/bin 2>/dev/null || true' >> /app/entrypoint.sh && \
    echo '  chmod -R 755 /app/bin 2>/dev/null || true' >> /app/entrypoint.sh && \
    echo 'fi' >> /app/entrypoint.sh && \
    echo '' >> /app/entrypoint.sh && \
    echo '# 切换到 nextjs 用户并启动应用' >> /app/entrypoint.sh && \
    echo 'exec su-exec nextjs node server.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# 安装 su-exec（轻量级的 gosu 替代品）
USER root
RUN apk add --no-cache su-exec

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 使用 entrypoint 脚本启动
CMD ["/app/entrypoint.sh"]
