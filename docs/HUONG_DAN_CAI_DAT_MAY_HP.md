# HƯỚNG DẪN CÀI ĐẶT & VẬN HÀNH DỰ ÁN BINHMINHART TRÊN MÁY TÍNH HP (WINDOWS)

Tài liệu này hướng dẫn chi tiết từng bước để chuyển giao và cài đặt toàn bộ hệ thống quản lý tranh BinhMinhArt từ máy Mac sang máy tính HP (chạy Windows).

---

## I. YÊU CẦU TRƯỚC KHI CÀI ĐẶT TRÊN MÁY HP

1. **Cài đặt Node.js (Bắt buộc):**
   * Truy cập trang chủ: [https://nodejs.org/](https://nodejs.org/)
   * Tải về bản **LTS (Long Term Support)** cho Windows (phiên bản v20.x hoặc v22.x).
   * Mở file `.msi` vừa tải về, bấm **Next -> Next** cho đến khi hoàn thành.
   * *(Lưu ý: Giữ nguyên tùy chọn mặc định "Add to PATH").*

---

## II. CHUYỂN DỰ ÁN TỪ MAC SANG MÁY HP

1. **File đóng gói sẵn mới nhất (Khuyên dùng):**
   * Hệ thống đã tạo sẵn file nén gói gọn toàn bộ dự án tại:  
     👉 **`BinhMinhArt_transfer_20261101.zip`** (nằm ngay thư mục gốc dự án trên Mac).
   * File này đã tích hợp sẵn:
     * Toàn bộ mã nguồn mới nhất (gồm tính năng bóc tách bảng giá Word 73 tác phẩm Hồ Hữu Thủ).
     * Toàn bộ ảnh tranh mẫu, database tranh hiện tại.
     * Thư mục **`scripts/`** và 2 file chạy nhanh **`start_windows.bat`**, **`install_startup_windows.bat`** ngay tại thư mục gốc.
     * Đã loại bỏ các file rác và `node_modules` để dung lượng nhẹ và chuyển nhanh nhất.

2. **Cách copy:**
   * Copy file **`BinhMinhArt_transfer_20261101.zip`** qua USB / ổ cứng di động / Zalo / Google Drive sang máy HP.
   * *(Lưu ý: Không dùng file zip cũ ngày 25/10 vì bản cũ đó chưa có thư mục scripts).*

3. **Đích đến trên máy HP:**
   * Giải nén toàn bộ nội dung file zip vào ổ đĩa C:  
     👉 **`C:\BinhMinhArt`**

---

## III. CẤU TRÚC LƯU TRỮ ẢNH TRÊN SSD CỦA MÁY HP

Toàn bộ ảnh tranh gốc, ảnh tải lên và ảnh tối ưu sẽ được lưu trữ cục bộ trực tiếp trên ổ SSD của máy HP tại các đường dẫn sau:
* **Ảnh tải lên từ file Word / Bảng giá:** `C:\BinhMinhArt\uploads\word_media\`
* **Ảnh đính kèm từ thư mục:** `C:\BinhMinhArt\uploads\folder_images\`
* **Thư mục tranh mẫu độ nét cao:** `C:\BinhMinhArt\TRANH\`
* **Thư mục tranh đã giao dịch:** `C:\BinhMinhArt\ĐÃ BÁN\`
* **Ảnh thumbnail siêu nhẹ hiển thị web:** `C:\BinhMinhArt\thumbnails\`
* **Ảnh mã QR tem tranh:** `C:\BinhMinhArt\thumbnails\qr\`

---

## IV. KHỞI CHẠY VÀ CÀI ĐẶT TỰ ĐỘNG BẬT KHI MỞ MÁY HP

Sau khi giải nén vào `C:\BinhMinhArt`, bạn sẽ thấy ngay 2 file chạy tự động:

### Bước 1: Khởi chạy lần đầu (Kiểm tra & Cài thư viện tự động)
* Nhấp đúp chuột vào file: **`start_windows.bat`** (nằm ngay tại `C:\BinhMinhArt\` hoặc trong `C:\BinhMinhArt\scripts\`)
* File script sẽ tự động:
  1. Kiểm tra Node.js.
  2. Tự động chạy `npm install` để tải toàn bộ thư viện cần thiết.
  3. Tự động build giao diện web (`npm run build`).
  4. Tạo đầy đủ các thư mục lưu ảnh trên SSD.
  5. Bật server HTTPS trên cổng **5001**.
* *Lưu ý khi Windows Firewall hỏi:* Sẽ có một pop-up của **Windows Defender Firewall** xuất hiện hỏi quyền truy cập mạng cho `Node.js`. Bạn hãy **tick chọn cả 2 ô (Private networks & Public networks)** rồi bấm **Allow access**.

### Bước 2: Cài đặt để Server tự động bật mỗi khi mở máy HP
* Nhấp đúp chuột vào file: **`install_startup_windows.bat`**
* Script sẽ tự động đăng ký file khởi động ngầm vào thư mục `Startup` của Windows.
* **Kết quả:** Từ nay về sau, mỗi khi bạn bật máy HP hoặc máy HP khởi động lại, server BinhMinhArt sẽ **tự động chạy ngầm trong background** mà không cần mở bất kỳ cửa sổ dòng lệnh nào.

---

## V. CÁCH XÁC ĐỊNH ĐỊA CHỈ TRUY CẬP TRÊN IPAD / ĐIỆN THOẠI

1. **Trên máy HP:**
   * Mở trình duyệt gõ: **`https://localhost:5001`**
2. **Trên iPad / iPhone / Điện thoại (kết nối cùng Wi-Fi):**
   * Mở Command Prompt trên máy HP, gõ: `ipconfig`
   * Tìm dòng `IPv4 Address` (ví dụ: `192.168.0.125`).
   * Trên điện thoại hoặc iPad, mở trình duyệt và truy cập:  
     👉 **`https://192.168.0.125:5001`**
   * Bấm **Nâng cao -> Tiếp tục truy cập** ở lần đầu tiên để xác nhận chứng chỉ an toàn mạng nội bộ.

---

## VI. ĐỒNG BỘ VỚI CƠ SỞ DỮ LIỆU GOOGLE SHEETS
* Dù chạy trên máy HP hay Mac, hệ thống đều tự động kết nối trực tiếp đến CSDL đám mây Google Sheets thông qua Google Apps Script API:
  `https://script.google.com/macros/s/AKfycbx-VdoMZvfi3-41sq_HyB8qdImGVWbdPbuxe5hc1PmSXoodkBi4Jm8DIvClEB0FnnCF/exec`
* Dữ liệu về 198 bức tranh, khách hàng và lịch sử vị trí luôn được đồng bộ thời gian thực 2 chiều.
