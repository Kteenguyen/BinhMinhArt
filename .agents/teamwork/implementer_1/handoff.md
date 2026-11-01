# BÁO CÁO BÀN GIAO: KHÔI PHỤC TIẾN TRÌNH SERVER & HƯỚNG DẪN TRUY CẬP HTTPS BINHMINHART

## 1. Nguyên Nhân Sự Cố & Chẩn Đoán (Root Cause Analysis)
- **Hiện tượng**: Sau khi máy chủ macOS khởi động lại, người dùng không thể truy cập vào ứng dụng BinhMinhArt qua localhost hay mạng LAN (IP cổng 5001).
- **Nguyên nhân gốc rễ**: 
  - Trước đây, ứng dụng BinhMinhArt chỉ được chạy thủ công qua terminal hoặc file script `start_app.command`. Hệ thống chưa được đăng ký làm dịch vụ nền (daemon / LaunchAgent) của hệ điều hành macOS (trong khi ứng dụng IncomeMange trong cùng máy có file `com.mymoney.server.plist` nên tự chạy lại sau reboot).
  - Khi máy Mac khởi động lại, tiến trình Node.js trên cổng 5001 bị tắt hoàn toàn.
  - Cổng 5001 được cấu hình chạy giao thức HTTPS duy nhất với chứng chỉ SSL tự ký (self-signed). Trình duyệt khi truy cập lần đầu sẽ hiển thị màn hình cảnh báo bảo mật, nếu người dùng không biết thao tác bấm "Nâng cao -> Tiếp tục" thì sẽ tưởng hệ thống bị lỗi kết nối.

---

## 2. Các Thay Đổi & Giải Pháp Đã Triển Khai
1. **Khởi tạo và Đăng ký Daemon macOS LaunchAgent**:
   - Tạo file cấu hình dịch vụ `deploy/macos/com.binhminhart.server.plist` với các thiết lập:
     - `RunAtLoad: true`: Tự động khởi động cùng hệ điều hành mỗi khi mở máy.
     - `KeepAlive: true`: Tự động phục hồi lại nếu tiến trình gặp sự cố bất ngờ.
     - `StandardOutPath`: Ghi log tại `data/server.log`.
     - `StandardErrorPath`: Ghi log lỗi tại `data/server_error.log`.
   - Tạo script triển khai tự động `deploy/macos/install.sh` và gỡ bỏ `deploy/macos/uninstall.sh`.
   - Đã cài đặt dịch vụ vào `~/Library/LaunchAgents/com.binhminhart.server.plist` và kích hoạt thành công qua `launchctl`.
2. **Cập nhật Script Khởi Chạy `start_app.command`**:
   - Bổ sung cơ chế phòng thủ: Tự động kiểm tra cổng 5001. Nếu daemon đã chạy nền, script sẽ mở ngay trình duyệt tới `https://localhost:5001` mà không gọi trùng `npm start` (tránh lỗi `EADDRINUSE`).

---

## 3. Bằng Chứng Kiểm Thử & Xác Minh (Verification Record)

### 3.1. Trạng Thái Tiến Trình Daemon
```bash
$ launchctl list | grep binhminhart
5988	0	com.binhminhart.server

$ lsof -i :5001
COMMAND  PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
node    5988  mac   29u  IPv4 0x35b0060edc6fc59f      0t0  TCP *:commplex-link (LISTEN)
```

### 3.2. Địa Chỉ LAN IP Thực Tế
- **Card mạng**: `en0`
- **Địa chỉ IPv4**: `192.168.0.111`
- **Xác thực qua API nội bộ**:
```bash
$ curl -sk https://localhost:5001/api/network-info
{
  "success": true,
  "config": {
    "autoIp": "192.168.0.111",
    "effectiveUrl": "https://192.168.0.111:5001",
    "port": 5001,
    "detectedLanIps": [{"interface": "en0", "address": "192.168.0.111"}]
  },
  "dbStatus": {
    "engine": "google-sheets",
    "exists": true
  }
}
```

### 3.3. Xác Thực HTTP 301 Redirect sang HTTPS
```bash
$ curl -i http://localhost:5001/
HTTP/1.1 301 Moved Permanently
Location: https://localhost:5001/
Redirecting to https://localhost:5001/

$ curl -i http://192.168.0.111:5001/
HTTP/1.1 301 Moved Permanently
Location: https://192.168.0.111:5001/
Redirecting to https://192.168.0.111:5001/

$ curl -k -s -L -o /dev/null -w "Final URL: %{url_effective} - HTTP Code: %{http_code}\n" http://192.168.0.111:5001/
Final URL: https://192.168.0.111:5001/ - HTTP Code: 200
```

