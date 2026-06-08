# =============================================================
# Claude Code Haha — containerized deployment
# Base: Alpine Linux 3.22 + Bun
# =============================================================
FROM alpine:3.22

RUN apk add --no-cache \
    bun=1.3.14-r0 \
    python3 \
    ca-certificates \
    tzdata \
  && rm -rf /var/cache/apk/*

ENV TZ=Asia/Shanghai
ENV BUN_ENV=production
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=3456

WORKDIR /app

# Runtime deps for adapters
COPY adapters/package.json adapters/bun.lock adapters/
RUN cd adapters && bun install --frozen-lockfile 2>/dev/null || cd adapters && bun install

# Source code
COPY . .

RUN mkdir -p /home/bun/.claude && chmod 755 /home/bun/.claude

EXPOSE 3456

# Start script: main server + wechat sidecar
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
