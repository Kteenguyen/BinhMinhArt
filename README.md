# BÌNH MINH ART GALLERY - HỆ THỐNG QUẢN LÝ KHO (SQLITE) & TRIỂN LÃM TRANH (TABLET-FIRST)

Hệ thống điều hành kho tranh nghệ thuật & trình chiếu triển lãm chuẩn Gallery (thiết kế **Tablet-First**), lưu dữ liệu trong cơ sở dữ liệu **SQLite** (`data/binhminhart.db`) và tự xuất báo cáo Microsoft Excel (`exports/BinhMinhArt_Inventory.xlsx`), tích hợp bộ máy **Nạp loạt dữ liệu phân tách chuỗi & hình ảnh từ file Word (`.docx`)** và thư mục ảnh (xem mục 2 bên dưới).

---

## 🌟 Tính Năng Cốt Lõi Mới

1. **SQLite Làm Cơ Sở Dữ Liệu Gốc, Excel Là Báo Cáo**:
   - Mọi thao tác trên giao diện Web (thêm, sửa trực tiếp trong ô, đổi trạng thái bán, nạp loạt dữ liệu) được ghi vào `data/binhminhart.db` trong một giao dịch: lưu đủ hoặc không lưu gì. Dữ liệu sai kiểu bị từ chối kèm lỗi rõ ràng, không bao giờ báo "đã lưu" giả.
   - **Báo cáo Excel tự động**: sau mỗi thay đổi hệ thống tạo lại `exports/BinhMinhArt_Inventory.xlsx` để xem/in. Mở file này bằng Excel không ảnh hưởng hệ thống; sửa trong file này **không** đồng bộ ngược. Muốn nạp dữ liệu từ Excel hãy dùng nút **Nhập Excel**. Tự sao lưu mỗi ngày vào `data/backups/` (giữ 14 bản).

2. **Nút "Nạp Loạt Dữ Liệu (Word + Folder Ảnh)" — Phân Tách Chuỗi & Hình Ảnh Tự Động**:
   - **Tải file Word (`.docx`)**: Tự động giải nén cấu trúc XML của file Word (VD: `BẢNG GIÁ.docx`), bóc tách tên Họa sĩ, kỳ bảng giá, tách 3 dòng thông tin trong từng ô bảng (*Tên tác phẩm*, *Chất liệu, Kích thước, Năm sáng tác*, *Giá USD*) VÀ tự động trích xuất toàn bộ **hình ảnh nhúng bên trong bảng Word** (`word/media/image*.jpeg`).
   - **Tải Folder hình ảnh đính kèm**: Cho phép chọn 1 hoặc nhiều Folder ảnh (`TRANH`, `ĐÃ BÁN`, ...) hoặc nhiều file ảnh rời. Tự động phân tách chuỗi tên file ảnh (`[Tác giả], [Tên Việt - Anh], [Chất liệu], [Kích thước], [Năm] - [Khách hàng].jpg`) và nhận diện trạng thái *Đã bán* từ tên folder/tên file.
   - **Đối soát đa tầng chuẩn Unicode NFC**: Ghép chính xác từng bức tranh trong Word với ảnh gốc Full HD trong Folder (kể cả khi có nhiều bức trùng tên như 4 bức *"Thiếu nữ"* khác kích thước/chất liệu).

3. **Giao Diện Triển Lãm Tranh Khổ Lớn (Dạng Bảng Giống File Word Nguồn, Không Bo Góc) & Xuất PDF**:
   - **Thiết kế Tablet-First & Không bo góc (`rounded-none`)**: Toàn bộ khung tranh, ô bảng và nút điều khiển trong chế độ Triển lãm đều vuông vức sắc cạnh chuẩn phòng tranh.
   - **Ưu tiên diện tích tranh TO tối đa**: Hỗ trợ chuyển đổi nhanh giữa **1 Cột Cực Đại**, **2 Cột Khổ Lớn (Chuẩn iPad/Tablet)** và **3 Cột Chuẩn Bảng Giá Word**, giữ nguyên tỷ lệ khung tranh thật (`object-contain`), kèm tuỳ chọn đổi màu nền (*Nền Kem Gallery*, *Trắng Bảng Giá*, *Đen Sơn Mài*) và Bật/Tắt hiển thị giá.
   - **Xuất PDF Bảng Giá / Catalogue**: Xuất trực tiếp ra file PDF chuẩn A4 sắc nét theo đúng bố cục bảng của file Word nguồn.

