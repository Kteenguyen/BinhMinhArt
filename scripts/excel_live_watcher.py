# macOS-only DEV tool: drives Microsoft Excel through AppleScript (osascript).
# Not used by the server and not shipped to the Windows PC (the server has its own
# Excel DB Watcher that works on any OS).
import subprocess
import json
import time
import os
from datetime import datetime

DB_PATH = 'data/paintings.json'

APPLESCRIPT_READ = '''
tell application "System Events"
    if not ((name of processes) contains "Microsoft Excel") then return "EXCEL_CLOSED"
end tell
tell application "Microsoft Excel"
    if not (exists active workbook) then return "NO_WB"
    if name of active workbook is not "BinhMinhArt.xlsx" then return "OTHER_WB"
    
    set activeSheetName to name of active sheet of active workbook
    set resultList to {"ACTIVE_SHEET|||" & activeSheetName}
    
    try
        set myRows to value of range "B6:S30" of worksheet "KHO TRANH" of active workbook
        set rIdx to 6
        repeat with myRow in myRows
            set firstCol to (item 1 of myRow) as string
            if firstCol is not "" and firstCol is not "missing value" and firstCol does not start with "TỔNG" then
                set rowStr to "KHO|||" & (rIdx as string)
                repeat with myCell in myRow
                    set cStr to myCell as string
                    if cStr is "missing value" then set cStr to ""
                    set rowStr to rowStr & "|||" & cStr
                end repeat
                set end of resultList to rowStr
            end if
            set rIdx to rIdx + 1
        end repeat
    end try
    
    try
        set myRows2 to value of range "B11:S30" of worksheet "ĐÃ BÁN" of active workbook
        set rIdx2 to 11
        repeat with myRow in myRows2
            set firstCol to (item 1 of myRow) as string
            if firstCol is not "" and firstCol is not "missing value" and firstCol does not start with "TỔNG" then
                set rowStr to "SOLD|||" & (rIdx2 as string)
                repeat with myCell in myRow
                    set cStr to myCell as string
                    if cStr is "missing value" then set cStr to ""
                    set rowStr to rowStr & "|||" & cStr
                end repeat
                set end of resultList to rowStr
            end if
            set rIdx2 to rIdx2 + 1
        end repeat
    end try
    
    set AppleScript's text item delimiters to linefeed
    return resultList as string
end tell
'''

def parse_num(val_str):
    if not val_str:
        return None
    s = val_str.strip().replace('$', '').strip()
    # AppleScript on Vietnamese/French locale may use comma for decimal: e.g. 1500,0 or 1,5E+4
    s = s.replace(',', '.')
    try:
        return float(s)
    except:
        return None

def clean_year(val_str):
    if not val_str:
        return ''
    s = val_str.strip()
    if s.endswith(',0') or s.endswith('.0'):
        s = s[:-2]
    return s

def get_today_ddmmyyyy():
    return datetime.now().strftime('%d-%m-%Y')

def rebuild_and_reload(active_sheet='KHO TRANH'):
    subprocess.run(['osascript', '-e', '''
    tell application "Microsoft Excel"
        try
            close active workbook saving no
        end try
    end tell
    '''])
    subprocess.run(['python3', 'scripts/build_excel_dashboard.py'])
    subprocess.run(['osascript', '-e', f'''
    tell application "Microsoft Excel"
        activate
        open "/Users/mac/Documents/BinhMinhArt.xlsx"
        try
            activate object worksheet "{active_sheet}" of active workbook
        end try
    end tell
    '''])

def set_excel_cell(sheet_name, cell_addr, val):
    script = f'''
    tell application "Microsoft Excel"
        try
            set value of cell "{cell_addr}" of worksheet "{sheet_name}" of active workbook to "{val}"
        end try
    end tell
    '''
    subprocess.run(['osascript', '-e', script])

