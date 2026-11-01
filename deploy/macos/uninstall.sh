#!/bin/bash
set -e

PLIST_NAME="com.binhminhart.server.plist"
TARGET_PLIST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "=========================================================="
echo "  BÌNH MINH ART - GỠ BỎ DAEMON DỊCH VỤ NỀN MACOS          "
echo "=========================================================="

# 1. Unregister from launchctl by label and by plist
if launchctl list com.binhminhart.server >/dev/null 2>&1; then
    echo "Đang dừng và hủy đăng ký BinhMinhArt LaunchAgent daemon..."
    launchctl bootout "gui/$(id -u)/com.binhminhart.server" 2>/dev/null || \
    launchctl unload "$TARGET_PLIST" 2>/dev/null || \
    launchctl remove com.binhminhart.server 2>/dev/null || true
    sleep 1
fi

# 2. Delete plist file from ~/Library/LaunchAgents if it exists
if [ -f "$TARGET_PLIST" ]; then
    rm -f "$TARGET_PLIST"
    echo "Đã xóa file cấu hình daemon khỏi LaunchAgents."
else
    echo "File cấu hình daemon không còn trong LaunchAgents."
fi

# 3. Clean up any remaining processes on port 5001
for i in {1..5}; do
    RUNNING_PIDS="$(lsof -ti :5001 2>/dev/null || true)"
    if [ -z "$RUNNING_PIDS" ]; then
        break
    fi
    echo "Đang dừng tiến trình trên cổng 5001 (PIDs: $RUNNING_PIDS)..."
    echo "$RUNNING_PIDS" | xargs kill -9 2>/dev/null || true
    sleep 1
done

echo "✅ Đã gỡ bỏ dịch vụ nền BinhMinhArt thành công (Cổng 5001 đã giải phóng)."
