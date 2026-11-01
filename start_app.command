#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
cd "$SCRIPT_DIR"

# Ensure standard Node.js binary paths are present when double-clicked from macOS Finder
export PATH="/Users/mac/.nodejs/bin:/opt/homebrew/bin:/usr/local/bin:$HOME/.nodejs/bin:$PATH"

echo "=========================================================="
echo "  BÌNH MINH ART GALLERY - DASHBOARD QUẢN LÝ KHO TRANH     "
echo "=========================================================="
echo "Đang kiểm tra và khởi động hệ thống..."

# 1. Đóng gói giao diện nếu thư mục dist chưa tồn tại
if [ ! -d "dist" ]; then
  echo "Đang đóng gói bản dựng giao diện (npm run build)..."
  npm run build
fi

# 2. Kiểm tra tiến trình máy chủ trên cổng 5001
TARGET_PLIST="$HOME/Library/LaunchAgents/com.binhminhart.server.plist"

if ! lsof -i :5001 >/dev/null 2>&1; then
  if [ -f "$TARGET_PLIST" ]; then
    echo "Đang nạp lại dịch vụ nền LaunchAgent..."
    launchctl load "$TARGET_PLIST" 2>/dev/null || launchctl bootstrap "gui/$(id -u)" "$TARGET_PLIST" 2>/dev/null || true
  fi

  # Chờ tối đa 5 giây xem server đã phản hồi chưa
  for i in {1..5}; do
    if lsof -i :5001 >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if ! lsof -i :5001 >/dev/null 2>&1; then
    echo "Khởi chạy cài đặt daemon dịch vụ nền..."
    bash deploy/macos/install.sh
  fi
fi

# Chờ cổng 5001 sẵn sàng tối đa 10 giây trước khi mở trình duyệt
for i in {1..10}; do
  if lsof -i :5001 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# 3. Xác định địa chỉ LAN IP thực tế hiện tại
LAN_IP="$(node -e "import('./server/network.js').then(m => console.log(m.pickPrimaryLanIp(m.listLanIpv4()) || ''))" 2>/dev/null || true)"
if [ -z "$LAN_IP" ]; then
  LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")"
fi

# 4. Mở trình duyệt trên máy Mac
open "https://localhost:5001"

# 5. Hiển thị thông tin kết nối và hướng dẫn cho người dùng
echo ""
echo "✅ Máy chủ BinhMinhArt đang hoạt động ổn định (HTTPS Cổng 5001)."
echo "----------------------------------------------------------"
echo "📱 ĐỊA CHỈ TRUY CẬP HỆ THỐNG:"
echo "  👉 Trên máy tính Mac này:   https://localhost:5001"
if [ -n "$LAN_IP" ] && [ "$LAN_IP" != "127.0.0.1" ]; then
  echo "  👉 Trên iPhone / iPad / PC: https://$LAN_IP:5001"
fi
echo "----------------------------------------------------------"
echo "🔒 HƯỚNG DẪN VƯỢT QUA CẢNH BÁO BẢO MẬT (CHỨNG CHỈ NỘI BỘ):"
echo "  • iPhone / iPad (Safari):"
echo "    Bấm 'Hiển thị chi tiết' -> 'truy cập trang web này' -> xác nhận Face ID / Mật khẩu máy."
echo "  • Android / Máy tính (Google Chrome, Cốc Cốc, Edge):"
echo "    Bấm 'Nâng cao' -> 'Tiếp tục truy cập (không an toàn)'."
echo "    (Mẹo: Nếu Chrome không hiện nút Nâng cao, bấm vào trang và gõ: thisisunsafe)"
echo "=========================================================="
echo ""
read -t 15 -p "Cửa sổ sẽ tự đóng sau 15 giây (hoặc nhấn Enter để đóng ngay)..." || true
echo ""