def poll_once():
    res = subprocess.run(['osascript', '-e', APPLESCRIPT_READ], capture_output=True, text=True)
    if res.returncode != 0:
        return
    out = res.stdout.strip()
    if not out or out in ('EXCEL_CLOSED', 'NO_WB', 'OTHER_WB'):
        return

    lines = out.split('\n')
    active_sheet = 'KHO TRANH'
    if lines and lines[0].startswith('ACTIVE_SHEET|||'):
        active_sheet = lines[0].split('|||')[1]
        lines = lines[1:]

    with open(DB_PATH, 'r', encoding='utf-8') as f:
        paintings = json.load(f)

    p_map = {p['id']: p for p in paintings}
    needs_rebuild = False
    needs_json_save = False
    today = get_today_ddmmyyyy()

    for line in lines:
        parts = line.split('|||')
        if len(parts) < 20:
            continue
        sheet_type = parts[0]
        row_num = parts[1]
        # Columns B..S (18 columns):
        # parts[2] = B (id)
        # parts[3] = C (img)
        # parts[4] = D (ten_tac_pham)
        # parts[5] = E (tac_gia)
        # parts[6] = F (chat_lieu)
        # parts[7] = G (tinh_trang)
        # parts[8] = H (gia)
        p_id = parts[2].strip()
        if p_id not in p_map:
            continue
        p = p_map[p_id]

        if sheet_type == 'KHO':
            # KHO TRANH columns:
            # 8:H(gia), 9:I(ngay_gia), 10:J(kt_tranh), 11:K(kt_khung), 12:L(nam),
            # 13:M(khach), 14:N(ngay_mua), 15:O(ngay_ban), 16:P(hoa_don), 17:Q(giay_cn), 18:R(ngay_them), 19:S(ghi_chu)
            status_str = parts[7].strip().lower()
            new_price = parse_num(parts[8])
            if new_price != p.get('gia'):
                p['gia'] = int(new_price) if new_price is not None and new_price.is_integer() else new_price
                p['ngay_cap_nhat_gia_gan_nhat'] = today
                set_excel_cell('KHO TRANH', f'I{row_num}', today)
                needs_json_save = True

            # Sync text fields if edited
            for idx_col, key, cleaner in [
                (4, 'ten_tac_pham', str.strip),
                (5, 'tac_gia', str.strip),
                (6, 'chat_lieu', str.strip),
                (10, 'kich_thuoc_tranh', str.strip),
                (11, 'kich_thuoc_khung_tranh', str.strip),
                (12, 'nam_sang_tac', clean_year),
                (13, 'khach_hang', str.strip),
                (14, 'ngay_mua_vao', str.strip),
                (16, 'hoa_don', str.strip),
                (17, 'giay_chung_nhan', str.strip),
                (19, 'ghi_chu', str.strip)
            ]:
                val_clean = cleaner(parts[idx_col])
                if val_clean and val_clean != str(p.get(key, '')):
                    p[key] = val_clean
                    needs_json_save = True

            # Check if status changed to Đã bán!
            if 'đã bán' in status_str or status_str == 'da_ban':
                print(f'[Watcher] Detected {p_id} changed to Đã bán in KHO TRANH! Moving to ĐÃ BÁN...')
                p['tinh_trang'] = 'da_ban'
                raw_ngay_ban = parts[15].strip()
                p['ngay_ban'] = raw_ngay_ban if raw_ngay_ban else today
                needs_json_save = True
                needs_rebuild = True

        elif sheet_type == 'SOLD':
            # ĐÃ BÁN columns:
            # 8:H(gia), 9:I(ngay_ban), 10:J(khach), 11:K(hoa_don), 12:L(giay_cn),
            # 13:M(kt_tranh), 14:N(kt_khung), 15:O(nam), 16:P(ngay_mua), 17:Q(ngay_gia), 18:R(ngay_them), 19:S(ghi_chu)
            status_str = parts[7].strip().lower()
            new_price = parse_num(parts[8])
            if new_price != p.get('gia'):
                p['gia'] = int(new_price) if new_price is not None and new_price.is_integer() else new_price
                p['ngay_cap_nhat_gia_gan_nhat'] = today
                needs_json_save = True

            for idx_col, key, cleaner in [
                (9, 'ngay_ban', str.strip),
                (10, 'khach_hang', str.strip),
                (11, 'hoa_don', str.strip),
                (12, 'giay_chung_nhan', str.strip),
                (13, 'kich_thuoc_tranh', str.strip),
                (14, 'kich_thuoc_khung_tranh', str.strip),
                (15, 'nam_sang_tac', clean_year),
                (19, 'ghi_chu', str.strip)
            ]:
                val_clean = cleaner(parts[idx_col])
                if val_clean != str(p.get(key, '') or ''):
                    p[key] = val_clean
                    needs_json_save = True

            # Check if status changed back to Chưa bán!
            if 'chưa bán' in status_str or status_str == 'chua_ban':
                print(f'[Watcher] Detected {p_id} changed back to Chưa bán in ĐÃ BÁN! Moving to KHO TRANH...')
                p['tinh_trang'] = 'chua_ban'
                p['ngay_ban'] = None
                needs_json_save = True
                needs_rebuild = True

    if needs_json_save:
        with open(DB_PATH, 'w', encoding='utf-8') as f:
            json.dump(paintings, f, indent=2, ensure_ascii=False)

    if needs_rebuild:
        rebuild_and_reload(active_sheet)

if __name__ == '__main__':
    print('[BinhMinhArt Excel Live Watcher] Started monitoring Microsoft Excel...')
    while True:
        try:
            poll_once()
        except Exception as e:
            print('Watcher error:', e)
        time.sleep(1.5)
