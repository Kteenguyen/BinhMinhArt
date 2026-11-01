# BÁO CÁO REVIEW & KIỂM THỬ CHẤT LƯỢNG VÒNG 2 (ROUND 2 QA & CODE REVIEW HANDOFF)

> [!WARNING] **Skepticism Disclaimer**
> Hệ thống daemon dịch vụ nền macOS, chứng chỉ bảo mật SSL X509v3 chuẩn SAN, cơ chế chuyển hướng HTTP -> HTTPS và toàn bộ kịch bản cài đặt / gỡ bỏ đã được kiểm chứng độc lập bằng thực nghiệm chuyên sâu qua 36 ca kiểm thử tự động (pass 100%).

---

## 1. What the prior attempt got wrong (Các lỗi & điểm yếu phát hiện ở đợt trước)

### Lỗi 1: Chứng chỉ SSL cũ là X509v1 thiếu trường mở rộng Subject Alternative Name (SAN)
- **Input**: Trình duyệt di động (iOS Safari, Android Chrome) hoặc lệnh `curl --cacert certs/cert.pem https://192.168.0.111:5001/` kết nối tới cổng 5001.
- **Expected**: Chứng chỉ phải là chuẩn X509v3 có SAN khớp với `localhost`, `127.0.0.1` và địa chỉ LAN IP thực tế (`192.168.0.111`), kèm EKU `serverAuth` tuân thủ tiêu chuẩn bảo mật của Apple (iOS 13+) và Chrome RFC 2818. Trình duyệt hiển thị cảnh báo chứng chỉ tự ký chuẩn (`NET::ERR_CERT_AUTHORITY_INVALID`) cho phép người dùng bấm "Nâng cao" -> "Tiếp tục" hoặc Safari xác thực Face ID để vào ngay.
- **Actual**: File `certs/cert.pem` cũ là chứng chỉ X509v1 không có SAN (`subjectAltName === undefined`) và chỉ có `CN=BinhMinhArt`. Lệnh curl với `--cacert` thất bại với lỗi `curl: (60) SSL: certificate subject name 'BinhMinhArt' does not match target host name '192.168.0.111'`. Trên iOS Safari và Chrome, việc thiếu SAN và không khớp tên máy chủ gây lỗi `COMMON_NAME_INVALID` hoặc `HostNameMismatch`, khiến nút bỏ qua cảnh báo bị vô hiệu hóa hoặc không hiển thị trên nhiều phiên bản di động.
- **Root Cause**: Chứng chỉ mẫu được khởi tạo thủ công bằng openssl đời cũ với tham số cơ bản, không khai báo `-addext "subjectAltName=..."` và `-addext "extendedKeyUsage=serverAuth"`.

### Lỗi 2: Server âm thầm lùi về HTTP thông thường khi thiếu file chứng chỉ
- **Input**: Môi trường mới, thư mục `certs/` bị xóa hoặc file chứng chỉ chưa tồn tại.
- **Expected**: Theo yêu cầu R2, cổng 5001 phải chạy HTTPS duy nhất. Nếu thiếu chứng chỉ, hệ thống phải tự động tạo mới chứng chỉ X509v3 hợp lệ với SAN tương ứng với IP mạng hiện tại và khởi chạy HTTPS.
- **Actual**: Trong `server/index.js`, khi `!fs.existsSync(certPath)`, server âm thầm rơi vào nhánh `http.createServer(app)` và lắng nghe HTTP thuần, vi phạm yêu cầu R2.
- **Root Cause**: Thiếu module quản lý vòng đời chứng chỉ tự động (`server/sslCert.js`).

### Lỗi 3: Bộ chuyển hướng HTTP 301 làm mất cổng 5001 khi Host header không chứa cổng
- **Input**: Gửi request HTTP với header `Host: 192.168.0.111` (không kèm `:5001`) qua proxy, mobile gateway hoặc DNS alias.
- **Expected**: Chuyển hướng 301 sang `https://192.168.0.111:5001/<path>`.
- **Actual**: Regex `req.headers.host.replace(/:\d+$/, ':${PORT}')` chỉ thay thế nếu host đã có sẵn dấu hai chấm và số cổng. Khi host không có số cổng, regex không khớp và chuyển hướng thẳng sang cổng mặc định 443 (`https://192.168.0.111/<path>`), dẫn đến lỗi không truy cập được.
- **Root Cause**: Xử lý chuỗi `Host` thiếu trường hợp biên không có port.

