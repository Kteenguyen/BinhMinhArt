# BÁO CÁO TỔNG KẾT BÀN GIAO: KHÔI PHỤC TIẾN TRÌNH SERVER & HƯỚNG DẪN TRUY CẬP HTTPS CỔNG 5001

## 1. Quan Sát (Observation)
- **Hiện tượng ban đầu**: Sau khi máy Mac khởi động lại, ứng dụng web BinhMinhArt không thể truy cập được trên cổng 5001 qua cả localhost và IP mạng LAN nội bộ.
- **Nguyên nhân cốt lõi**:
  1. Ứng dụng trước đó chưa được cài đặt làm dịch vụ nền (LaunchAgent / daemon) của hệ điều hành macOS, do đó không tự khởi động lại khi máy tính bật lại.
  2. Cổng 5001 được cấu hình chạy HTTPS duy nhất, chứng chỉ tự ký cũ là X509v1 thiếu trường mở rộng Subject Alternative Name (SAN), dẫn đến các trình duyệt di động hiện đại (iOS 13+ Safari, Android Chrome) cảnh báo `HostNameMismatch` / `COMMON_NAME_INVALID` và có thể ẩn nút bỏ qua cảnh báo bảo mật.
  3. Thiếu cơ chế chuyển hướng HTTP 301 tự động bảo toàn cổng khi header `Host` không chứa port.
  4. Script khởi chạy `start_app.command` cũ chưa hiển thị địa chỉ LAN IP thực tế và thiếu hướng dẫn vượt qua cảnh báo SSL cho người dùng.

---

## 2. Chuỗi Biện Luận & Các Cải Tiến Đã Thực Hiện (Logic Chain & Architecture)
Quá trình hoàn thiện trải qua 5 vòng thực thi nghiêm ngặt theo mô hình SWE Light (1 Implementer, 3 Adversarial Reviewers, 1 Independent Victory Auditor):

1. **Khôi phục dịch vụ nền macOS LaunchAgent (Implementer & Reviewer 1)**:
   - Tạo file cấu hình `deploy/macos/com.binhminhart.server.plist` với `RunAtLoad: true`, `KeepAlive: true`, và `ThrottleInterval: 5` để tự khởi chạy cùng macOS và tự phục hồi khi crash mà không gây bão hòa CPU.
   - Script cài đặt `deploy/macos/install.sh` và gỡ bỏ `deploy/macos/uninstall.sh` hoàn toàn idempotent, tự động nhận diện `node` binary và dọn sạch cổng 5001 trước khi nạp.
   - Script khởi chạy `start_app.command` tự động trích xuất IP LAN thực tế (`192.168.0.111`), chờ cổng 5001 sẵn sàng, hiển thị bảng hướng dẫn truy cập cho máy Mac và điện thoại, cung cấp mẹo bypass SSL `thisisunsafe` cho Chrome và mở trình duyệt.

2. **Nâng cấp Hệ Thống Chứng Chỉ SSL X509v3 SAN Độc Quyền (Reviewer 2)**:
   - Module `server/sslCert.js` tự động phát hiện, phân tích và sinh chứng chỉ X509v3 chuẩn Apple TLS với SAN chứa đầy đủ `DNS:localhost`, `DNS:*.local`, `IP:127.0.0.1`, `IP:<current_lan_ip>`, EKU `serverAuth`, và phân quyền `0600` cho private key.
   - Khi máy Mac kết nối sang mạng WiFi mới, server tự động nhận diện và tái sinh chứng chỉ với IP mới.

