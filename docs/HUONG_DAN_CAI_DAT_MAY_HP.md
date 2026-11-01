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

## BƯỚC 3: KHỞI CHẠY LẦN ĐẦU CHỈ VỚI 1 CÚ NHẤP CHUỘT

Hệ thống đã tích hợp sẵn script tự động hóa toàn bộ quá trình cài đặt thư viện và build:

1. Mở thư mục **`C:\BinhMinhArt`** (hoặc ngay trong khung Explorer bên trái của Antigravity IDE).
2. Nhấp đúp chuột vào file: 👉 **`start_windows.bat`** (nằm ngay tại thư mục gốc).
3. Cửa sổ màu xanh lá sẽ hiện ra và **tự động hoàn toàn**:
   * Kiểm tra phiên bản Node.js.
   * Tự động chạy `npm install` để tải toàn bộ thư viện.
   * Tự động chạy `npm run build` để biên dịch giao diện web.
   * Tự động tạo các thư mục lưu ảnh tranh trên SSD máy HP.
   * Bật server bảo mật HTTPS trên cổng **5001**.
4. **Lưu ý quan trọng về Tường lửa (Firewall):**
   * Lần đầu bật, sẽ có thông báo của **Windows Defender Firewall** hỏi quyền mạng cho `Node.js`.
   * **Tick chọn cả 2 ô:**
     - ☑ *Private networks, such as my home or work network*
     - ☑ *Public networks, such as those in airports and coffee shops*
   * Bấm **Allow access**.
5. **Kiểm tra trực tiếp:**
   * Mở trình duyệt trên máy HP (Chrome / Edge), truy cập: 👉 **`https://localhost:5001`**
   * Website quản lý tranh BinhMinhArt sẽ hiển thị đầy đủ 198 bức tranh cùng dữ liệu đồng bộ Google Sheets!

---

## BƯỚC 4: CÀI ĐẶT SERVER TỰ ĐỘNG CHẠY NGẦM KHI BẬT MÁY HP

Để không phải mỗi ngày đều phải mở cửa sổ dòng lệnh bật server thủ công:

1. Trong thư mục **`C:\BinhMinhArt`**, nhấp đúp chuột vào file:  
   👉 **`install_startup_windows.bat`**
2. Màn hình báo: `[THANH CONG] Da dang ky BinhMinhArt tu dong chay ngam khi mo may HP!`.
3. **Hiệu quả:** Từ nay về sau, mỗi khi bạn mở máy tính HP hoặc máy HP khởi động lại, server BinhMinhArt sẽ **tự động chạy ngầm trong background**, sẵn sàng phục vụ cho iPad, điện thoại 24/7 mà không hiện bất kỳ cửa sổ nào làm phiền màn hình.

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
