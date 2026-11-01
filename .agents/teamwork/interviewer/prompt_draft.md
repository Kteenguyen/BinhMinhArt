This is a single self-contained fix; keep it small and focused. Chẩn đoán sự cố không truy cập được vào ứng dụng web BinhMinhArt sau khi khởi động lại máy, khôi phục dịch vụ trên cổng 5001 chạy HTTPS, kiểm tra địa chỉ IP mạng nội bộ (LAN IP), chứng chỉ bảo mật và hướng dẫn truy cập chi tiết.

Working directory: /Users/mac/Documents/antigravity/BinhMinhArt
Integrity mode: development

## Requirements

### R1. Kiểm tra và Khôi phục Tiến trình Server
Kiểm tra trạng thái tiến trình Node.js server trên cổng 5001. Nếu server chưa chạy (do máy vừa khởi động lại), khởi động lại server chạy nền (daemon). Xác định chính xác địa chỉ IP LAN hiện tại của máy chủ trong mạng nội bộ.

### R2. Xác thực Giao thức HTTPS và Chuyển hướng Mạng
Đảm bảo cổng 5001 hoạt động chuẩn xác với giao thức HTTPS duy nhất: mọi kết nối HTTP thông thường tự động nhận mã chuyển hướng 301 sang HTTPS. Kiểm tra khả năng kết nối trên cả localhost và địa chỉ LAN IP.

### R3. Kiểm thử Toàn diện Hệ thống và Xử lý Cảnh báo Chứng chỉ SSL
Kiểm tra hoạt động của các API chính, đồng bộ Google Sheets và giao diện web. Kiểm tra hành vi chứng chỉ SSL tự ký (self-signed) trên các trình duyệt di động (iOS Safari, Android Chrome) và máy tính, cung cấp hướng dẫn rõ ràng từng bước để người dùng vượt qua cảnh báo chứng chỉ bảo mật và truy cập thành công vào ứng dụng.

## Acceptance Criteria

### Khả năng sẵn sàng của Server
- [ ] Tiến trình Node.js đang hoạt động và lắng nghe trên cổng 5001.
- [ ] Địa chỉ LAN IP thực tế hiện tại của máy chủ được xác định và phản hồi kết nối.
- [ ] Gửi yêu cầu HTTP tới cổng 5001 trả về mã 301 chuyển hướng sang HTTPS.
- [ ] Gửi yêu cầu HTTPS tới cổng 5001 trả về 200 OK trên cả localhost và địa chỉ LAN IP.

### Kiểm thử Vận hành & Hướng dẫn Người dùng
- [ ] Các API cốt lõi và kết nối dữ liệu hoạt động bình thường qua HTTPS.
- [ ] Có hướng dẫn từng bước cụ thể (kèm URL truy cập chính xác và cách bấm Bỏ qua / Tiếp tục truy cập khi gặp cảnh báo SSL tự ký trên điện thoại/máy tính) để người dùng vào được hệ thống ngay lập tức.
