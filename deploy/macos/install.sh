#!/bin/bash
set -e

PLIST_NAME="com.binhminhart.server.plist"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
TARGET_DIR="$HOME/Library/LaunchAgents"
TARGET_PLIST="$TARGET_DIR/$PLIST_NAME"

# Detect node binary dynamically across standard macOS environments
NODE_BIN=""
if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
else
    for candidate in "$HOME/.nodejs/bin/node" "/usr/local/bin/node" "/opt/homebrew/bin/node" "/Users/mac/.nodejs/bin/node"; do
        if [ -x "$candidate" ]; then
            NODE_BIN="$candidate"
            break
        fi
    done
fi

if [ -z "$NODE_BIN" ]; then
    echo "❌ Lỗi: Không tìm thấy Node.js trên hệ thống!" >&2
    exit 1
fi

echo "=========================================================="
echo "  BÌNH MINH ART - CÀI ĐẶT DAEMON DỊCH VỤ NỀN MACOS        "
echo "=========================================================="
echo "  Thư mục dự án: $PROJECT_DIR"
echo "  Trình thực thi Node: $NODE_BIN"

mkdir -p "$TARGET_DIR"
mkdir -p "$PROJECT_DIR/data"
mkdir -p "$PROJECT_DIR/certs"

# Stop existing daemon if registered
if launchctl list com.binhminhart.server >/dev/null 2>&1; then
    echo "Đang dừng tiến trình BinhMinhArt daemon cũ..."
    launchctl bootout "gui/$(id -u)/com.binhminhart.server" 2>/dev/null || \
    launchctl unload "$TARGET_PLIST" 2>/dev/null || \
    launchctl remove com.binhminhart.server 2>/dev/null || true
    sleep 1
fi

# Ensure port 5001 is completely free from lingering processes before starting daemon
for i in {1..5}; do
    OLD_PIDS="$(lsof -ti :5001 2>/dev/null || true)"
    if [ -z "$OLD_PIDS" ]; then
        break
    fi
    echo "Đang đợi cổng 5001 giải phóng (PIDs: $OLD_PIDS)..."
    echo "$OLD_PIDS" | xargs kill 2>/dev/null || true
    sleep 1
done
OLD_PIDS="$(lsof -ti :5001 2>/dev/null || true)"
if [ -n "$OLD_PIDS" ]; then
    echo "$OLD_PIDS" | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Render plist file with dynamic actual paths
NODE_DIR="$(dirname "$NODE_BIN")"
cat <<EOF > "$TARGET_PLIST"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.binhminhart.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_BIN</string>
        <string>$PROJECT_DIR/server/index.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ThrottleInterval</key>
    <integer>5</integer>
    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR</string>
    <key>StandardOutPath</key>
    <string>$PROJECT_DIR/data/server.log</string>
    <key>StandardErrorPath</key>
    <string>$PROJECT_DIR/data/server_error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$NODE_DIR:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>PORT</key>
        <string>5001</string>
    </dict>
</dict>
</plist>
EOF

chmod 644 "$TARGET_PLIST"

# Synchronize template file in repo
cp "$TARGET_PLIST" "$SCRIPT_DIR/$PLIST_NAME"

echo "Đang kích hoạt LaunchAgent daemon..."
launchctl load "$TARGET_PLIST" 2>/dev/null || launchctl bootstrap "gui/$(id -u)" "$TARGET_PLIST" 2>/dev/null || true

# Wait and poll for server to be ready on port 5001 (up to 10 seconds)
SERVER_UP=false
for i in {1..10}; do
    if lsof -i :5001 >/dev/null 2>&1; then
        SERVER_UP=true
        break
    fi
    sleep 1
done

if [ "$SERVER_UP" = true ]; then
    echo "✅ BinhMinhArt daemon đã được cài đặt và đang chạy nền thành công (Cổng 5001 HTTPS)."
else
    echo "⚠️ Daemon đã đăng ký vào LaunchAgents. Đang khởi tạo dịch vụ nền..."
fi
