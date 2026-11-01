import os
import json
import xlsxwriter

# Load paintings data
with open('data/paintings.json', 'r', encoding='utf-8') as f:
    paintings = json.load(f)

OUTPUT_PATHS = [
    os.path.join(os.path.expanduser('~'), 'Documents', 'BinhMinhArt.xlsx'),
    'BinhMinhArt_Inventory.xlsx'
]

LOGO_PATH = 'binhminh_logo_clean.png'

def build_workbook(out_path):
    print(f'Building luxury branding workbook at: {out_path}...')
    wb = xlsxwriter.Workbook(out_path, {'strings_to_numbers': True})

    # Exact Color Palette from user's envelope photo
    C_MUSTARD = '#C58C00'        # Envelope flap mustard gold
    C_MUSTARD_DARK = '#A57300'
    C_MUSTARD_LIGHT = '#FDF6E2'  # Soft cream-yellow highlight
    C_BURGUNDY = '#7D1818'       # "BÌNH MINH" & "GALLERY" deep red
    C_BURGUNDY_DARK = '#5E1010'
    C_BURGUNDY_LIGHT = '#FBEFEF'
    C_CREAM_BG = '#FAF7F0'       # Envelope paper warm cream
    C_BORDER = '#DFCBAA'         # Warm border
    C_DARK = '#1C1917'           # Dark charcoal text
    C_GREEN_BG = '#E6F4EA'       # Light green
    C_GREEN_FG = '#137333'
    C_AMBER_BG = '#FEF7E0'       # Light amber
    C_AMBER_FG = '#B06000'

    # Separate unsold (in stock) vs sold items
    unsold_items = [p for p in paintings if p.get('tinh_trang') != 'da_ban']
    sold_items = [p for p in paintings if p.get('tinh_trang') == 'da_ban']

    # Formats
    fmt_strip_mustard = wb.add_format({'bg_color': C_MUSTARD})
    fmt_strip_burgundy = wb.add_format({'bg_color': C_BURGUNDY})

    fmt_gallery_title = wb.add_format({
        'font_name': 'Times New Roman',
        'font_size': 18,
        'bold': True,
        'color': C_BURGUNDY,
        'align': 'left',
        'valign': 'vcenter'
    })

    fmt_gallery_sub = wb.add_format({
        'font_name': 'Arial',
        'font_size': 9,
        'color': '#555555',
        'align': 'left',
        'valign': 'vcenter'
    })

    fmt_card_title = wb.add_format({
        'font_name': 'Arial',
        'font_size': 8.5,
        'bold': True,
        'color': '#5E513A',
        'bg_color': C_MUSTARD_LIGHT,
        'border': 1,
        'border_color': C_BORDER,
        'align': 'center',
        'valign': 'vcenter'
    })

    fmt_card_num = wb.add_format({
        'font_name': 'Times New Roman',
        'font_size': 16,
        'bold': True,
        'color': C_DARK,
        'bg_color': '#FFFFFF',
        'border': 1,
        'border_color': C_BORDER,
        'align': 'center',
        'valign': 'vcenter'
    })

    fmt_card_currency = wb.add_format({
        'font_name': 'Arial',
        'font_size': 13,
        'bold': True,
        'color': C_GREEN_FG,
        'bg_color': '#FFFFFF',
        'num_format': '$#,##0',
        'border': 1,
        'border_color': C_BORDER,
        'align': 'center',
        'valign': 'vcenter'
    })

    fmt_card_sold_cur = wb.add_format({
        'font_name': 'Arial',
        'font_size': 13,
        'bold': True,
        'color': C_BURGUNDY,
        'bg_color': '#FFFFFF',
        'num_format': '$#,##0',
        'border': 1,
        'border_color': C_BORDER,
        'align': 'center',
        'valign': 'vcenter'
    })

    # Table Header in Mustard Gold (KHO TRANH)
    fmt_th_mustard = wb.add_format({
        'font_name': 'Arial',
        'font_size': 9.5,
        'bold': True,
        'bg_color': C_MUSTARD,
        'color': '#FFFFFF',
        'border': 1,
        'border_color': C_MUSTARD_DARK,
        'align': 'center',
        'valign': 'vcenter',
        'text_wrap': True
    })

    # Table Header in Burgundy (ĐÃ BÁN)
    fmt_th_burgundy = wb.add_format({
        'font_name': 'Arial',
        'font_size': 9.5,
        'bold': True,
        'bg_color': C_BURGUNDY,
        'color': '#FFFFFF',
        'border': 1,
        'border_color': C_BURGUNDY_DARK,
        'align': 'center',
        'valign': 'vcenter',
        'text_wrap': True
    })

    fmt_cell = wb.add_format({
        'font_name': 'Arial',
        'font_size': 9.5,
        'valign': 'vcenter',
        'border': 1,
        'border_color': '#EAE5D9'
    })

    fmt_cell_center = wb.add_format({
        'font_name': 'Arial',
        'font_size': 9.5,
        'align': 'center',
        'valign': 'vcenter',
        'border': 1,
        'border_color': '#EAE5D9'
    })

    fmt_cell_bold = wb.add_format({
        'font_name': 'Times New Roman',
        'font_size': 10.5,
        'bold': True,
        'color': C_DARK,
        'valign': 'vcenter',
        'border': 1,
        'border_color': '#EAE5D9'
    })

    fmt_price = wb.add_format({
        'font_name': 'Arial',
        'font_size': 9.5,
        'bold': True,
        'num_format': '$#,##0',
        'align': 'right',
        'valign': 'vcenter',
        'border': 1,
        'border_color': '#EAE5D9'
    })

    fmt_total_label = wb.add_format({
        'font_name': 'Arial',
        'font_size': 10.5,
        'bold': True,
        'bg_color': C_MUSTARD_LIGHT,
        'border': 1,
        'border_color': C_MUSTARD,
        'align': 'center',
        'valign': 'vcenter'
    })

    fmt_total_price = wb.add_format({
        'font_name': 'Arial',
        'font_size': 10.5,
        'bold': True,
        'bg_color': C_MUSTARD_LIGHT,
        'border': 1,
        'border_color': C_MUSTARD,
        'num_format': '$#,##0',
        'align': 'right',
        'valign': 'vcenter'
    })

    fmt_status_chua_ban = wb.add_format({
        'font_name': 'Arial',
        'font_size': 9,
        'bold': True,
        'bg_color': C_GREEN_BG,
        'font_color': C_GREEN_FG,
        'align': 'center',
        'valign': 'vcenter',
        'border': 1,
        'border_color': '#B7E1CD'
    })

    fmt_status_da_ban = wb.add_format({
        'font_name': 'Arial',
        'font_size': 9,
        'bold': True,
        'bg_color': C_AMBER_BG,
        'font_color': C_AMBER_FG,
        'align': 'center',
        'valign': 'vcenter',
        'border': 1,
        'border_color': '#FCE8E6'
    })

    inv_last_data_row = 5 + max(len(unsold_items), 1)
    sold_last_data_row = 10 + max(len(sold_items), 1)

    # =========================================================
    # SHEET 1: DASHBOARD TỔNG QUAN
    # =========================================================
    ws_dash = wb.add_worksheet('DASHBOARD TỔNG QUAN')
    ws_dash.set_tab_color(C_MUSTARD)
    ws_dash.hide_gridlines(0)
    ws_dash.set_column('A:A', 3)
    ws_dash.set_column('B:D', 15)
    ws_dash.set_column('E:G', 16)
    ws_dash.set_column('H:I', 18)

    # 1. Top Decorative Mustard Strip (matches envelope flap)
    for c in range(1, 9):
        ws_dash.write_blank(0, c, None, fmt_strip_mustard)
    ws_dash.set_row(0, 10)

    # 2. Logo & Branding Header
    if os.path.exists(LOGO_PATH):
        ws_dash.insert_image('B2', LOGO_PATH, {
            'x_offset': 5,
            'y_offset': 4,
            'x_scale': 0.65,
            'y_scale': 0.65,
            'object_position': 1
        })
    
    ws_dash.merge_range('E2:H2', 'BÌNH MINH ART GALLERY', fmt_gallery_title)
    ws_dash.merge_range('E3:H3', '29A Ngô Thời Nhiệm, Phường 6, Quận 3, TP. Hồ Chí Minh | ĐT: 0916554329 - 02836361808', fmt_gallery_sub)
    ws_dash.merge_range('E4:H4', 'Email: binhminhartgallery@gmail.com | Website: binhminh-artgallery.vn', fmt_gallery_sub)
    ws_dash.set_row(1, 22)
    ws_dash.set_row(2, 18)
    ws_dash.set_row(3, 18)

    # Row 6: Card Titles
    ws_dash.write('B6', 'TỔNG TÁC PHẨM', fmt_card_title)
    ws_dash.write('C6', 'ĐANG TRƯNG BÀY', fmt_card_title)
    ws_dash.write('D6', 'TRỊ GIÁ TỒN KHO', fmt_card_title)
    ws_dash.write('E6', 'ĐÃ GIAO DỊCH', fmt_card_title)
    ws_dash.write('F6', 'DOANH THU ĐÃ BÁN', fmt_card_title)
    ws_dash.write('G6', 'CHỜ ĐỊNH GIÁ', fmt_card_title)
    ws_dash.set_row(5, 18)

    # Row 7: Card Values (Formulas combining 'KHO TRANH' & 'ĐÃ BÁN')
    ws_dash.write_formula('B7', f"=COUNTA('KHO TRANH'!B6:B{inv_last_data_row})+COUNTA('ĐÃ BÁN'!B11:B{sold_last_data_row})", fmt_card_num)
    ws_dash.write_formula('C7', f"=COUNTA('KHO TRANH'!B6:B{inv_last_data_row})", fmt_card_num)
    ws_dash.write_formula('D7', f"=SUM('KHO TRANH'!H6:H{inv_last_data_row})", fmt_card_currency)
    ws_dash.write_formula('E7', f"=COUNTA('ĐÃ BÁN'!B11:B{sold_last_data_row})", fmt_card_num)
    ws_dash.write_formula('F7', f"=SUM('ĐÃ BÁN'!H11:H{sold_last_data_row})", fmt_card_sold_cur)
    ws_dash.write_formula('G7', f"=COUNTBLANK('KHO TRANH'!H6:H{inv_last_data_row})", fmt_card_num)
    ws_dash.set_row(6, 30)

    # Table: Material Breakdown (combining both sheets)
    ws_dash.write('B10', 'PHÂN LOẠI CHẤT LIỆU', fmt_th_mustard)
    ws_dash.write('C10', 'SỐ LƯỢNG', fmt_th_mustard)
    ws_dash.write('D10', 'TỔNG GIÁ TRỊ ($)', fmt_th_mustard)

    ws_dash.write('B11', 'Sơn mài', fmt_cell)
    ws_dash.write_formula('C11', f'=COUNTIF(\'KHO TRANH\'!F6:F{inv_last_data_row}, "*Sơn mài*")+COUNTIF(\'ĐÃ BÁN\'!F11:F{sold_last_data_row}, "*Sơn mài*")', fmt_cell_center)
    ws_dash.write_formula('D11', f'=SUMIF(\'KHO TRANH\'!F6:F{inv_last_data_row}, "*Sơn mài*", \'KHO TRANH\'!H6:H{inv_last_data_row})+SUMIF(\'ĐÃ BÁN\'!F11:F{sold_last_data_row}, "*Sơn mài*", \'ĐÃ BÁN\'!H11:H{sold_last_data_row})', fmt_price)

    ws_dash.write('B12', 'Sơn dầu', fmt_cell)
    ws_dash.write_formula('C12', f'=COUNTIF(\'KHO TRANH\'!F6:F{inv_last_data_row}, "*Sơn dầu*")+COUNTIF(\'ĐÃ BÁN\'!F11:F{sold_last_data_row}, "*Sơn dầu*")', fmt_cell_center)
    ws_dash.write_formula('D12', f'=SUMIF(\'KHO TRANH\'!F6:F{inv_last_data_row}, "*Sơn dầu*", \'KHO TRANH\'!H6:H{inv_last_data_row})+SUMIF(\'ĐÃ BÁN\'!F11:F{sold_last_data_row}, "*Sơn dầu*", \'ĐÃ BÁN\'!H11:H{sold_last_data_row})', fmt_price)

    ws_dash.write('B13', 'Khác / Lụa', fmt_cell)
    ws_dash.write_formula('C13', f'=COUNTIF(\'KHO TRANH\'!F6:F{inv_last_data_row}, "*Lụa*")+COUNTIF(\'ĐÃ BÁN\'!F11:F{sold_last_data_row}, "*Lụa*")', fmt_cell_center)
    ws_dash.write_formula('D13', f'=SUMIF(\'KHO TRANH\'!F6:F{inv_last_data_row}, "*Lụa*", \'KHO TRANH\'!H6:H{inv_last_data_row})+SUMIF(\'ĐÃ BÁN\'!F11:F{sold_last_data_row}, "*Lụa*", \'ĐÃ BÁN\'!H11:H{sold_last_data_row})', fmt_price)

    ws_dash.write('B14', 'TỔNG CỘNG', fmt_total_label)
    ws_dash.write_formula('C14', '=SUM(C11:C13)', fmt_total_label)
    ws_dash.write_formula('D14', '=SUM(D11:D13)', fmt_total_price)

    # Status Data for Chart
    ws_dash.write('B16', 'TRẠNG THÁI KHO', fmt_th_mustard)
    ws_dash.write('C16', 'SỐ LƯỢNG', fmt_th_mustard)
    ws_dash.write('B17', 'Chưa bán', fmt_cell)
    ws_dash.write_formula('C17', '=C7', fmt_cell_center)
    ws_dash.write('B18', 'Đã bán', fmt_cell)
    ws_dash.write_formula('C18', '=E7', fmt_cell_center)

    # Chart 1: Donut Chart
    chart_status = wb.add_chart({'type': 'doughnut'})
    chart_status.add_series({
        'name': 'Tỷ Lệ Tồn Kho & Đã Bán',
        'categories': ['DASHBOARD TỔNG QUAN', 16, 1, 17, 1],
        'values':     ['DASHBOARD TỔNG QUAN', 16, 2, 17, 2],
        'points': [
            {'fill': {'color': C_MUSTARD}},   # Mustard for In Stock
            {'fill': {'color': C_BURGUNDY}},  # Burgundy for Sold
        ]
    })
    chart_status.set_title({'name': 'Tỷ Lệ Trạng Thái Kho'})
    chart_status.set_size({'width': 340, 'height': 230})
    ws_dash.insert_chart('B20', chart_status)

    # Chart 2: Column Chart
    chart_medium = wb.add_chart({'type': 'column'})
    chart_medium.add_series({
        'name': 'Giá Trị Tranh ($ USD)',
        'categories': ['DASHBOARD TỔNG QUAN', 10, 1, 11, 1],
        'values':     ['DASHBOARD TỔNG QUAN', 10, 3, 11, 3],
        'fill': {'color': C_MUSTARD}
    })
    chart_medium.set_title({'name': 'Giá Trị Theo Chất Liệu ($ USD)'})
    chart_medium.set_y_axis({'name': 'USD ($)'})
    chart_medium.set_size({'width': 450, 'height': 230})
    ws_dash.insert_chart('E10', chart_medium)

    # User Guide Block
    fmt_guide_title = wb.add_format({'font_name': 'Arial', 'font_size': 9.5, 'bold': True, 'color': '#FFFFFF', 'bg_color': C_BURGUNDY, 'border': 1, 'border_color': C_BURGUNDY_DARK})
    fmt_guide_text = wb.add_format({'font_name': 'Arial', 'font_size': 9, 'color': C_DARK, 'bg_color': '#FFFFFF', 'border': 1, 'border_color': C_BORDER, 'valign': 'top'})

    ws_dash.merge_range('E23:H23', '📌 QUY TRÌNH TỰ ĐỘNG DI CHUYỂN TRANH ĐÃ BÁN', fmt_guide_title)
    guide_lines = (
        "1. Kho Tranh (Chưa bán): Sheet 'KHO TRANH' chỉ hiển thị các bức tranh đang còn trong kho (Chưa bán).\n"
        "2. Tự động di chuyển khi Bán: Khi đổi cột Tình Trạng từ 'Chưa bán' -> 'Đã bán', bức tranh (kèm ảnh & thông tin) sẽ tự động rút khỏi 'KHO TRANH' và chuyển hẳn sang sheet 'ĐÃ BÁN'.\n"
        "3. Định dạng ngày chuẩn: dd-mm-yyyy (VD: 10-01-2026, 15-01-2026).\n"
        "4. Kích thước khung: Ghi kích thước thuần túy (VD: 85x53cm, 70x50cm, 110x110cm)."
    )
    ws_dash.merge_range('E24:H28', guide_lines, fmt_guide_text)

    # =========================================================
    # SHEET 2: KHO TRANH (ONLY UNSOLD / AVAILABLE PAINTINGS)
    # =========================================================
    ws_inv = wb.add_worksheet('KHO TRANH')
    ws_inv.set_tab_color(C_MUSTARD)
    ws_inv.hide_gridlines(0)

    # Decorative Top Strip
    for c in range(0, 19):
        ws_inv.write_blank(0, c, None, fmt_strip_mustard)
    ws_inv.set_row(0, 10)

    # Header with Logo & Title
    if os.path.exists(LOGO_PATH):
        ws_inv.insert_image('B2', LOGO_PATH, {
            'x_offset': 5,
            'y_offset': 2,
            'x_scale': 0.55,
            'y_scale': 0.55,
            'object_position': 1
        })
    ws_inv.merge_range('D2:J2', 'BÌNH MINH ART GALLERY - KHO TRANH ĐANG TRƯNG BÀY (CHƯA BÁN)', fmt_gallery_title)
    ws_inv.merge_range('D3:J3', 'Danh sách tranh hiện có tại phòng tranh — Khi chọn "Đã bán", tranh sẽ tự động di chuyển sang sheet ĐÃ BÁN', fmt_gallery_sub)
    ws_inv.set_row(1, 22)
    ws_inv.set_row(2, 18)

    headers = [
        ('STT', 6),
        ('Mã Tranh', 14),
        ('Hình Ảnh', 18),
        ('Tên Tác Phẩm', 24),
        ('Tác Giả', 18),
        ('Chất Liệu', 15),
        ('Tình Trạng', 15),
        ('Giá ($ USD)', 16),
        ('Cập Nhật Giá', 15),
        ('Kích Thước Tranh', 18),
        ('Kích Thước Khung', 18),
        ('Năm Sáng Tác', 14),
        ('Khách Hàng', 20),
        ('Ngày Mua Vào', 15),
        ('Ngày Bán', 15),
        ('Hoá Đơn', 16),
        ('Giấy CN', 12),
        ('Ngày Thêm', 15),
        ('Ghi Chú Nghệ Thuật', 35)
    ]

    header_row = 4
    ws_inv.set_row(header_row, 28)

    for col_idx, (h_name, width) in enumerate(headers):
        ws_inv.set_column(col_idx, col_idx, width)
        ws_inv.write(header_row, col_idx, h_name, fmt_th_mustard)

    # Populate ONLY UNSOLD paintings rows
    start_row = 5
    for idx, p in enumerate(unsold_items):
        row = start_row + idx
        ws_inv.set_row(row, 62)

        ws_inv.write(row, 0, idx + 1, fmt_cell_center)
        ws_inv.write(row, 1, p.get('id', ''), fmt_cell_center)

        # Thumbnail Image
        thumb_path = os.path.join('excel_thumbs', p['id'] + '.jpg')
        if os.path.exists(thumb_path):
            ws_inv.insert_image(row, 2, thumb_path, {
                'x_offset': 6,
                'y_offset': 4,
                'x_scale': 0.70,
                'y_scale': 0.70,
                'object_position': 1
            })
        else:
            ws_inv.write(row, 2, 'No image', fmt_cell_center)

        ws_inv.write(row, 3, p.get('ten_tac_pham', ''), fmt_cell_bold)
        ws_inv.write(row, 4, p.get('tac_gia', 'Dương Văn Sen'), fmt_cell)
        ws_inv.write(row, 5, p.get('chat_lieu', ''), fmt_cell)

        # Status is always Chưa bán here
        ws_inv.write(row, 6, 'Chưa bán', fmt_status_chua_ban)

        # Price
        if p.get('gia') is not None and p.get('gia') != '':
            ws_inv.write_number(row, 7, float(p['gia']), fmt_price)
        else:
            ws_inv.write(row, 7, '', fmt_price)

        # Clean frame dimensions (no parentheses)
        kf = str(p.get('kich_thuoc_khung_tranh', '')).strip()
        if '(' in kf:
            kf = kf.split('(')[0].strip()

        ws_inv.write(row, 8, p.get('ngay_cap_nhat_gia_gan_nhat', ''), fmt_cell_center)
        ws_inv.write(row, 9, p.get('kich_thuoc_tranh', ''), fmt_cell_center)
        ws_inv.write(row, 10, kf, fmt_cell_center)
        ws_inv.write(row, 11, p.get('nam_sang_tac', ''), fmt_cell_center)
        ws_inv.write(row, 12, p.get('khach_hang', ''), fmt_cell)
        ws_inv.write(row, 13, p.get('ngay_mua_vao', ''), fmt_cell_center)
        ws_inv.write(row, 14, p.get('ngay_ban') or '', fmt_cell_center)
        ws_inv.write(row, 15, p.get('hoa_don', ''), fmt_cell_center)
        ws_inv.write(row, 16, p.get('giay_chung_nhan', 'Yes'), fmt_cell_center)
        ws_inv.write(row, 17, p.get('ngay_them', ''), fmt_cell_center)
        ws_inv.write(row, 18, p.get('ghi_chu', ''), fmt_cell)

    # Total row at bottom of KHO TRANH
    total_row = start_row + len(unsold_items)
    ws_inv.set_row(total_row, 24)
    ws_inv.merge_range(total_row, 0, total_row, 6, f'TỔNG GIÁ TRỊ TỒN KHO ({len(unsold_items)} TÁC PHẨM CHƯA BÁN)', fmt_total_label)
    ws_inv.write_formula(total_row, 7, f'=SUM(H6:H{total_row})', fmt_total_price)
    for c in range(8, len(headers)):
        ws_inv.write(total_row, c, '', fmt_total_label)

    # Dropdowns
    ws_inv.data_validation(5, 6, 100, 6, {
        'validate': 'list',
        'source': ['Chưa bán', 'Đã bán'],
        'input_title': 'Chọn Tình Trạng',
        'input_message': 'Chọn "Đã bán" để tự động chuyển tác phẩm sang sheet ĐÃ BÁN'
    })
    ws_inv.data_validation(5, 5, 100, 5, {
        'validate': 'list',
        'source': ['Sơn mài', 'Sơn dầu', 'Lụa', 'Màu nước', 'Khác']
    })
    ws_inv.data_validation(5, 16, 100, 16, {
        'validate': 'list',
        'source': ['Yes', 'No']
    })
    ws_inv.autofilter(header_row, 0, total_row - 1, len(headers) - 1)

    # =========================================================
    # SHEET 3: ĐÃ BÁN (ONLY SOLD PAINTINGS - MOVED HERE)
    # =========================================================
    ws_sold = wb.add_worksheet('ĐÃ BÁN')
    ws_sold.set_tab_color(C_BURGUNDY)
    ws_sold.hide_gridlines(0)

    # Decorative Burgundy Strip
    for c in range(0, 19):
        ws_sold.write_blank(0, c, None, fmt_strip_burgundy)
    ws_sold.set_row(0, 10)

    # Header with Logo & Title
    if os.path.exists(LOGO_PATH):
        ws_sold.insert_image('B2', LOGO_PATH, {
            'x_offset': 5,
            'y_offset': 2,
            'x_scale': 0.55,
            'y_scale': 0.55,
            'object_position': 1
        })
    ws_sold.merge_range('D2:K2', 'BÌNH MINH ART GALLERY - DANH MỤC TRANH ĐÃ BÁN', fmt_gallery_title)
    ws_sold.merge_range('D3:K3', 'Cập nhật hàng ngày: Các tác phẩm đã bán được tự động di chuyển từ Kho Tranh sang đây', fmt_gallery_sub)
    ws_sold.set_row(1, 22)
    ws_sold.set_row(2, 18)

    # KPI Mini Cards for Sold Sheet
    ws_sold.write('B6', 'TỔNG TRANH ĐÃ BÁN', fmt_card_title)
    ws_sold.write('C6', 'TỔNG DOANH THU ĐÃ THU ($)', fmt_card_title)
    ws_sold.write('D6', 'GIAO DỊCH GẦN NHẤT', fmt_card_title)
    ws_sold.set_row(5, 18)

    ws_sold.write_formula('B7', f"=COUNTA(B11:B{sold_last_data_row})", fmt_card_num)
    ws_sold.write_formula('C7', f"=SUM(H11:H{sold_last_data_row})", fmt_card_sold_cur)
    latest_sale_date = sold_items[-1].get('ngay_ban', '15-01-2026') if sold_items else '—'
    ws_sold.write('D7', latest_sale_date, fmt_cell_center)
    ws_sold.set_row(6, 30)

    sold_headers = [
        ('STT', 6),
        ('Mã Tranh', 14),
        ('Hình Ảnh', 18),
        ('Tên Tác Phẩm', 24),
        ('Tác Giả', 18),
        ('Chất Liệu', 15),
        ('Tình Trạng', 14),
        ('Giá Bán ($ USD)', 16),
        ('Ngày Bán', 15),
        ('Khách Hàng', 22),
        ('Hoá Đơn', 16),
        ('Giấy CN', 12),
        ('Kích Thước Tranh', 18),
        ('Kích Thước Khung', 18),
        ('Năm Sáng Tác', 14),
        ('Ngày Mua Vào', 15),
        ('Cập Nhật Giá', 15),
        ('Ngày Thêm', 15),
        ('Ghi Chú Giao Dịch', 35)
    ]

    sold_header_row = 9
    ws_sold.set_row(sold_header_row, 28)

    for col_idx, (h_name, width) in enumerate(sold_headers):
        ws_sold.set_column(col_idx, col_idx, width)
        ws_sold.write(sold_header_row, col_idx, h_name, fmt_th_burgundy)

    # Populate Sold paintings
    start_sold_row = 10

    for s_idx, p in enumerate(sold_items):
        r = start_sold_row + s_idx
        ws_sold.set_row(r, 62)

        ws_sold.write(r, 0, s_idx + 1, fmt_cell_center)
        ws_sold.write(r, 1, p.get('id', ''), fmt_cell_center)

        # Image
        thumb_path = os.path.join('excel_thumbs', p['id'] + '.jpg')
        if os.path.exists(thumb_path):
            ws_sold.insert_image(r, 2, thumb_path, {
                'x_offset': 6,
                'y_offset': 4,
                'x_scale': 0.70,
                'y_scale': 0.70,
                'object_position': 1
            })
        else:
            ws_sold.write(r, 2, 'No image', fmt_cell_center)

        ws_sold.write(r, 3, p.get('ten_tac_pham', ''), fmt_cell_bold)
        ws_sold.write(r, 4, p.get('tac_gia', 'Dương Văn Sen'), fmt_cell)
        ws_sold.write(r, 5, p.get('chat_lieu', ''), fmt_cell)
        ws_sold.write(r, 6, 'Đã bán', fmt_status_da_ban)

        if p.get('gia') is not None and p.get('gia') != '':
            ws_sold.write_number(r, 7, float(p['gia']), fmt_price)
        else:
            ws_sold.write(r, 7, '', fmt_price)

        kf = str(p.get('kich_thuoc_khung_tranh', '')).strip()
        if '(' in kf:
            kf = kf.split('(')[0].strip()

        ws_sold.write(r, 8, p.get('ngay_ban') or '', fmt_cell_center)
        ws_sold.write(r, 9, p.get('khach_hang', ''), fmt_cell)
        ws_sold.write(r, 10, p.get('hoa_don', ''), fmt_cell_center)
        ws_sold.write(r, 11, p.get('giay_chung_nhan', 'Yes'), fmt_cell_center)
        ws_sold.write(r, 12, p.get('kich_thuoc_tranh', ''), fmt_cell_center)
        ws_sold.write(r, 13, kf, fmt_cell_center)
        ws_sold.write(r, 14, p.get('nam_sang_tac', ''), fmt_cell_center)
        ws_sold.write(r, 15, p.get('ngay_mua_vao', ''), fmt_cell_center)
        ws_sold.write(r, 16, p.get('ngay_cap_nhat_gia_gan_nhat', ''), fmt_cell_center)
        ws_sold.write(r, 17, p.get('ngay_them', ''), fmt_cell_center)
        ws_sold.write(r, 18, p.get('ghi_chu', ''), fmt_cell)

    sold_end_row = start_sold_row + max(len(sold_items), 1)

    # Total row in Sold sheet
    ws_sold.set_row(sold_end_row, 24)
    ws_sold.merge_range(sold_end_row, 0, sold_end_row, 6, f'TỔNG DOANH THU ĐÃ BÁN ({len(sold_items)} TÁC PHẨM)', fmt_total_label)
    ws_sold.write_formula(sold_end_row, 7, f'=SUM(H11:H{sold_end_row})', fmt_total_price)
    for c in range(8, len(sold_headers)):
        ws_sold.write(sold_end_row, c, '', fmt_total_label)

    # Allow changing status back to Chưa bán if returned
    ws_sold.data_validation(10, 6, 100, 6, {
        'validate': 'list',
        'source': ['Đã bán', 'Chưa bán'],
        'input_title': 'Tình Trạng',
        'input_message': 'Đổi về "Chưa bán" nếu khách hoàn trả để chuyển lại về KHO TRANH'
    })
    ws_sold.autofilter(sold_header_row, 0, sold_end_row - 1, len(sold_headers) - 1)

    # Close workbook
    wb.close()
    print(f'Successfully created {out_path}, size: {os.path.getsize(out_path)} bytes (InStock: {len(unsold_items)}, Sold: {len(sold_items)})')

for path in OUTPUT_PATHS:
    build_workbook(path)