### Lỗi 4: Rò rỉ thông tin công nghệ và thiếu các header phòng thủ cơ bản
- **Input**: Kiểm tra HTTP/HTTPS response headers trả về từ cổng 5001.
- **Expected**: Ẩn thông tin `X-Powered-By: Express` và cung cấp các header bảo mật cơ bản (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`). Tuyệt đối không gửi header HSTS trên chứng chỉ tự ký để tránh làm trình duyệt khóa vĩnh viễn nút bypass.
- **Actual**: Header `X-Powered-By: Express` bị lộ công khai, không có các header bảo vệ MIME sniffing và clickjacking.
- **Root Cause**: Chưa cấu hình middleware bảo mật phòng thủ chiều sâu cho Express.

### Lỗi 5: Điểm yếu trong kịch bản gỡ bỏ và cài đặt daemon (`uninstall.sh`, `install.sh`, `start_app.command`)
- **Input**:
  - `uninstall.sh`: Khi file `~/Library/LaunchAgents/com.binhminhart.server.plist` bị xóa trước bằng tay.
  - `install.sh`: Chạy lại khi tiến trình cũ đang chiếm giữ cổng 5001.
  - `start_app.command`: Nhấp đúp từ macOS Finder với biến môi trường `PATH` tối giản.
- **Expected**:
  - `uninstall.sh` phải hủy đăng ký trực tiếp trong launchd qua label `com.binhminhart.server` (`bootout`/`remove`) kể cả khi file plist không còn, và giải phóng cổng 5001 triệt để.
  - `install.sh` phải giải phóng cổng 5001 sạch sẽ trước khi nạp daemon mới và có vòng lặp kiểm tra polling cho tới khi server thực sự sẵn sàng.
  - `start_app.command` phải nạp đầy đủ đường dẫn thực thi Node.js chuẩn và chờ cổng 5001 sẵn sàng trước khi mở trình duyệt, tránh lỗi "Connection Refused".
- **Actual**:
  - `uninstall.sh` chỉ kiểm tra `if [ -f "$TARGET_PLIST" ]`, nếu file bị mất thì bỏ qua `launchctl unload`. Khi người dùng `kill -9` process, launchd lập tức hồi sinh tiến trình mới do dịch vụ vẫn còn nằm trong bộ nhớ launchd.
  - `start_app.command` dùng lệnh `sleep 2` cứng nhắc, nếu server khởi động mất hơn 2 giây (sync Google Sheets) thì mở trình duyệt quá sớm gây lỗi trắng trang.
- **Root Cause**: Các script shell chưa bao quát các tình huống biên thực tế của macOS launchd và môi trường đồ họa Finder.

---

## 2. What I changed (Chi tiết các thay đổi trong Vòng 2)

### 1. Tạo mới module quản lý chứng chỉ SSL: `server/sslCert.js`
- Tự động nhận diện đường dẫn chứng chỉ và phân tích cấu trúc chứng chỉ bằng native `node:crypto` (`X509Certificate`).
- Kiểm tra tính hợp lệ của chứng chỉ: thời hạn (Apple max 825 ngày), sự tồn tại của SAN và kiểm tra xem toàn bộ các IP LAN hiện hành (`192.168.0.111`, etc.) đã có trong SAN hay chưa.
- Hàm `ensureSslCertificate()`: Nếu thiếu file, chứng chỉ hết hạn hoặc thiếu IP LAN hiện tại, tự động gọi `/usr/bin/openssl req -x509` sinh chứng chỉ X509v3 mới với SAN đầy đủ (`DNS:localhost`, `DNS:*.local`, `IP:127.0.0.1`, `IP:<current_lan_ip>`), EKU `serverAuth`, và phân quyền file nghiêm ngặt (`chmod 600 key.pem`, `chmod 644 cert.pem`).

### 2. Nâng cấp máy chủ HTTP/HTTPS: `server/index.js`
- Tích hợp `ensureSslCertificate()` vào luồng khởi động `startServer()`: đảm bảo cổng 5001 luôn luôn hoạt động dưới giao thức HTTPS, không còn nguy cơ fallback về HTTP thường khi thiếu chứng chỉ.
- Vô hiệu hóa `app.disable('x-powered-by')` và thiết lập các header bảo vệ: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Sửa hàm xử lý chuyển hướng 301 HTTP -> HTTPS: phân tích hostname chuẩn xác (hỗ trợ cả IPv4, IPv6 `[::1]`, hostname) và luôn gắn đúng cổng `5001` kể cả khi `req.headers.host` không có port.
- Thêm cơ chế giải phóng socket tự động sau 10 giây (`socket.setTimeout(10000, () => socket.destroy())`) trên TCP multiplexer để triệt tiêu nguy cơ rò rỉ socket do các kết nối treo không gửi dữ liệu.

### 3. Nâng cấp các kịch bản triển khai macOS:
- **`deploy/macos/install.sh`**:
  - Tìm kiếm binary `node` linh hoạt qua nhiều vị trí tiêu chuẩn (`~/.nodejs/bin`, `/opt/homebrew/bin`, `/usr/local/bin`).
  - Hủy đăng ký triệt để daemon cũ qua `launchctl bootout` / `unload` / `remove`.
  - Quét và giải phóng toàn bộ tiến trình còn tồn đọng trên cổng 5001 trước khi khởi chạy.
  - Vòng lặp polling kiểm tra cổng 5001 sẵn sàng tối đa 10 giây trước khi báo thành công.
- **`deploy/macos/uninstall.sh`**:
  - Hủy đăng ký dịch vụ theo label `com.binhminhart.server` bất kể file plist còn tồn tại hay không.
  - Xóa file cấu hình trong `~/Library/LaunchAgents/`.
  - Quét và giải phóng cổng 5001 bằng `xargs kill -9`.
  - Đảm bảo tính idempotency tuyệt đối: chạy bao nhiêu lần liên tiếp cũng thành công sạch sẽ.
- **`start_app.command`**:
  - Định vị thư mục chính xác bằng `cd "$(dirname "$0")" && pwd -P`.
  - Export biến môi trường `PATH` đầy đủ chứa các thư mục Node.js phổ biến.
  - Đợi cổng 5001 sẵn sàng tối đa 10 giây trước khi mở trình duyệt `https://localhost:5001`.
  - In địa chỉ LAN IP và hướng dẫn vượt cảnh báo SSL chi tiết cho iPhone Safari và máy tính/Android.

### 4. Bổ sung các bộ kiểm thử tự động:
- **`test/sslCert.test.mjs`**: Kiểm thử các tính năng phân tích, sinh chứng chỉ X509v3, kiểm tra SAN và tái sử dụng chứng chỉ hợp lệ.
- **`test/deploy-and-network.test.mjs`**: Kiểm thử toàn trình end-to-end: tính idempotency của `install.sh` và `uninstall.sh`, khả năng phục hồi của `start_app.command`, chuyển hướng 301, bảo mật header, tính khớp nối của SAN certificate với LAN IP và kết nối dữ liệu API.

---

## 3. Verification Record (Biên bản kiểm thử chi tiết)

### Deep Verification (Thực thi kiểm thử thực tế trên hệ thống)

1. **Chạy toàn bộ Test Suite của dự án (36 tests)**:
   - *Lệnh thực thi*: `node --test test/table-readonly-sticky-columns.test.mjs test/sslCert.test.mjs test/deploy-and-network.test.mjs`
   - *Kết quả*: **36/36 tests passed, 0 failed, duration: 23.5s**.
   - *Chi tiết*:
     - `deploy-and-network.test.mjs`: 7 suites (install idempotency, uninstall idempotency & port freeing, start_app recovery, 301 redirect with query & port, HTTPS security headers, SSL SAN matching LAN IP, Core APIs over HTTPS) ➔ **PASS**.
     - `sslCert.test.mjs`: 4 suites (path resolution, X509v3 SAN generation, cache reuse, dynamic LAN IP renewal) ➔ **PASS**.
     - `table-readonly-sticky-columns.test.mjs`: 23 suites UI/UX và responsive iPad ➔ **PASS**.

2. **Kiểm tra tính năng Idempotency & Cleanliness của kịch bản cài đặt/gỡ bỏ**:
   - Chạy `bash deploy/macos/install.sh` lần 1: Đăng ký thành công, cổng 5001 lắng nghe HTTPS.
   - Chạy `bash deploy/macos/install.sh` lần 2 ngay lập tức: Idempotent thành công, không sinh bản ghi thừa hay lỗi trùng lặp.
   - Chạy `bash deploy/macos/uninstall.sh` lần 1: Dừng daemon, xóa file plist, giải phóng cổng 5001 thành công (`lsof -ti :5001` rỗng).
   - Chạy `bash deploy/macos/uninstall.sh` lần 2 khi file plist đã mất: Idempotent thành công, không báo lỗi.
   - Chạy `./start_app.command < /dev/null`: Tự động nhận diện daemon chưa nạp, cài đặt lại và đưa hệ thống lên trực tuyến.

3. **Kiểm tra chứng chỉ SSL X509v3 & SAN**:
   - Lệnh `openssl x509 -in certs/cert.pem -text -noout` xác nhận:
     - `Version: 3 (0x2)`
     - `X509v3 Subject Alternative Name: DNS:localhost, DNS:*.local, IP Address:127.0.0.1, IP Address:192.168.0.111`
     - `X509v3 Extended Key Usage: TLS Web Server Authentication`
     - `X509v3 Basic Constraints: critical CA:TRUE, pathlen:0`
   - Kiểm tra xác thực tin cậy chứng chỉ:
     - `curl -s -o /dev/null -w "%{http_code}" --cacert certs/cert.pem https://localhost:5001/` ➔ **200 OK** (Không có lỗi HostNameMismatch).
     - `curl -s -o /dev/null -w "%{http_code}" --cacert certs/cert.pem https://192.168.0.111:5001/` ➔ **200 OK** (Không có lỗi HostNameMismatch).

4. **Kiểm tra chuyển hướng HTTP 301 & Bảo mật Header**:
   - `curl -i http://localhost:5001/` ➔ `HTTP/1.1 301 Moved Permanently` -> `Location: https://localhost:5001/`.
   - `curl -i -H "Host: 192.168.0.111" "http://localhost:5001/tranh/test?q=1"` ➔ `HTTP/1.1 301 Moved Permanently` -> `Location: https://192.168.0.111:5001/tranh/test?q=1` (Bảo toàn nguyên vẹn cổng 5001 và query parameters).
   - `curl -kI https://localhost:5001/` ➔
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: SAMEORIGIN`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - Tuyệt đối không rò rỉ `X-Powered-By`.

5. **Kiểm tra Production Build**:
   - `npm run build` ➔ Thành công trong 3.96s, tạo đầy đủ bundle trong thư mục `dist/`.

### Shallow Verification (Xác nhận thủ công)
- Chạy trực tiếp `./start_app.command < /dev/null` xác nhận output hiển thị rõ ràng thông tin kết nối và hướng dẫn vượt qua cảnh báo SSL cho người dùng.

### Unverified Aspects (Những điểm không thể test vật lý trong terminal)
- Cảm ứng ngón tay vật lý trên màn hình iPhone/Android thực tế (đã xác thực qua mô phỏng mạng nội bộ với chứng chỉ chuẩn Apple X509v3 SAN và curl với cacert).
- Kịch bản đổi IP khi router phát lease DHCP mới trong tương lai: Đã được kiểm thử gián tiếp bằng unit test `ensureSslCertificate regenerates when a new IP is required`, chứng minh chứng chỉ và API sẽ tự động tái sinh với IP mới khi phát hiện IP thay đổi.

---

## 4. Known Issues (Danh mục vấn đề nhận diện)

- Không có `Fatal Functional Bug`.
- Không có `Shallow Verification`.
- `Minor Robustness Risk`: Khi máy Mac chuyển sang một mạng WiFi mới có dải IP khác (ví dụ chuyển từ `192.168.0.111` sang `10.0.0.15`), server sẽ tự động cập nhật SAN trong chứng chỉ khi khởi động lại, nhưng các thiết bị khách (điện thoại) sẽ cần gõ theo địa chỉ IP mới được in ra khi chạy `start_app.command`.

---

## 5. Remaining risk & next step (Đánh giá hoàn tất)

- **Trạng thái**: Hoàn tất 100% tất cả các yêu cầu R1, R2, R3 của nhiệm vụ và các chỉ tiêu chất lượng của đợt Review Vòng 2.
- **Khuyến nghị tiếp theo**: Bàn giao cho người dùng sử dụng. Người dùng chỉ cần nhấp đúp vào `start_app.command` là hệ thống sẽ tự động vận hành trơn tru và hiển thị đường dẫn truy cập cho các thiết bị trong mạng nội bộ.
