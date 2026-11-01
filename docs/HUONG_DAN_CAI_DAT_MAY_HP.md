# HƯỚNG DẪN CÀI ĐẶT & CLONE DỰ ÁN BINHMINHART TRÊN MÁY TÍNH HP (WINDOWS)

Tài liệu hướng dẫn chi tiết từng bước từ số 0 để clone mã nguồn từ GitHub về máy tính HP bằng **Antigravity IDE** và khởi chạy hệ thống vận hành tranh.

---

## 🔗 THÔNG TIN KHO LƯU TRỮ GITHUB
* **Repository URL:** `https://github.com/Kteenguyen/BinhMinhArt.git`
* **Nhánh chính (Branch):** `main`
* **Vị trí cài đặt chuẩn trên máy HP:** `C:\BinhMinhArt`

---

## BƯỚC 1: CÀI ĐẶT 2 CÔNG CỤ NỀN TẢNG TRÊN MÁY HP (CHỈ CẦN LÀM 1 LẦN)

Vì máy HP mới chỉ cài Antigravity IDE, bạn cần cài đặt thêm 2 phần mềm môi trường chạy:

### 1. Cài đặt Node.js (Bắt buộc để chạy Server):
1. Truy cập trang chủ: [https://nodejs.org/](https://nodejs.org/)
2. Bấm tải bản **LTS (Long Term Support)** cho Windows (`.msi`).
3. Mở file vừa tải về, bấm **Next $\rightarrow$ Next $\rightarrow$ Install** cho đến khi hoàn thành.  
   *(Giữ nguyên các tùy chọn mặc định, đặc biệt là "Add to PATH").*

### 2. Cài đặt Git for Windows (Nếu máy chưa có Git):
1. Truy cập: [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Tải bản **64-bit Git for Windows Setup**.
3. Bấm mở file và chọn **Next** liên tục theo mặc định để cài đặt.

---

## BƯỚC 2: CLONE DỰ ÁN VỀ MÁY HP BẰNG ANTIGRAVITY IDE

### Cách 1: Sử dụng giao diện Antigravity IDE (Khuyên dùng)
1. Mở phần mềm **Antigravity IDE** trên máy HP.
2. Tại màn hình bắt đầu (**Welcome**), bấm vào nút **Clone Repository...**  
   *(Hoặc bấm tổ hợp phím `Ctrl + Shift + P` $\rightarrow$ gõ `Git: Clone` $\rightarrow$ nhấn Enter).*
3. Dán đường dẫn GitHub vào thanh tìm kiếm trên cùng:  
   👉 **`https://github.com/Kteenguyen/BinhMinhArt.git`** $\rightarrow$ nhấn **Enter**.
4. Cửa sổ chọn thư mục xuất hiện:
   * Hãy chọn ổ đĩa **`C:\`** (IDE sẽ tự động tạo thư mục con `C:\BinhMinhArt`).
   * Bấm **Select as Repository Destination**.
5. Khi IDE hoàn tất tải về, một thông báo góc phải dưới sẽ hỏi:  
   *"Would you like to open the cloned repository?"* $\rightarrow$ Bấm **Open** (Mở dự án).

### Cách 2: Sử dụng cửa sổ dòng lệnh Terminal trong IDE
1. Trong Antigravity IDE, mở Terminal bằng cách bấm phím tắt: **`Ctrl + \``** (hoặc menu **Terminal $\rightarrow$ New Terminal**).
2. Dán lần lượt các lệnh sau:
   ```cmd
   cd /d C:\
   git clone https://github.com/Kteenguyen/BinhMinhArt.git
   cd C:\BinhMinhArt
   ```

---

## BƯỚC 3: KHỞI CHẠY LẦN ĐẦU TRÊN MÁY HP

Có 2 cách để khởi chạy (Khuyên dùng **Cách 1** vì bạn đang mở sẵn Antigravity IDE):

### Cách 1: Khởi chạy trực tiếp trong Terminal của Antigravity IDE (Khuyên dùng nhất)
Vì Antigravity IDE có sẵn khung Terminal gắn liền, bạn sẽ thấy toàn bộ tiến trình tải và không bao giờ bị tắt màn hình:
1. Trong Antigravity IDE, mở Terminal bằng phím tắt: **`Ctrl + \``** (hoặc menu **Terminal $\rightarrow$ New Terminal**).
2. Kéo bản cập nhật script mới nhất về bằng lệnh:
   ```cmd
   git pull origin main
   ```
3. Chạy 3 lệnh sau (chỉ mất khoảng 1-2 phút lần đầu):
   ```cmd
   npm install
   npm run build
   npm start
   ```
4. Khi màn hình hiện thông báo:
   ```text
   BinhMinhArt HTTPS Server running on https://localhost:5001
   ```
   Server đã khởi động thành công!

---

### Cách 2: Khởi chạy bằng file script tự động (`start_windows.bat`)
*(File `start_windows.bat` đã được sửa lại chuẩn Windows CRLF và tự động nhận diện Node.js, không bao giờ bị nháy tắt nữa)*:
1. Mở Terminal trong IDE, gõ: `git pull origin main` để cập nhật file script mới.
2. Nhấp đúp chuột vào file: 👉 **`start_windows.bat`** (ở thư mục gốc `C:\BinhMinhArt`).
3. Cửa sổ màu xanh lá sẽ chạy tự động:
   * Tự tìm thấy Node.js kể cả khi máy chưa kịp làm mới PATH.
   * Tự động chạy `npm install` và `npm run build`.
   * Khởi động server HTTPS trên cổng **5001** và giữ nguyên cửa sổ.

---

### Lưu ý quan trọng khi kiểm tra trên trình duyệt:
1. **Windows Firewall:** Khi Windows Defender Firewall hỏi quyền mạng, tick chọn cả 2 ô (**Private & Public**) $\rightarrow$ bấm **Allow access**.
2. **Kiểm tra trực tiếp:**
   * Mở trình duyệt Chrome/Edge trên máy HP, gõ chính xác: 👉 **`https://localhost:5001`**  
     *(Lưu ý phải có chữ **`https://`**, không dùng `http://`)*.
   * Bấm **Nâng cao (Advanced) $\rightarrow$ Tiếp tục truy cập (Proceed)** để xác nhận chứng chỉ SSL an toàn mạng nội bộ.
   * Trang quản trị tranh 198 tác phẩm sẽ hiển thị ngay lập tức!

---

## BƯỚC 4: CÀI ĐẶT SERVER TỰ ĐỘNG CHẠY NGẦM KHI BẬT MÁY HP

Sau khi server đã chạy thành công ở Bước 3:
1. Đảm bảo đã cập nhật code mới (`git pull origin main`).
2. Nhấp đúp chuột vào file: 👉 **`install_startup_windows.bat`**
3. Màn hình sẽ dừng lại và báo dòng chữ màu xanh:  
   `[THANH CONG] Da dang ky BinhMinhArt tu dong chay ngam khi mo may HP!`.
4. Bấm phím bất kỳ để đóng cửa sổ.
5. **Hiệu quả:** Từ nay về sau, mỗi khi bạn mở máy HP hoặc máy HP khởi động lại, server BinhMinhArt sẽ **tự động chạy ngầm trong background**, iPad và điện thoại có thể truy cập 24/7.

---

## BƯỚC 5: HƯỚNG DẪN TRUY CẬP TỪ IPAD / IPHONE / ĐIỆN THOẠI KHÁC

1. Đảm bảo điện thoại/iPad kết nối **cùng mạng Wi-Fi** với máy HP.
2. Lấy địa chỉ IP mạng của máy HP:
   * Trong Terminal của Antigravity IDE trên máy HP, gõ: `ipconfig`
   * Tìm dòng `IPv4 Address` (ví dụ: `192.168.0.125` hoặc `192.168.1.15`).
3. Trên iPad / iPhone:
   * Mở Safari hoặc Chrome, truy cập:  
     👉 **`https://192.168.0.125:5001`** *(thay bằng IP thực tế của máy HP)*.
   * Do chứng chỉ SSL tự ký cho mạng nội bộ, bấm **Nâng cao (Advanced) $\rightarrow$ Tiếp tục truy cập (Proceed)**.
   * Giao diện quản lý tranh tối ưu Mobile lập tức xuất hiện, hỗ trợ quét mã QR, xem ảnh và bóc tách bảng giá.

---

## BƯỚC 6: CÁCH KÉO CẬP NHẬT CODE MỚI TRONG TƯƠNG LAI (GIT PULL)

Khi trên máy Mac có tính năng mới được đẩy lên GitHub, trên máy HP bạn chỉ cần cập nhật với 1 thao tác:

* **Cách 1:** Trong Antigravity IDE, bấm vào nút **Sync Changes** (hoặc biểu tượng vòng tròn xoay ở góc dưới cùng bên trái màn hình).
* **Cách 2:** Mở Terminal trong Antigravity IDE và gõ:
  ```cmd
  git pull origin main
  npm run build
  ```
