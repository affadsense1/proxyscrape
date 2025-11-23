#!/bin/bash

BIN_DIR="bin"
TARGET_FILE="$BIN_DIR/mihomo"

echo ""
echo "Mihomo Core Downloader (Linux)"
echo "==============================="
echo ""

if [ -f "$TARGET_FILE" ]; then
    echo "[OK] Mihomo already exists: $TARGET_FILE"
    exit 0
fi

mkdir -p "$BIN_DIR"

VERSION="v1.18.10"
URL="https://github.com/MetaCubeX/mihomo/releases/download/$VERSION/mihomo-linux-amd64-$VERSION.gz"

echo "Downloading from: $URL"

curl -L -o "$BIN_DIR/mihomo.gz" "$URL"

if [ $? -eq 0 ]; then
    echo "[OK] Downloaded"
    
    gunzip -f "$BIN_DIR/mihomo.gz"
    
    mv "$BIN_DIR/mihomo-linux-amd64-$VERSION" "$TARGET_FILE" 2>/dev/null || true
    mv "$BIN_DIR/mihomo" "$TARGET_FILE" 2>/dev/null || true
    
    chmod +x "$TARGET_FILE"
    
    echo "[OK] Installation complete: $TARGET_FILE"
else
    echo "[ERROR] Download failed"
    echo "Please download manually from: https://github.com/MetaCubeX/mihomo/releases"
fi
