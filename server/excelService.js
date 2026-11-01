import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { pickPrimaryLanIp, isLoopbackHost, hostnameOfOrigin } from './network.js';

/**
 * Address other devices must use: the IP saved in settings, else this machine's own home-network IP,
 * and only as a last resort localhost (works on this machine only).
 */
function getActiveBaseUrl() {
  const port = process.env.PORT || 5001;
  try {
    const cfgFile = path.resolve('data', 'network_config.json');
    if (fs.existsSync(cfgFile)) {
      const parsed = JSON.parse(fs.readFileSync(cfgFile, 'utf-8'));
      if (parsed.customIp && String(parsed.customIp).trim()) {
        const cleanHost = String(parsed.customIp).trim().replace(/^https?:\/\//, '').replace(/:\d+$/, '');
        return `https://${cleanHost}:${port}`;
      }
    }
  } catch {
    // ignore
  }
  const autoIp = pickPrimaryLanIp();
  if (autoIp) return `https://${autoIp}:${port}`;
  return `https://localhost:${port}`;
}

export function getArtworkQrTargetUrl(id, customOrigin = '') {
  // A browser opened through "localhost" reports "http://localhost:..." as its origin; that address is
  // useless to the phone that scans the QR, so only a real network address is accepted from the caller.
  const requested = String(customOrigin || '').trim();
  const requestedHost = requested ? hostnameOfOrigin(requested) : null;
  const usableOrigin = requestedHost && !isLoopbackHost(requestedHost) ? requested : '';
  const base = (usableOrigin || getActiveBaseUrl()).replace(/\/+$/, '');
  return `${base}/tranh/${encodeURIComponent(String(id || '').trim())}`;
}

export async function ensureQrPngFiles(paintings) {
  const qrDir = path.resolve('thumbnails', 'qr');
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }
  for (const p of paintings || []) {
    if (!p || !p.id) continue;
    const safeId = String(p.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const qrPath = path.join(qrDir, `${safeId}.png`);
    const targetUrl = getArtworkQrTargetUrl(p.id);
    try {
      await QRCode.toFile(qrPath, targetUrl, {
        type: 'png',
        width: 240,
        margin: 1,
        color: { dark: '#1C1917', light: '#FFFFFF' }
      });
    } catch {
      // ignore individual qr write errors
    }
  }
}

const UPDATING_LABEL = 'Đang cập nhật';

function valOrUpdating(v) {
  if (v === null || v === undefined) return UPDATING_LABEL;
  const s = String(v).trim();
  return s ? s : UPDATING_LABEL;
}

function cleanExcelCell(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const low = s.toLowerCase();
  if (low === 'đang cập nhật' || low === 'dang cap nhat' || low === '—' || low === '-') {
    return '';
  }
  return s;
}

/**
 * Format painting items into Excel workbook with DASHBOARD TỔNG QUAN, KHO TRANH, and ĐÃ BÁN sheets.
 * Serves as the primary Excel Database (SSOT).
 */
export function buildExcelWorkbook(paintings) {
  const headers = [
    'STT',
    'Mã Tranh',
    'Mã QR (Tra Cứu Nhanh)',
    'Tên Tác Phẩm',
    'Tác Giả',
    'Chất Liệu',
    'Vị Trí',
    'Giá ($ USD)',
    'Cập Nhật Giá',
    'Kích Thước Tranh',
    'Kích Thước Khung',
    'Năm Sáng Tác',
    'Ngày Mua Vào',
    'Giấy CN',
    'Ngày Thêm',
    'Ngày Cập Nhật SP',
    'Ghi Chú Nghệ Thuật',
    'Ảnh Đại Diện'
  ];

  // 1. Sheet KHO TRANH (ONLY UNSOLD / CHƯA BÁN ITEMS — Các cột Ngày Bán, Hoá Đơn, Khách Hàng nằm ở Sheet ĐÃ BÁN)
  const unsoldPaintings = paintings.filter(p => p.tinh_trang !== 'da_ban');
  const rows = unsoldPaintings.map((p, idx) => {
    let kf = String(p.kich_thuoc_khung_tranh || '').trim();
    if (kf.includes('(')) kf = kf.split('(')[0].trim();
    const qrUrl = getArtworkQrTargetUrl(p.id);

    return [
      idx + 1,
      p.id,
      qrUrl,
      valOrUpdating(p.ten_tac_pham),
      valOrUpdating(p.tac_gia),
      valOrUpdating(p.chat_lieu),
      valOrUpdating(p.location || 'Kho'),
      p.gia !== null && p.gia !== undefined && p.gia !== '' ? Number(p.gia) : UPDATING_LABEL,
      valOrUpdating(p.ngay_cap_nhat_gia_gan_nhat),
      valOrUpdating(p.kich_thuoc_tranh),
      valOrUpdating(kf),
      valOrUpdating(p.nam_sang_tac),
      valOrUpdating(p.ngay_mua_vao),
      valOrUpdating(p.giay_chung_nhan),
      valOrUpdating(p.ngay_them),
      valOrUpdating(p.ngay_cap_nhat_san_pham),
      valOrUpdating(p.ghi_chu),
      Array.isArray(p.hinh_anh) && p.hinh_anh.length > 0 ? p.hinh_anh.join(' | ') : UPDATING_LABEL
    ];
  });

  const totalCount = paintings.length;
  const inStockCount = paintings.filter(p => p.tinh_trang !== 'da_ban').length;
  const soldCount = paintings.filter(p => p.tinh_trang === 'da_ban').length;
  const inStockValue = paintings
    .filter(p => p.tinh_trang !== 'da_ban' && typeof p.gia === 'number')
    .reduce((sum, p) => sum + p.gia, 0);
  const soldRevenue = paintings
    .filter(p => p.tinh_trang === 'da_ban' && typeof p.gia === 'number')
    .reduce((sum, p) => sum + p.gia, 0);

  rows.push([]);
  rows.push([
    'TỔNG KHO',
    '',
    '',
    `Tổng: ${totalCount} tác phẩm`,
    '',
    '',
    `Chưa bán: ${inStockCount} | Đã bán: ${soldCount}`,
    `Tồn: $${inStockValue.toLocaleString()} | Thu: $${soldRevenue.toLocaleString()}`
  ]);

  const wsKhoTranh = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Attach clickable hyperlinks to QR Column (Column C -> index 2)
  unsoldPaintings.forEach((p, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: idx + 1, c: 2 });
    const qrUrl = getArtworkQrTargetUrl(p.id);
    if (wsKhoTranh[cellRef]) {
      wsKhoTranh[cellRef].l = {
        Target: qrUrl,
        Tooltip: `Mở trang chi tiết tác phẩm ${p.id}`
      };
    }
  });

  wsKhoTranh['!cols'] = [
    { wch: 6 },  { wch: 14 }, { wch: 36 }, { wch: 25 }, { wch: 18 }, { wch: 15 },
    { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
    { wch: 14 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 16 },
    { wch: 14 }, { wch: 15 }, { wch: 20 }, { wch: 32 }, { wch: 40 }
  ];

  // 2. Sheet ĐÃ BÁN
  const soldPaintings = paintings.filter(p => p.tinh_trang === 'da_ban');
  const soldHeaders = [
    'STT',
    'Mã Tranh',
    'Mã QR (Tra Cứu Nhanh)',
    'Tên Tác Phẩm',
    'Tác Giả',
    'Chất Liệu',
    'Vị Trí',
    'Tình Trạng',
    'Giá Bán ($ USD)',
    'Ngày Bán',
    'Khách Hàng',
    'Hoá Đơn',
    'Giấy CN',
    'Kích Thước Tranh',
    'Kích Thước Khung',
    'Năm Sáng Tác',
    'Ngày Mua Vào',
    'Cập Nhật Giá',
    'Ngày Thêm',
    'Ngày Cập Nhật SP',
    'Ghi Chú Giao Dịch',
    'Ảnh Đại Diện'
  ];

  const soldRows = soldPaintings.map((p, idx) => {
    let kf = String(p.kich_thuoc_khung_tranh || '').trim();
    if (kf.includes('(')) kf = kf.split('(')[0].trim();
    const qrUrl = getArtworkQrTargetUrl(p.id);

    return [
      idx + 1,
      p.id,
      qrUrl,
      valOrUpdating(p.ten_tac_pham),
      valOrUpdating(p.tac_gia),
      valOrUpdating(p.chat_lieu),
      valOrUpdating(p.location || 'Kho'),
      'Đã bán',
      p.gia !== null && p.gia !== undefined && p.gia !== '' ? Number(p.gia) : UPDATING_LABEL,
      valOrUpdating(p.ngay_ban),
      valOrUpdating(p.khach_hang),
      valOrUpdating(p.hoa_don),
      valOrUpdating(p.giay_chung_nhan),
      valOrUpdating(p.kich_thuoc_tranh),
      valOrUpdating(kf),
      valOrUpdating(p.nam_sang_tac),
      valOrUpdating(p.ngay_mua_vao),
      valOrUpdating(p.ngay_cap_nhat_gia_gan_nhat),
      valOrUpdating(p.ngay_them),
      valOrUpdating(p.ngay_cap_nhat_san_pham),
      valOrUpdating(p.ghi_chu),
      Array.isArray(p.hinh_anh) && p.hinh_anh.length > 0 ? p.hinh_anh.join(' | ') : UPDATING_LABEL
    ];
  });
  soldRows.push([]);
  soldRows.push(['TỔNG DOANH THU ĐÃ BÁN', '', '', '', '', '', '', `$${soldRevenue.toLocaleString()}`]);

  const wsDaBan = XLSX.utils.aoa_to_sheet([soldHeaders, ...soldRows]);
  soldPaintings.forEach((p, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: idx + 1, c: 2 });
    const qrUrl = getArtworkQrTargetUrl(p.id);
    if (wsDaBan[cellRef]) {
      wsDaBan[cellRef].l = {
        Target: qrUrl,
        Tooltip: `Mở trang chi tiết tác phẩm ${p.id}`
      };
    }
  });

  wsDaBan['!cols'] = [
    { wch: 6 },  { wch: 14 }, { wch: 36 }, { wch: 25 }, { wch: 18 }, { wch: 15 },
    { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 16 },
    { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 32 }, { wch: 40 }
  ];

  // 3. Sheet DASHBOARD TỔNG QUAN (kèm Bảng Thống Kê Chi Tiết Từng Họa Sĩ)
  const artistMap = new Map();
  paintings.forEach(p => {
    const artist = String(p.tac_gia || 'Dương Văn Sen').trim() || 'Dương Văn Sen';
    if (!artistMap.has(artist)) {
      artistMap.set(artist, {
        name: artist,
        total: 0,
        inStock: 0,
        inStockValue: 0,
        sold: 0,
        soldRevenue: 0
      });
    }
    const stat = artistMap.get(artist);
    stat.total += 1;
    if (p.tinh_trang === 'da_ban') {
      stat.sold += 1;
      if (typeof p.gia === 'number') stat.soldRevenue += p.gia;
    } else {
      stat.inStock += 1;
      if (typeof p.gia === 'number') stat.inStockValue += p.gia;
    }
  });

  const summaryHeaders = ['Chỉ Số Báo Cáo (Excel Database SSOT)', 'Giá Trị', '', '', '', ''];
  const summaryRows = [
    ['Tổng số tác phẩm trong kho', totalCount, '', '', '', ''],
    ['Tổng số họa sĩ trong hệ thống', artistMap.size, '', '', '', ''],
    ['Số lượng tranh chưa bán (Đang trưng bày)', inStockCount, '', '', '', ''],
    ['Tổng giá trị niêm yết tranh tồn kho ($ USD)', `$${inStockValue.toLocaleString()}`, '', '', '', ''],
    ['Số lượng tranh đã bán', soldCount, '', '', '', ''],
    ['Tổng doanh thu tranh đã bán ($ USD)', `$${soldRevenue.toLocaleString()}`, '', '', '', ''],
    ['Tranh chưa định giá (Thỏa thuận)', paintings.filter(p => p.gia === null || p.gia === undefined).length, '', '', '', ''],
    ['Thời điểm đồng bộ gần nhất', new Date().toLocaleString('vi-VN'), '', '', '', ''],
    [],
    ['BẢNG THỐNG KÊ TỒN KHO & DOANH THU THEO TỪNG HỌA SĨ', '', '', '', '', ''],
    [
      'Họa Sĩ / Tác Giả',
      'Tổng Số Tranh',
      'Tranh Chưa Bán',
      'Giá Trị Tồn Kho ($ USD)',
      'Tranh Đã Bán',
      'Doanh Thu Đã Bán ($ USD)'
    ],
    ...Array.from(artistMap.values()).map(a => [
      `HS. ${a.name}`,
      a.total,
      a.inStock,
      `$${a.inStockValue.toLocaleString()}`,
      a.sold,
      `$${a.soldRevenue.toLocaleString()}`
    ])
  ];
  const wsDash = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  wsDash['!cols'] = [
    { wch: 44 },
    { wch: 24 },
    { wch: 18 },
    { wch: 24 },
    { wch: 18 },
    { wch: 24 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsDash, 'DASHBOARD TỔNG QUAN');
  XLSX.utils.book_append_sheet(workbook, wsKhoTranh, 'KHO TRANH');
  XLSX.utils.book_append_sheet(workbook, wsDaBan, 'ĐÃ BÁN');

  return workbook;
}