3. **Giao Thức HTTPS Độc Quyền & Chuyển Hướng 301 An Toàn (Reviewer 2 & Reviewer 3)**:
   - TCP multiplexer trên cổng 5001 nhận diện byte đầu tiên (TLS 0x16): request HTTPS được chuyển tiếp trực tiếp vào TLS server, còn request HTTP thường được trả mã `301 Moved Permanently` chuyển hướng sang HTTPS bảo toàn nguyên vẹn cổng 5001, pathname và query parameters.
   - Thiết lập các header phòng thủ: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, loại bỏ `X-Powered-By: Express`. Không bật HSTS để tránh khóa vĩnh viễn nút bypass trên chứng chỉ tự ký.
   - Loại bỏ hoàn toàn tàn dư cổng cũ 5002 và các fallback `http://` trong UI (`NetworkConfigModal.jsx`, `ArtworkDetailPage.jsx`, `ExcelGrid.jsx`).

4. **Kiểm Thử Toàn Diện (Reviewer 3 & Victory Auditor)**:
   - Xây dựng 39 bài kiểm thử tự động bao gồm kiểm thử daemon idempotency, phục hồi crash, chuyển hướng 301, bảo mật header, SSL SAN, mobile user-agents, và QR code endpoint.
   - Toàn bộ 39 bài test pass 100% trong 22 giây; production build thành công 0 lỗi.
   - Độc lập xác nhận bởi `teamwork_victory_auditor`: **VERDICT: VICTORY CONFIRMED**.

---

## 3. Cảnh Báo & Lưu Ý (Caveats)
- **Cấp phát IP DHCP từ Router WiFi**: Nếu router WiFi nội bộ cấp lại địa chỉ IP khác khi hết hạn lease (ví dụ đổi từ `192.168.0.111` sang `192.168.0.125`), server sẽ tự động nhận diện IP mới trong API `/api/network-info` và tái sinh SAN trong chứng chỉ SSL. Người dùng trên điện thoại chỉ cần nhấp đúp `start_app.command` trên máy Mac để xem IP mới nhất và truy cập theo IP đó.
- Khuyến nghị: Nếu muốn IP cố định vĩnh viễn, người dùng có thể gán IP tĩnh (Static IP / DHCP Reservation) cho máy Mac trong trang quản trị của modem WiFi.

---

## 4. Kết Luận & Tiêu Chí Nghiệm Thu (Conclusion)
Tất cả các tiêu chí chấp thuận (Acceptance Criteria) đã được đáp ứng 100%:
- [x] Tiến trình Node.js đang hoạt động và lắng nghe trên cổng 5001 (`com.binhminhart.server`, PID đang chạy).
- [x] Địa chỉ LAN IP thực tế hiện tại `192.168.0.111` đã được xác định và phản hồi kết nối nhanh chóng.
- [x] Gửi yêu cầu HTTP tới cổng 5001 trả về mã 301 chuyển hướng sang HTTPS trên cả localhost và LAN IP.
- [x] Gửi yêu cầu HTTPS tới cổng 5001 trả về 200 OK trên cả localhost và LAN IP.
- [x] Các API cốt lõi và kết nối đồng bộ Google Sheets hoạt động trơn tru qua HTTPS.
- [x] Hướng dẫn truy cập chi tiết từng bước cho iOS Safari, Android Chrome và máy tính đã sẵn sàng.

---

## 5. Phương Pháp Xác Minh (Verification Method)
```bash
# 1. Kiểm tra daemon và cổng 5001
launchctl list | grep binhminhart
lsof -i :5001 -P -n

# 2. Kiểm tra chứng chỉ X509v3 SAN
openssl x509 -in certs/cert.pem -noout -text | grep -A 2 "Subject Alternative Name"

# 3. Kiểm tra HTTP 301 và HTTPS 200 OK
curl -i http://localhost:5001/
curl -I --cacert certs/cert.pem https://localhost:5001/
curl -i http://192.168.0.111:5001/
curl -I --cacert certs/cert.pem https://192.168.0.111:5001/

# 4. Chạy bộ 39 bài test tự động
node --test test/table-readonly-sticky-columns.test.mjs test/sslCert.test.mjs test/deploy-and-network.test.mjs

# 5. Production Build
npm run build
```
