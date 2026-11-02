# BIÊN BẢN BÀN GIAO & HƯỚNG DẪN CẬP NHẬT MÁY HP (WINDOWS)
**Hệ Thống Quản Trị Tranh Nghệ Thuật & Triển Lãm BinhMinhArt Gallery**  
*Thời gian cập nhật:* 02/11/2026  
*Nhánh Git:* `origin/main`

---

## 🎯 TỔNG QUAN CÁC NÂNG CẤP TRONG BẢN CẬP NHẬT NÀY

Bản cập nhật này giải quyết triệt để 5 vấn đề vận hành thực tế giữa **Máy tính máy chủ HP (Windows)** và **Máy tính bảng iPad / Điện thoại di động**:

1. **Khắc phục lỗi IP mạng LAN trên máy HP:**
   - Đã xử lý nguyên nhân Windows Defender Firewall chặn cổng `5001`.
   - Tích hợp lệnh tự động mở tường lửa vào file `install_startup_windows.bat` và `start_windows.bat`.
   - Tự động phát hiện và in sẵn địa chỉ IP mạng thật của máy HP ra màn hình (lọc bỏ các card mạng ảo WSL/VMware) để người dùng iPad chỉ việc nhìn và gõ vào.

2. **Quét mã QR Camera trực tiếp trên iPad (Real-time Live Scanner):**
   - Đã cấu hình máy chủ HTTPS trên cổng `5001` (TCP Multiplexer tự động điều hướng HTTP $\rightarrow$ HTTPS an toàn).
   - Trình duyệt Chrome/Safari trên iPad tự động hiện popup xin cấp quyền Camera.
   - Nhận diện mã tem tranh tức thì ở tốc độ 60fps, tự động mở thẻ chi tiết tác phẩm mà **không cần chụp ảnh thủ công**.