### 3.4. Xác Thực HTTPS 200 OK & Các API Cốt Lõi
```bash
$ curl -ik -s -o /dev/null -w "Status: %{http_code}\n" https://localhost:5001/
Status: 200

$ curl -ik -s -o /dev/null -w "Status: %{http_code}\n" https://192.168.0.111:5001/
Status: 200

$ curl -sk -o /dev/null -w "GET /api/paintings: %{http_code}\n" https://192.168.0.111:5001/api/paintings
GET /api/paintings: 200

$ curl -sk -o /dev/null -w "GET /api/customers: %{http_code}\n" https://192.168.0.111:5001/api/customers
GET /api/customers: 200

$ curl -sk -o /dev/null -w "GET /api/qr/Z: %{http_code}\n" https://192.168.0.111:5001/api/qr/Z
GET /api/qr/Z: 200
```

---

## 4. HƯỚNG DẪN TRUY CẬP CHI TIẾT DÀNH CHO NGƯỜI DÙNG

### 4.1. Đường Dẫn Truy Cập (URLs)
- **Trên máy chủ (máy Mac chạy phần mềm)**:
  - 👉 `https://localhost:5001`
  - Hoặc: `http://localhost:5001` (hệ thống tự chuyển hướng sang HTTPS)
- **Trên điện thoại / iPad / máy tính khác cùng mạng WiFi nội bộ**:
  - 👉 `https://192.168.0.111:5001`
  - Hoặc: `http://192.168.0.111:5001` (hệ thống tự chuyển hướng sang HTTPS)

---

### 4.2. Hướng Dẫn Vượt Qua Màn Hình Cảnh Báo SSL Tự Ký (Self-Signed Certificate)
Do hệ thống sử dụng chứng chỉ nội bộ để kích hoạt HTTPS (giúp quét mã QR và truyền ảnh an toàn trong mạng riêng), các trình duyệt sẽ hiện màn hình cảnh báo trong lần truy cập đầu tiên. Thao tác xử lý như sau:

#### A. Trên iPhone / iPad (Trình duyệt Safari)
1. Truy cập: `https://192.168.0.111:5001`
2. Màn hình hiện thông báo: *"Kết nối này không phải là kết nối riêng tư"* (*This Connection is Not Private*).
3. Bấm vào dòng chữ **"Hiển thị chi tiết"** (*Show Details*) ở phía dưới.
4. Cuộn xuống dưới cùng và bấm vào **"truy cập trang web này"** (*visit this website*).
5. Khi hộp thoại xác nhận hiện ra, chọn **"Truy cập trang web"** (*Visit Website*). Trình duyệt sẽ lưu quyền và từ các lần sau không hỏi lại.

#### B. Trên Điện Thoại Android (Trình duyệt Google Chrome)
1. Truy cập: `https://192.168.0.111:5001`
2. Màn hình hiện cảnh báo: *"Kết nối của bạn không phải là kết nối riêng tư"* (*Your connection is not private*).
3. Bấm vào nút **"Nâng cao"** (*Advanced*).
4. Bấm vào đường dẫn **"Tiếp tục truy cập 192.168.0.111 (không an toàn)"** (*Proceed to 192.168.0.111 (unsafe)*).

#### C. Trên Máy Tính Mac / Windows (Google Chrome, Edge, Brave)
1. Truy cập: `https://localhost:5001` hoặc `https://192.168.0.111:5001`
2. Bấm vào nút **"Nâng cao"** (*Advanced*).
3. Bấm **"Tiếp tục truy cập..."** (*Proceed to localhost / 192.168.0.111 (unsafe)*).

---

## 5. Danh Mục File Đã Chạm (Touched Files)
1. `deploy/macos/com.binhminhart.server.plist` (Mới: Khai báo dịch vụ nền daemon)
2. `deploy/macos/install.sh` (Mới: Script cài đặt và nạp daemon vào launchctl)
3. `deploy/macos/uninstall.sh` (Mới: Script gỡ bỏ daemon khi cần)
4. `start_app.command` (Cập nhật: Bổ sung kiểm tra port 5001 để tránh xung đột cổng khi daemon đang chạy)
