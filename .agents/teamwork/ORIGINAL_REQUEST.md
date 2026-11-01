# Original User Request

## 2026-10-25T02:15:26Z

This is a single self-contained fix; keep it small and focused.
Tắt hoàn toàn tính năng sửa trực tiếp trên từng ô (inline edit/double click) của bảng quản lý kho tranh; đưa cột Thao Tác (chứa nút "Cập nhật", "Chi tiết", "Đã bán") nằm cố định ở bên phải ngoài cùng (sticky right); hoàn thiện chức năng Bật/Tắt (ẩn/hiện) các cột trong bảng và ghi nhớ trạng thái hiển thị.

Working directory: /Users/mac/Documents/antigravity/BinhMinhArt
Integrity mode: development

## Requirements

### R1. Chế độ Xem Thuần Túy (Read-only Table, Khóa Inline Edit)
- Bỏ hoàn toàn thao tác nhấp đúp chuột để sửa trực tiếp trên từng ô tính (onDoubleClick, editingCell, startEdit, commitEdit). Bảng chỉ dùng để duyệt xem dữ liệu chuẩn mực, không kích hoạt input/select đè lên ô.
- Mọi thao tác sửa/cập nhật thông tin tranh bắt buộc phải thông qua nút "Cập nhật" trong cột Thao Tác.

### R2. Cột Thao Tác Cố Định Ở Bên Phải Ngoài Cùng (Sticky Right Actions Column)
- Đảm bảo cột Thao Tác luôn hiển thị cố định ở bên phải ngoài cùng của bảng (sticky right-0). Khi cuộn ngang danh sách cột dài, cột Thao Tác luôn nổi lên trên cùng với nền trắng/be đồng bộ để người dùng bấm nút bất cứ lúc nào.
- Cột Thao Tác chứa nút "Cập nhật" (mở modal cập nhật toàn bộ trường) và nút "Chi tiết" / "Đã bán".

### R3. Bộ Quản Lý Ẩn / Hiện Cột (Column Visibility Manager)
- Hoàn thiện và kích hoạt nút "Cột" trên thanh Header liên kết với modal quản lý cột (ColumnManagerModal.jsx).
- Cho phép người dùng bật/tắt checkbox để ẩn hoặc hiện bất kỳ cột nào trong bảng (Mã QR, Ngày mua vào, Giấy CN, Năm sáng tác, Vị trí...).
- Lưu trạng thái ẩn/hiện cột vào localStorage để khi tải lại trang (F5) vẫn giữ nguyên cấu hình hiển thị của người dùng.

## Acceptance Criteria

### Bảng dữ liệu Read-only
- [ ] Nhấp đúp chuột vào bất kỳ ô nào trên bảng không kích hoạt ô nhập liệu hay dropdown chọn (không còn lỗi vô tình sửa nhầm).
- [ ] Dữ liệu hiển thị trang nhã, đúng định dạng (Giá USD, Ngày VN, Vị trí có tag 📍).

### Cột Thao tác Sticky
- [ ] Cột Thao Tác nằm ở góc phải ngoài cùng và được ghim cố định (sticky right-0) khi cuộn ngang bảng.
- [ ] Bấm nút "Cập nhật" mở đúng modal sửa thông tin của hàng tranh tương ứng.

### Ẩn hiện cột
- [ ] Bấm nút "Cột" mở modal danh sách các cột kèm checkbox bật/tắt.
- [ ] Tick/bỏ tick một cột lập tức ẩn/hiện cột đó ngay trên bảng.
- [ ] Làm mới trang (F5) cấu hình ẩn/hiện cột vẫn được ghi nhớ trong localStorage.

### Kiểm tra hồi quy
- [ ] Chạy npm run build và npm test thành công không có lỗi.

## 2026-10-25T02:24:31Z

Lưu ý quan trọng từ người dùng: Cột Thao Tác (R2) đã được chốt chuyển sang dạng ICON BUTTON tinh gọn (kích thước 28x28px, gồm Icon Cập nhật, Icon Chi tiết, Icon Đã bán/Hoàn kho) với chiều rộng cột khoảng 120px để tránh tràn chữ và giữ mật độ thông tin cao. Hãy giữ nguyên thiết kế icon button này khi hoàn thiện và review.

## 2026-10-25T10:37:11Z

Audit and implement a 2-Tier Adaptive responsive layout for iPad in portrait orientation (viewport width 768px – 834px) across Bình Minh Art Gallery system, eliminating button overlapping, squished controls, and horizontal container overflow.

Working directory: /Users/mac/Documents/antigravity/BinhMinhArt
Integrity mode: demo

## Requirements

### R1. 2-Tier Adaptive Header & Action Toolbar for iPad Portrait (768px - 834px)
In `Header.jsx`, implement a 2-tier adaptive layout on tablet portrait viewports (`768px` to `834px`):
- Row 1: Gallery Branding + System View Switcher Dropdown with clean spacing.
- Row 2: Primary action buttons (Nạp loạt, Quét QR, Thêm tranh, Xuất Excel) on top sub-row, secondary utility buttons (IP WiFi, Quản lý Cột, Phục hồi gốc) on bottom sub-row or grouped logically with zero button overlapping, no clipped text, and no forced horizontal container scrollbar.

### R2. 2-Tier Adaptive FilterToolbar Layout
In `FilterToolbar.jsx`, eliminate the fixed `min-w-[500px]` overflow constraint:
- Sub-tabs (Kho Tranh vs Đã Bán) remain prominent and comfortable to tap.
- Search form + QR jump button placed on Tier 1; Artist Filter dropdown + Medium Filter + status toggle chips ("Chưa có giá", "Xóa lọc") + Counter placed on Tier 2 on screen widths `< 1024px`, fitting 100% of 768px–834px iPad portrait screens with no horizontal overflow.

### R3. Balanced 2-Row KpiCards Grid on iPad Portrait
In `KpiCards.jsx`, replace `md:grid-cols-5` with `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` so iPad portrait (768px–834px) renders 3 cards on Row 1 and 2 cards on Row 2 (width ≥ 220px each), providing ample breathing room for financial values, counts, and artist metrics without text truncation or overlap.

### R4. Zero Horizontal Overflow & Floating Bar Polish
Ensure page body and main containers maintain `overflow-x: hidden`. Confine horizontal scroll strictly to the inner table container of `ExcelGrid.jsx`. Ensure the Floating Bulk Action Bar and `StickyPaginationBar.jsx` fit comfortably within 768px portrait viewports.

## Acceptance Criteria

### Tablet Portrait Viewport Verification (768px × 1024px & 834px × 1194px)
- [ ] No buttons or controls in Header overlap, get squished, or are pushed off-screen in 768px–834px viewport widths.
- [ ] FilterToolbar fits completely within 768px without causing horizontal scrolling or overlapping controls.
- [ ] KpiCards maintain clean padding and typography with card widths ≥ 220px on iPad portrait.
- [ ] Page document body has zero horizontal scrollbar (`scrollWidth === clientWidth`).
- [ ] Production build passes with 0 errors (`npm run build`).


## 2026-11-01T03:32:40Z

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