4. **Tích Hợp Địa Chỉ IP WiFi Nội Bộ (Local LAN)**:
   - Mặc định vận hành trên `http://localhost:5001` bình thường.
   - Có sẵn nút **`IP WiFi / DB`** trên Header để bạn bổ sung địa chỉ IP mạng WiFi gia đình/phòng tranh bất cứ khi nào cần dùng chung trên iPad/điện thoại trong nhà.

1. **Bảng Tính Excel Tương Tác Cao (Excel-Like Grid)**:
   - **Kéo thả cột (Drag & Drop Columns)**: Kéo tiêu đề cột để thay đổi vị trí tự do; trình duyệt tự động ghi nhớ vị trí cột đã lưu (`localStorage`).
   - **Tùy biến cột (Column Visibility)**: Bật/tắt ẩn hiện các cột theo ý muốn.
   - **Sửa trực tiếp trong ô (Inline Edit)**: Nhấp đúp vào bất kỳ ô nào để sửa Tên, Giá, Chất liệu, Kích thước, v.v. như đang thao tác trên Microsoft Excel.
   - **Tự động hóa giá & ngày**: Mỗi khi đổi cột **Giá**, trường **Ngày cập nhật giá gần nhất** tự động nhảy sang ngày hôm nay.
   - **Luồng bán tranh thông minh**: Khi đổi trạng thái từ *Chưa bán* sang *Đã bán*, popup hỗ trợ ghi nhận nhanh thông tin Khách hàng, Ngày bán, Hoá đơn và Giấy chứng nhận.

2. **Quản Lý & CRUD Hình Ảnh Chuyên Sâu**:
   - Tự động tạo ảnh thu nhỏ (thumbnails siêu nhẹ ~20KB-40KB) để bảng tính cuộn mượt mà ngay cả khi ảnh gốc nặng 16MB.
   - **Lightbox HD**: Nhấp vào ảnh để phóng to toàn màn hình, có zoom 50% - 300% soi rõ từng nét cọ, chất sơn mài và chữ ký tác giả.
   - Hỗ trợ ảnh chính đại diện + nhiều ảnh phụ (chữ ký, mặt sau, khung tranh thực tế).

3. **Dashboard Thống Kê KPI Thời Gian Thực**:
   - Thống kê tổng số tác phẩm trong kho.
   - Số lượng tranh chưa bán & Tổng giá trị tồn kho niêm yết ($ USD).
   - Số lượng tranh đã bán & Doanh thu thực tế ($ USD).
   - Tác phẩm đang chờ định giá (Thỏa thuận).
   - Phân loại chất liệu cốt lõi (Sơn mài, Sơn dầu, v.v.).

4. **Xuất / Nhập Microsoft Excel (`.xlsx`)**:
   - **Xuất Excel (Export)**: Tải về file `.xlsx` chuẩn hóa, căn chỉnh độ rộng cột, định dạng tiền tệ và có sẵn sheet Tổng quan Dashboard.
   - **Báo cáo tự động**: Hệ thống tự cập nhật file `exports/BinhMinhArt_Inventory.xlsx` mỗi khi có thay đổi dữ liệu (nếu file đang mở trong Excel thì tự thử lại, dữ liệu vẫn an toàn).
   - **Nhập Excel (Import)**: Cho phép tải file `.xlsx` lên để cập nhật hoặc nhập kho hàng loạt.

5. **Hồ Sơ Dữ Liệu Ban Đầu (14 Tác Phẩm Khớp 100%)**:
   - Đã nạp đầy đủ 14 tác phẩm của **HS. Dương Văn Sen** từ file `BẢNG GIÁ.docx` và liên kết chính xác với các file ảnh trong thư mục `TRANH/` và `ĐÃ BÁN/`.
   - Có nút **Phục Hồi Dữ Liệu Gốc** để khôi phục lại kho ban đầu bất cứ lúc nào.

---

## 📋 Danh Mục 17 Trường Dữ Liệu Chuẩn Hóa

