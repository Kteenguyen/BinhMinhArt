# Implementer Progress: Chẩn đoán & Khôi phục Server BinhMinhArt sau Restart

## 1. Trạng Thái Hiện Tại
- **Tiến trình Server**: Đã khôi phục thành công dưới dạng daemon macOS launchd (`com.binhminhart.server.plist`). Server đang lắng nghe liên tục trên cổng 5001 (`0.0.0.0:5001`).
- **Địa chỉ LAN IP**: `192.168.0.111` (Interface `en0`).
- **Giao thức HTTPS**: Độc quyền trên cổng 5001. Cơ chế TCP Multiplexer tự động chuyển hướng HTTP (301) sang HTTPS.
- **Dữ liệu & Đồng bộ**: Đồng bộ thành công với Google Sheets API (`sheetDB`), báo cáo Excel tự động xuất bình thường.
- **Khởi động cùng hệ thống**: Đã thiết lập LaunchAgent tại `~/Library/LaunchAgents/com.binhminhart.server.plist` với `RunAtLoad: true` và `KeepAlive: true` để tự khởi động mỗi khi khởi động lại máy.

## 2. Các Bước Đã Thực Hiện
1. Kiểm tra port 5001: Phát hiện cổng trống do máy vừa restart và server chưa được đăng ký daemon hệ thống.
2. Kiểm tra chứng chỉ SSL: `certs/cert.pem` & `certs/key.pem` hợp lệ (Subject: CN=BinhMinhArt, O=BinhMinhGallery, hạn đến Oct 25 2027).
3. Xác định địa chỉ LAN IP: `192.168.0.111` (mạng WiFi/LAN `en0`).
4. Tạo cấu hình Daemon macOS:
   - `deploy/macos/com.binhminhart.server.plist`
   - `deploy/macos/install.sh`
   - `deploy/macos/uninstall.sh`
5. Cài đặt và kích hoạt daemon với `launchctl`.
6. Tinh chỉnh `start_app.command` phòng thủ: Kiểm tra nếu server đã chạy nền thì chỉ mở trình duyệt, tránh xung đột `EADDRINUSE`.
7. Kiểm thử HTTP 301 Redirect và HTTPS 200 OK trên localhost, 127.0.0.1 và `192.168.0.111`.
8. Kiểm thử các API cốt lõi (`/api/paintings`, `/api/network-info`, `/api/customers`, `/api/qr/:id`).
9. Xây dựng tài liệu hướng dẫn truy cập chi tiết và cách xử lý cảnh báo SSL self-signed trên iOS, Android, PC.