export function saveExcelFileToDisk(paintings, targetPath = 'BinhMinhArt_Inventory.xlsx') {
  const wb = buildExcelWorkbook(paintings);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.mkdirSync(path.dirname(path.resolve(targetPath)), { recursive: true });

  // Write to a temp file, then rename over the target: readers never see a half-written file,
  // and if the target is locked (open in Excel on Windows) the rename fails with a clear error.
  const tmpPath = `${targetPath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, targetPath);
  } catch (err) {
    fs.rmSync(tmpPath, { force: true });
    throw err;
  }
  ensureQrPngFiles(paintings).catch(() => {});
  return targetPath;
}

/**
 * Parse a single worksheet (handles both row-0 headers and luxury row-4 / row-9 headers)
 */
function parseSheetRows(worksheet, defaultStatus = 'chua_ban', fallbackMap = new Map()) {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!jsonData || jsonData.length < 2) return [];

  // Find header row within first 15 rows
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(15, jsonData.length); r++) {
    const rowCells = (jsonData[r] || []).map(c => String(c || '').trim().toLowerCase());
    const hasTitleCol = rowCells.some(c => c.includes('tên tác phẩm') || c.includes('tác phẩm') || c === 'title');
    const hasIdOrMed = rowCells.some(c => c.includes('mã tranh') || c.includes('chất liệu') || c.includes('tác giả'));
    if (hasTitleCol && hasIdOrMed) {
      headerRowIdx = r;
      break;
    }
  }

  const headers = (jsonData[headerRowIdx] || []).map(h => String(h || '').trim().toLowerCase());
  const rows = jsonData.slice(headerRowIdx + 1);

  const getIdx = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));

  const idxId = getIdx(['mã tranh', 'sku', 'id']);
  const idxTen = getIdx(['tên tác phẩm', 'tác phẩm', 'tên', 'title']);
  const idxTacGia = getIdx(['tác giả', 'họa sĩ', 'artist']);
  const idxChatLieu = getIdx(['chất liệu', 'medium']);
  const idxTinhTrang = getIdx(['tình trạng', 'trạng thái', 'status']);
  const idxGia = getIdx(['giá', 'price']);
  const idxNgayGia = getIdx(['cập nhật giá', 'ngày giá']);
  const idxKtTranh = getIdx(['kích thước tranh', 'kt tranh']);
  const idxKtKhung = getIdx(['kích thước khung', 'kt khung']);
  const idxNam = getIdx(['năm sáng tác', 'năm', 'year']);
  const idxKhach = getIdx(['khách hàng', 'khách', 'buyer']);
  const idxMua = getIdx(['ngày mua', 'mua vào']);
  const idxBan = getIdx(['ngày bán']);
  const idxHoaDon = getIdx(['hoá đơn', 'hóa đơn', 'invoice']);
  const idxGcn = getIdx(['giấy cn', 'chứng nhận', 'giấy']);
  const idxNgayThem = getIdx(['ngày thêm', 'created']);
  const idxNgayCapNhatSp = getIdx(['ngày cập nhật sp', 'cập nhật sản phẩm', 'cập nhật sp', 'updated']);
  const idxGhiChu = getIdx(['ghi chú', 'note']);
  const idxAnh = getIdx(['ảnh đại diện', 'đường dẫn ảnh', 'ảnh', 'hình ảnh', 'image']);

  const parsedItems = [];

  for (const row of rows) {
    if (!row || row.length === 0) continue;

    const rawId = idxId >= 0 ? cleanExcelCell(row[idxId]) : '';
    const ten = idxTen >= 0 ? cleanExcelCell(row[idxTen]) : '';

    // Skip summary / total rows
    if (!ten && !rawId) continue;
    const checkTotal = `${rawId} ${ten} ${String(row[0] || '')}`.toLowerCase();
    if (
      checkTotal.includes('tổng kho') ||
      checkTotal.includes('tổng cộng') ||
      checkTotal.includes('tổng giá trị') ||
      checkTotal.includes('tổng doanh thu')
    ) {
      continue;
    }
    if (!ten && !rawId) continue;

    const existing = rawId && fallbackMap.has(rawId) ? fallbackMap.get(rawId) : null;

    // Parse Price
    let giaVal = null;
    const rawGia = idxGia >= 0 ? row[idxGia] : undefined;
    if (typeof rawGia === 'number') {
      giaVal = rawGia;
    } else if (typeof rawGia === 'string') {
      const sGia = cleanExcelCell(rawGia);
      if (sGia && !sGia.toLowerCase().includes('thỏa thuận')) {
        const cleanGia = sGia.replace(/[$usdUSD\s]/g, '').replace(/[,.]/g, '');
        const num = parseFloat(cleanGia);
        if (!isNaN(num)) giaVal = num;
      }
    }

    // Parse Status
    const rawTt = idxTinhTrang >= 0 ? cleanExcelCell(row[idxTinhTrang]).toLowerCase() : '';
    let tinhTrang = defaultStatus;
    if (rawTt.includes('đã bán') || rawTt.includes('da_ban') || rawTt.includes('sold')) {
      tinhTrang = 'da_ban';
    } else if (rawTt.includes('chưa bán') || rawTt.includes('chua_ban')) {
      tinhTrang = 'chua_ban';
    }

    let kf = idxKtKhung >= 0 ? cleanExcelCell(row[idxKtKhung]) : '';
    if (kf.includes('(')) kf = kf.split('(')[0].trim();

    // Parse Images (preserve existing images if Excel column contains "No image", "Đang cập nhật", or blank)
    let hinhAnhArr = [];
    if (idxAnh >= 0 && row[idxAnh]) {
      const rawAnhStr = cleanExcelCell(row[idxAnh]);
      if (rawAnhStr && rawAnhStr.toLowerCase() !== 'no image' && (rawAnhStr.startsWith('/') || rawAnhStr.startsWith('http'))) {
        hinhAnhArr = rawAnhStr.split('|').map(s => s.trim()).filter(Boolean);
      }
    }
    if (hinhAnhArr.length === 0 && existing && Array.isArray(existing.hinh_anh)) {
      hinhAnhArr = existing.hinh_anh;
    }

    const rawGcn = idxGcn >= 0 ? cleanExcelCell(row[idxGcn]) : '';

    const item = {
      id: rawId || `BMA-${Date.now().toString().slice(-4)}-${parsedItems.length + 1}`,
      ten_tac_pham: ten || (existing && existing.ten_tac_pham) || '',
      tac_gia: (idxTacGia >= 0 ? cleanExcelCell(row[idxTacGia]) : '') || (existing && existing.tac_gia) || '',
      chat_lieu: (idxChatLieu >= 0 ? cleanExcelCell(row[idxChatLieu]) : '') || (existing && existing.chat_lieu) || '',
      tinh_trang: tinhTrang,
      gia: giaVal,
      ngay_cap_nhat_gia_gan_nhat: (idxNgayGia >= 0 ? cleanExcelCell(row[idxNgayGia]) : '') || (existing && existing.ngay_cap_nhat_gia_gan_nhat) || '',
      kich_thuoc_tranh: (idxKtTranh >= 0 ? cleanExcelCell(row[idxKtTranh]) : '') || (existing && existing.kich_thuoc_tranh) || '',
      kich_thuoc_khung_tranh: kf || (existing && existing.kich_thuoc_khung_tranh) || '',
      nam_sang_tac: (idxNam >= 0 ? cleanExcelCell(row[idxNam]).replace(/\.0$/, '') : '') || (existing && existing.nam_sang_tac) || '',
      khach_hang: (idxKhach >= 0 ? cleanExcelCell(row[idxKhach]) : '') || (existing && existing.khach_hang) || '',
      ngay_mua_vao: (idxMua >= 0 ? cleanExcelCell(row[idxMua]) : '') || (existing && existing.ngay_mua_vao) || '',
      ngay_ban: tinhTrang === 'da_ban'
        ? ((idxBan >= 0 ? cleanExcelCell(row[idxBan]) : '') || (existing && existing.ngay_ban) || null)
        : null,
      hoa_don: (idxHoaDon >= 0 ? cleanExcelCell(row[idxHoaDon]) : '') || (existing && existing.hoa_don) || '',
      giay_chung_nhan: rawGcn || (existing && existing.giay_chung_nhan) || '',
      ngay_them: (idxNgayThem >= 0 ? cleanExcelCell(row[idxNgayThem]) : '') || (existing && existing.ngay_them) || '',
      ngay_cap_nhat_san_pham: (idxNgayCapNhatSp >= 0 ? cleanExcelCell(row[idxNgayCapNhatSp]) : '') || (existing && existing.ngay_cap_nhat_san_pham) || '',
      ghi_chu: (idxGhiChu >= 0 ? cleanExcelCell(row[idxGhiChu]) : '') || (existing && existing.ghi_chu) || '',
      hinh_anh: hinhAnhArr
    };

    parsedItems.push(item);
  }

  return parsedItems;
}

/**
 * Parse an entire Excel workbook buffer (reads both 'KHO TRANH' and 'ĐÃ BÁN' sheets)
 */
export function parseExcelBuffer(buffer, fallbackPaintings = []) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const fallbackMap = new Map((fallbackPaintings || []).map(p => [p.id, p]));
  const combined = new Map();

  const hasKhoAndSold =
    workbook.SheetNames.includes('KHO TRANH') || workbook.SheetNames.includes('ĐÃ BÁN');

  if (hasKhoAndSold) {
    if (workbook.SheetNames.includes('KHO TRANH')) {
      const items = parseSheetRows(workbook.Sheets['KHO TRANH'], 'chua_ban', fallbackMap);
      items.forEach(item => combined.set(item.id, item));
    }
    if (workbook.SheetNames.includes('ĐÃ BÁN')) {
      const items = parseSheetRows(workbook.Sheets['ĐÃ BÁN'], 'da_ban', fallbackMap);
      items.forEach(item => combined.set(item.id, item));
    }
  } else {
    // Parse first non-dashboard sheet
    const targetSheet = workbook.SheetNames.find(n => !n.toLowerCase().includes('dashboard')) || workbook.SheetNames[0];
    if (targetSheet) {
      const items = parseSheetRows(workbook.Sheets[targetSheet], 'chua_ban', fallbackMap);
      items.forEach(item => combined.set(item.id, item));
    }
  }

  return Array.from(combined.values());
}