| STT | Tên trường | Kiểu dữ liệu | Ý nghĩa & Quy tắc |
| :---: | :--- | :--- | :--- |
| 1 | `id` | `string` | Mã định danh tác phẩm (VD: `BMA-DVS-001`, `BMA-ART-002`) |
| 2 | `hinh_anh` | `string[]` | Danh sách URL ảnh (ảnh đầu tiên là ảnh đại diện + các ảnh phụ) |
| 3 | `ten_tac_pham` | `string` | Tên tác phẩm hội họa (VD: *Nét vàng son*, *Hương quê*) |
| 4 | `tac_gia` | `string` | Tên họa sĩ sáng tác (Mặc định: *Dương Văn Sen*) |
| 5 | `chat_lieu` | `string` | Chất liệu tranh (*Sơn mài*, *Sơn dầu*, *Lụa*, v.v.) |
| 6 | `ngay_them` | `string` (YYYY-MM-DD) | Ngày tạo hồ sơ tác phẩm trong hệ thống |
| 7 | `gia` | `number \| null` | Giá niêm yết bán theo USD ($), `null` nếu Thỏa thuận |
| 8 | `ngay_cap_nhat_gia_gan_nhat` | `string` (YYYY-MM-DD) | Tự động cập nhật ngày hiện tại khi giá thay đổi |
| 9 | `kich_thuoc_tranh` | `string` | Kích thước tác phẩm (VD: `80x60cm`, `H100`, `120x240cm`) |
| 10 | `kich_thuoc_khung_tranh` | `string` | Kích thước & chất liệu khung (VD: `92x72cm Khung gỗ sồi`) |
| 11 | `nam_sang_tac` | `string` | Năm vẽ (VD: `2025`, `2023-2025`, `2009`) |
| 12 | `tinh_trang` | `'chua_ban' \| 'da_ban'` | Trạng thái tranh trong kho |
| 13 | `khach_hang` | `string` | Tên khách mua (bắt buộc khi đã bán, VD: *Chị Hạnh (Đức)*) |
| 14 | `ngay_mua_vao` | `string` (YYYY-MM-DD) | Ngày gallery nhập kho hoặc nhận ký gửi |
| 15 | `ngay_ban` | `string \| null` | Ngày bán tác phẩm cho khách hàng |
| 16 | `hoa_don` | `string` | Mã số hóa đơn VAT hoặc chứng từ kế toán |
| 17 | `giay_chung_nhan` | `'Yes' \| 'No'` | Giấy chứng nhận tác quyền tác phẩm |

---

## 🚀 Hướng Dẫn Khởi Chạy & Truy Cập Ứng Dụng

### Cách 1: Tự Động Khởi Động Cùng Máy Mac (Dịch Vụ Nền Daemon Khuyến Nghị)
Hệ thống hỗ trợ cấu hình dịch vụ nền macOS LaunchAgent để tự động khởi chạy cùng hệ điều hành và tự phục hồi khi có sự cố:
```bash
# Cài đặt dịch vụ nền (chỉ cần chạy một lần)
bash deploy/macos/install.sh

# Gỡ bỏ dịch vụ nền khi cần
bash deploy/macos/uninstall.sh
```

### Cách 2: Nhấp Đúp Khởi Chạy Nhanh Bằng File Command
Nhấp đúp chuột vào file:
👉 **`start_app.command`**
Trình duyệt sẽ tự động mở trang quản lý tại địa chỉ `https://localhost:5001` và hiển thị địa chỉ LAN IP để truy cập từ điện thoại/iPad.

### Cách 3: Khởi Chạy Thủ Công Bằng Terminal
```bash
# Khởi chạy máy chủ sản xuất
npm start
```

### 📱 Đường Dẫn Truy Cập & Xử Lý Cảnh Báo SSL (Chứng Chỉ Tự Ký)
- **Trên máy tính Mac**: `https://localhost:5001` (hoặc `http://localhost:5001` - hệ thống tự chuyển hướng 301 sang HTTPS).
- **Trên iPhone / iPad / Thiết bị khác cùng mạng WiFi**: `https://<LAN_IP>:5001` (xem địa chỉ IP khi chạy `start_app.command` hoặc nút **IP WiFi / DB** trên góc phải web).
- **Vượt qua cảnh báo chứng chỉ bảo mật**:
  - **iPhone / iPad (Safari)**: Bấm *Hiển thị chi tiết (Show Details)* -> *truy cập trang web này (visit this website)* -> xác nhận Face ID / Touch ID / Mật khẩu máy.
  - **Android / Máy tính (Google Chrome, Edge, Cốc Cốc)**: Bấm *Nâng cao (Advanced)* -> *Tiếp tục truy cập (Proceed)*. *(Mẹo: Nếu Chrome không hiện nút Nâng cao, nhấp chuột vào khoảng trắng bất kỳ trên trang rồi gõ cụm từ `thisisunsafe` trên bàn phím)*.

