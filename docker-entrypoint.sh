#!/bin/sh
# Claude Code Haha — container entrypoint
# Starts the API server and IM adapter sidecars.

set -e

echo "[boot] Starting Claude Code Haha server..."

# Start main API + WebSocket server in background
bun run /app/src/server/index.ts --host "${SERVER_HOST:-0.0.0.0}" --port "${SERVER_PORT:-3456}" &
SERVER_PID=$!

# Start Telegram sidecar if configured
if [ -f /home/bun/.claude/adapters.json ] && \
   grep -q '"botToken"' /home/bun/.claude/adapters.json 2>/dev/null; then
  echo "[boot] Starting Telegram adapter..."
  bun run /app/adapters/telegram/index.ts &
fi

# Start WeChat sidecar if configured
if [ -f /home/bun/.claude/adapters.json ] && \
   grep -q '"accountId"' /home/bun/.claude/adapters.json 2>/dev/null; then
  echo "[boot] Starting WeChat adapter..."
  bun run /app/adapters/wechat/index.ts &
fi

echo "[boot] Server PID: $SERVER_PID"
echo "[boot] Ready. Listening on http://0.0.0.0:${SERVER_PORT:-3456}"

# Wait for main server process
wait $SERVER_PID