3. **Tối ưu hóa giao diện iPad Portrait (Chiều dọc) chuẩn Responsive:**
   - Dàn trang 2 tầng thông minh (`2-tier layout`) cho thanh tiêu đề Header và bộ lọc, chống chèn ép và triệt tiêu hoàn toàn hiện tượng tràn nút bấm.
   - Hệ thống KPI cards co giãn linh hoạt (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`).
   - Tăng khoảng đệm chân trang (`pb-28`) giúp thanh thao tác nổi không che khuất các nút hành động ở cuối danh sách.

4. **In tem tác phẩm hàng loạt (Batch Printing Layout A4):**
   - Hỗ trợ in 10 tem chuẩn kích thước $100\text{mm} \times 40\text{mm}$ trên 1 tờ A4 (2 cột $\times$ 5 hàng).
   - Đầy đủ mã tranh, tên tác phẩm, tác giả, chất liệu, kích thước lòng tranh, kích thước khung tranh và mã QR độ nét cao.

5. **Cơ chế nạp tranh thông minh & Khôi phục Kích thước khung tranh:**
   - Cơ chế xử lý trùng mã tranh khi nạp Word/Folder/Excel: Cho phép chọn **"Giữ bản gốc"** hoặc **"Thay thế & cập nhật Ngày cập nhật SP"**.
   - Bảo toàn trường `kich_thuoc_khung_tranh` trong toàn bộ cơ sở dữ liệu SQLite và bảng Excel.

---

## 🚀 HƯỚNG DẪN 3 BƯỚC ĐỒNG BỘ TRÊN MÁY HP (WINDOWS)

Sau khi kéo mã nguồn về máy tính HP, bạn thực hiện lần lượt các bước sau:

### Bước 1: Kéo bản cập nhật mới nhất về
Trong Terminal của **Antigravity IDE** (hoặc mở Command Prompt tại `C:\BinhMinhArt`):
```cmd
git pull origin main
```

### Bước 2: Mở Tường Lửa Windows (Firewall) cho cổng 5001
Để iPad và điện thoại trong mạng Wi-Fi có thể kết nối vào máy HP, hãy mở tường lửa bằng **1 trong 2 cách**:

* **Cách A (Nhanh nhất - 1 dòng lệnh CMD Admin):**
  1. Bấm phím `Windows`, gõ `cmd`.
  2. Bấm chuột phải vào `Command Prompt` $\rightarrow$ Chọn **Run as administrator** *(Chạy với quyền Quản trị viên)*.
  3. Dán dòng lệnh sau và nhấn **Enter**:
  ```cmd
  netsh advfirewall firewall add rule name="BinhMinhArt 5001" dir=in action=allow protocol=TCP localport=5001 profile=any
  ```
* **Cách B:** Chỉ cần nhấp đúp chuột chạy file:
  👉 **`install_startup_windows.bat`**  
  *(Script này đã được tích hợp sẵn lệnh cấu hình tường lửa và cài đặt server chạy ngầm 24/7).*

### Bước 3: Đảm bảo mạng Wi-Fi máy HP là "Private network"
1. Ở góc phải màn hình thanh Taskbar, click vào biểu tượng **Wi-Fi** $\rightarrow$ chọn **Network & internet settings**.
2. Click vào tên mạng Wi-Fi bạn đang kết nối.
3. Tại phần **Network profile type**, chọn **Private network** *(Mạng riêng tư)*.

### Bước 4: Biên dịch và khởi chạy Server
Trong Terminal hoặc Command Prompt tại thư mục dự án:
```cmd
npm run build
start_windows.bat
```
*(Nếu muốn server chạy ngầm 24/7 không cần mở cửa sổ đen, hãy nhấp đúp file `start_background.bat`)*.

---

## 📱 HƯỚNG DẪN TRUY CẬP TỪ IPAD / ĐIỆN THOẠI

1. **Lấy địa chỉ IP máy HP:**
   Khi chạy `start_windows.bat` hoặc nhấp đúp vào `status_windows.bat`, màn hình sẽ in sẵn địa chỉ truy cập, ví dụ:
   ```text
   👉 https://192.168.1.15:5001
   ```

2. **Mở trên iPad:**
   - Mở trình duyệt Chrome hoặc Safari trên iPad, gõ đúng địa chỉ dạng:
     $$\text{https://[IP\_MÁY\_HP]:5001}$$
     *(Ví dụ: `https://192.168.1.15:5001` - Bắt buộc có chữ **https://**)*.
   - Trình duyệt sẽ hiển thị màn hình cảnh báo đỏ do chứng chỉ SSL mạng nội bộ:
     - Chọn **Nâng cao** (*Advanced*).
     - Chọn **Tiếp tục truy cập** (*Proceed to 192.168... / Chấp nhận rủi ro*).
   - Hệ thống sẽ hiển thị giao diện kho tranh mượt mà.

3. **Sử dụng tính năng Quét Camera QR trên iPad:**
   - Trên thanh công cụ, bấm nút **Quét QR**.
   - Bấm nút **Bật Camera**.
   - Bấm **Cho phép** (*Allow*) khi trình duyệt iPad yêu cầu cấp quyền truy cập Camera.
   - Hướng camera vào tem mã QR của tranh: Hệ thống tự động nhận diện và nhảy đến tác phẩm ngay lập tức!

---

## 🛠 DANH MỤC FILE NÂNG CẤP & CÔNG CỤ ĐIỀU HÀNH

| Tên File | Chức năng chính |
| :--- | :--- |
| `start_windows.bat` | Khởi động server HP, tự cấu hình Firewall, tự động in IP LAN cho iPad |
| `status_windows.bat` | Kiểm tra trạng thái server trong 0.5s, báo online và hiển thị IP mạng |
| `install_startup_windows.bat` | Cài đặt server ngầm 24/7 khi bật nguồn thùng máy, cấu hình Không ngủ & Tường lửa |
| `stop_windows.bat` | Dọn dẹp sạch toàn bộ tiến trình chạy ngầm khi cần dừng máy |
| `server/index.js` | Máy chủ Node.js HTTPS + TCP Multiplexer tự động chuyển hướng HTTP sang HTTPS |
| `server/sslCert.js` | Module tự tạo chứng chỉ SSL X509v3 với SAN IP hỗ trợ Camera iPad |
| `src/components/QrScannerModal.jsx` | Giao diện quét camera trực tiếp 60fps, hỗ trợ chuyển đổi camera trước/sau |
| `src/components/Header.jsx` & `FilterToolbar.jsx` | Giao diện 2 tầng chống tràn nút bấm trên màn hình iPad dọc |
| `src/components/BatchPrintModal.jsx` | Hộp thoại chọn tranh và xuất file in 10 tem A4 kích thước chuẩn |

---
**Bàn giao hoàn tất.** Mọi thắc mắc kỹ thuật trong quá trình chạy thực tế trên máy HP, bạn có thể chạy `status_windows.bat` hoặc xem nhật ký tại `logs/server.log`.