---

## 🛠️ Cấu Trúc Dự Án

```
BinhMinhArt/
├── data/
│   ├── binhminhart.db           # Cơ sở dữ liệu SQLite (dữ liệu gốc)
│   ├── backups/                 # Sao lưu tự động mỗi ngày (giữ 14 bản)
│   └── legacy/                  # Dữ liệu Excel/JSON cũ trước khi chuyển sang SQLite
├── exports/                     # Báo cáo Excel tự tạo (chỉ để xem)
├── thumbnails/                  # Ảnh thumbnail tối ưu tạo tự động (15-40KB)
├── uploads/                     # Thư mục chứa ảnh mới tải lên
├── server/
│   ├── index.js                 # Express REST API Server & File Server (HTTPS độc quyền)
│   ├── sslCert.js               # Khởi tạo & quản lý chứng chỉ bảo mật X509v3 với SAN cho localhost & LAN IP
│   ├── network.js               # Nhận diện địa chỉ IP mạng nội bộ (LAN IPv4)
│   ├── db.js                    # Lớp dữ liệu: migrate, lưu, sao lưu, xuất báo cáo Excel
│   ├── sqliteStore.js           # Truy cập SQLite (schema, kiểm tra kiểu, giao dịch)
│   ├── excelService.js          # Xử lý đọc & ghi file Excel .xlsx
│   └── thumbnailService.js      # Tạo thumbnail sắc nét bằng Sharp
├── src/
│   ├── components/
│   │   ├── Header.jsx           # Thanh điều hướng & các nút thao tác nhanh
│   │   ├── KpiCards.jsx         # Thẻ chỉ số tổng quan kho tranh
│   │   ├── FilterToolbar.jsx    # Thanh tìm kiếm & lọc trạng thái, chất liệu
│   │   ├── ExcelGrid.jsx        # Bảng tính Excel kéo thả cột & inline edit
│   │   ├── AddPaintingModal.jsx # Form nhập kho tranh mới
│   │   ├── PaintingDetailModal.jsx # Xem chi tiết, quản lý nhiều ảnh & sửa
│   │   ├── LightboxModal.jsx    # Phóng to ảnh HD & zoom 50-300%
│   │   ├── ColumnManagerModal.jsx # Cấu hình ẩn hiện & sắp xếp cột
│   │   ├── SoldQuickModal.jsx   # Popup xác nhận thông tin bán tranh
│   │   └── ExcelImportModal.jsx # Nhập kho hàng loạt từ file Excel
│   ├── types.js                 # Cấu hình danh mục cột & định dạng tiền/ngày
│   ├── App.jsx                  # State Orchestrator
│   ├── main.jsx                 # React Entry Point
│   └── index.css                # Tailwind CSS
├── test/
│   ├── db.test.mjs              # Kiểm thử lớp SQLite (kiểu dữ liệu, giao dịch, rollback)
│   └── api.test.mjs             # Kiểm thử API đầu-cuối (npm test)
├── BẢNG GIÁ.docx               # Tài liệu bảng giá gốc của HS. Dương Văn Sen
├── TRANH/                       # Thư mục 13 ảnh tranh gốc
├── ĐÃ BÁN/                      # Thư mục ảnh tranh đã bán
└── package.json
```

---

## 🖥️ Triển Khai Lên PC Windows (Máy Chủ Trong Nhà)

Mac chỉ dùng để dev; máy chạy thật là PC Windows. Hướng dẫn đầy đủ (đóng gói, cài đặt, cố định IP, sao lưu): **[docs/DEPLOY-WINDOWS.md](docs/DEPLOY-WINDOWS.md)**

```bash
python3 scripts/make_transfer_package.py   # trên Mac: tạo file zip để copy sang PC
```
```powershell
# trên PC (PowerShell, Run as administrator), sau khi cài Node.js LTS và giải nén:
powershell -ExecutionPolicy Bypass -File .\deploy\windows\install.ps1
```
