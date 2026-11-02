// server/index.js
import express from 'express';
import http from 'http';
import https from 'https';
import net from 'net';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import multer from 'multer';
import XLSX from 'xlsx';
import QRCode from 'qrcode';
import sheetDB from './googleSheetSingleton.js';
import {
  getPaintings,
  savePaintings,
  resetToSeed,
  getDatabaseStatus,
  startDatabaseServices,
  addPaintingLocationLog,
  getPaintingLocationHistory,
  getRecentLocationLogs
} from './db.js';
import {
  buildExcelWorkbook,
  parseExcelBuffer,
  getArtworkQrTargetUrl,
  ensureQrPngFiles
} from './excelService.js';
import { generateAllThumbnails, ensureThumbnail, getThumbNameForPath } from './thumbnailService.js';
import { listLanIpv4, pickPrimaryLanIp } from './network.js';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerInterest,
  removeCustomerInterest,
  runCustomerExcelExport,
  CUSTOMER_EXCEL_FILE
} from './customerService.js';
import {
  parseWordDocxBuffer,
  parseImageFileMetadata,
  reconcileWordAndFolderItems,
  findDuplicatePainting,
  normNFC
} from './wordFolderParser.js';
import { ensureSslCertificate } from './sslCert.js';

const app = express();
const PORT = process.env.PORT || 5001;
const HTTPS_PORT = process.env.HTTPS_PORT || PORT;

// Ensure necessary directories exist
['uploads', 'uploads/word_media', 'uploads/folder_images', 'thumbnails', 'data', 'certs'].forEach(dir => {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) fs.mkdirSync(abs, { recursive: true });
});

/**
 * Prevents Windows from putting the computer or network to sleep when the screen is turned off.
 * Uses Windows Away Mode and SetThreadExecutionState (ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_AWAYMODE_REQUIRED).
 */
function preventWindowsSleep() {
  if (process.platform !== 'win32') return;

  // Configure power plan: Never sleep on AC power, enable Away Mode
  exec(
    'powercfg /change standby-timeout-ac 0 & ' +
    'powercfg /change hibernate-timeout-ac 0 & ' +
    'powercfg /change disk-timeout-ac 0 & ' +
    'powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP AWAYMODE 1 & ' +
    'powercfg /setactive SCHEME_CURRENT',
    { windowsHide: true },
    () => {}
  );
}

preventWindowsSleep();

process.on('uncaughtException', (err) => {
  console.error('[BinhMinhArt Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[BinhMinhArt Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

const NETWORK_CONFIG_FILE = path.resolve('data', 'network_config.json');

function getNetworkConfig() {
  let savedIp = '';
  try {
    if (fs.existsSync(NETWORK_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(NETWORK_CONFIG_FILE, 'utf-8'));
      savedIp = parsed.customIp || '';
    }
  } catch {
    // ignore
  }

  const detectedLanIps = listLanIpv4();
  const autoIp = pickPrimaryLanIp(detectedLanIps);
  const rawSaved = savedIp ? savedIp.replace(/^https?:\/\//, '').replace(/:\d+$/, '') : '';
  const customHttpsUrl = rawSaved ? `https://${rawSaved}:${PORT}` : '';
  const autoHttpsUrl = autoIp ? `https://${autoIp}:${PORT}` : '';
  const defaultHttpsUrl = `https://localhost:${PORT}`;

  return {
    defaultUrl: defaultHttpsUrl,
    defaultHttpsUrl,
    customIp: savedIp,
    customUrl: customHttpsUrl,
    customHttpsUrl,
    autoIp: autoIp || '',
    autoUrl: autoHttpsUrl,
    autoHttpsUrl,
    effectiveUrl: customHttpsUrl || autoHttpsUrl || defaultHttpsUrl,
    effectiveHttpsUrl: customHttpsUrl || autoHttpsUrl || defaultHttpsUrl,
    port: PORT,
    httpsPort: PORT,
    detectedLanIps
  };
}

// Middleware & Security
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static asset folders
app.use('/images/tranh', express.static(path.resolve('TRANH')));
app.use('/images/daban', express.static(path.resolve('ĐÃ BÁN')));
app.use('/uploads', express.static(path.resolve('uploads')));
app.use('/thumbnails', express.static(path.resolve('thumbnails')));

// Multer storage for single/multiple artwork images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.resolve('uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
    cb(null, `${Date.now()}_${cleanName}${ext}`);
  }
});
const uploadImage = multer({ storage: imageStorage });

// Multer memory storage for Excel & Bulk Word+Folder ingestion
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 300 }
});

// Helpers
function getTodayString() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy}`;
}

function getNowTimestampString() {
  return getTodayString();
}

function generateSku(author, medium, currentPaintings) {
  const aInit = (author || 'DVS')
    .trim()
    .split(/\s+/)
    .map(w => (w[0] ? w[0].toUpperCase() : ''))
    .join('')
    .replace(/Đ/g, 'D');

  let mInit = 'SM';
  const mLow = (medium || '').toLowerCase();
  if (mLow.includes('dầu')) mInit = 'SD';
  else if (mLow.includes('mài')) mInit = 'SM';
  else if (mLow.includes('lụa')) mInit = 'LU';
  else if (mLow.includes('nước')) mInit = 'MN';

  const prefix = `${aInit}-${mInit}`;
  const existingMatches = currentPaintings.filter(p => p.id && p.id.startsWith(prefix));
  const nextNum = existingMatches.length + 1;
  return `${prefix}-${String(nextNum).padStart(2, '0')}`;
}

function resolveLocalFilePath(publicUrl) {
  if (!publicUrl) return null;
  if (publicUrl.startsWith('/images/tranh/')) {
    return path.join('TRANH', decodeURIComponent(publicUrl.replace('/images/tranh/', '')));
  }
  if (publicUrl.startsWith('/images/daban/')) {
    return path.join('ĐÃ BÁN', decodeURIComponent(publicUrl.replace('/images/daban/', '')));
  }
  if (publicUrl.startsWith('/uploads/')) {
    return path.join('uploads', decodeURIComponent(publicUrl.replace('/uploads/', '')));
  }
  return null;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Get all paintings with thumbnail links + DB status
app.get('/api/paintings', async (req, res) => {
  try {
    const paintings = getPaintings();

    const enhanced = await Promise.all(
      paintings.map(async p => {
        let thumbUrl = null;
        if (Array.isArray(p.hinh_anh) && p.hinh_anh.length > 0) {
          const firstImg = p.hinh_anh[0];
          const localRelPath = resolveLocalFilePath(firstImg);

          if (localRelPath && fs.existsSync(localRelPath)) {
            const safeThumbName = getThumbNameForPath(firstImg);
            thumbUrl = await ensureThumbnail(localRelPath, safeThumbName);
          }
        }
        return {
          ...p,
          thumbnail_url: thumbUrl || (p.hinh_anh && p.hinh_anh[0]) || null,
          qr_target_url: getArtworkQrTargetUrl(p.id),
          qr_image_url: `/api/qr/${encodeURIComponent(p.id)}`
        };
      })
    );

    res.json({
      success: true,
      count: enhanced.length,
      dbStatus: getDatabaseStatus(),
      data: enhanced
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1b. Get single painting by ID
app.get('/api/paintings/:id', async (req, res) => {
  try {
    const rawId = decodeURIComponent(req.params.id || '').trim();
    const paintings = getPaintings();
    const found =
      paintings.find(p => p.id === rawId) ||
      paintings.find(p => String(p.id || '').toLowerCase() === rawId.toLowerCase());

    if (!found) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy tác phẩm có mã "${rawId}" trong Database.`
      });
    }

    let thumbUrl = null;
    if (Array.isArray(found.hinh_anh) && found.hinh_anh.length > 0) {
      const firstImg = found.hinh_anh[0];
      const localRelPath = resolveLocalFilePath(firstImg);
      if (localRelPath && fs.existsSync(localRelPath)) {
        const safeThumbName = getThumbNameForPath(firstImg);
        thumbUrl = await ensureThumbnail(localRelPath, safeThumbName);
      }
    }

    res.json({
      success: true,
      data: {
        ...found,
        thumbnail_url: thumbUrl || (found.hinh_anh && found.hinh_anh[0]) || null,
        qr_target_url: getArtworkQrTargetUrl(found.id),
        qr_image_url: `/api/qr/${encodeURIComponent(found.id)}`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1c. Generate QR Code SVG or PNG
app.get('/api/qr/:id', async (req, res) => {
  try {
    const rawId = decodeURIComponent(req.params.id || '').trim();
    const customOrigin = req.query.origin ? String(req.query.origin).trim() : '';
    const format = String(req.query.format || 'svg').toLowerCase();
    const targetUrl = getArtworkQrTargetUrl(rawId, customOrigin);

    if (format === 'png') {
      const pngBuffer = await QRCode.toBuffer(targetUrl, {
        type: 'png',
        width: 320,
        margin: 1,
        color: { dark: '#1C1917', light: '#FFFFFF' }
      });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(pngBuffer);
    }

    const svgStr = await QRCode.toString(targetUrl, {
      type: 'svg',
      width: 240,
      margin: 1,
      color: { dark: '#1C1917', light: '#FFFFFF' }
    });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(svgStr);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Get Dashboard Statistics
app.get('/api/stats', (req, res) => {
  try {
    const paintings = getPaintings();
    const totalCount = paintings.length;
    const inStock = paintings.filter(p => p.tinh_trang === 'chua_ban');
    const sold = paintings.filter(p => p.tinh_trang === 'da_ban');
    const pendingPrice = paintings.filter(p => p.gia === null || p.gia === undefined);

    const inStockValue = inStock
      .filter(p => typeof p.gia === 'number')
      .reduce((sum, p) => sum + p.gia, 0);

    const soldRevenue = sold
      .filter(p => typeof p.gia === 'number')
      .reduce((sum, p) => sum + p.gia, 0);

    res.json({
      success: true,
      dbStatus: getDatabaseStatus(),
      stats: {
        totalCount,
        inStockCount: inStock.length,
        inStockValue,
        soldCount: sold.length,
        soldRevenue,
        pendingPriceCount: pendingPrice.length,
        artistsCount: [...new Set(paintings.map(p => p.tac_gia))].length,
        lacquerCount: paintings.filter(p => (p.chat_lieu || '').toLowerCase().includes('mài')).length,
        oilCount: paintings.filter(p => (p.chat_lieu || '').toLowerCase().includes('dầu')).length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Add new painting
app.post('/api/paintings', (req, res) => {
  try {
    const paintings = getPaintings();
    const body = req.body;

    const today = getTodayString();
    const author = (body.tac_gia || 'Dương Văn Sen').trim();
    const medium = (body.chat_lieu || 'Sơn mài').trim();
    const candidateId = body.id && body.id.trim() ? body.id.trim() : '';

    const duplicateItem = findDuplicatePainting(
      {
        id: candidateId,
        ten_tac_pham: body.ten_tac_pham,
        tac_gia: author,
        chat_lieu: medium,
        kich_thuoc_tranh: body.kich_thuoc_tranh
      },
      paintings
    );

    if (duplicateItem && !body.conflict_resolution) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        existing: duplicateItem,
        message: `Phát hiện tác phẩm trùng lặp với mã "${duplicateItem.id}" (${duplicateItem.ten_tac_pham}). Vui lòng chọn Giữ bản gốc hoặc Thay thế.`
      });
    }

    if (duplicateItem && body.conflict_resolution === 'keep_original') {
      return res.status(200).json({
        success: true,
        keptOriginal: true,
        data: duplicateItem,
        message: `Đã giữ nguyên bản gốc "${duplicateItem.id}" (${duplicateItem.ten_tac_pham}).`
      });
    }

    let parsedPrice = null;
    if (body.gia !== undefined && body.gia !== null && body.gia !== '') {
      const num = Number(body.gia);
      if (!isNaN(num)) parsedPrice = num;
    }

    let kf = (body.kich_thuoc_khung_tranh || '').trim();
    if (kf.includes('(')) kf = kf.split('(')[0].trim();

    if (duplicateItem && body.conflict_resolution === 'overwrite') {
      const dupIdx = paintings.findIndex(p => p.id === duplicateItem.id);
      const incomingImages = Array.isArray(body.hinh_anh)
        ? body.hinh_anh
        : body.hinh_anh
          ? [body.hinh_anh]
          : [];

      const overwrittenPainting = {
        ...duplicateItem,
        id: duplicateItem.id,
        ten_tac_pham: (body.ten_tac_pham || duplicateItem.ten_tac_pham || '').trim(),
        tac_gia: author || duplicateItem.tac_gia,
        chat_lieu: medium || duplicateItem.chat_lieu,
        ngay_them: duplicateItem.ngay_them || today,
        gia: parsedPrice !== null ? parsedPrice : duplicateItem.gia,
        ngay_cap_nhat_gia_gan_nhat:
          parsedPrice !== duplicateItem.gia
            ? today
            : duplicateItem.ngay_cap_nhat_gia_gan_nhat || today,
        kich_thuoc_tranh: (body.kich_thuoc_tranh || duplicateItem.kich_thuoc_tranh || '').trim(),
        kich_thuoc_khung_tranh: kf || duplicateItem.kich_thuoc_khung_tranh || '',
        nam_sang_tac: (body.nam_sang_tac || duplicateItem.nam_sang_tac || '').trim(),
        tinh_trang: body.tinh_trang === 'da_ban' ? 'da_ban' : 'chua_ban',
        khach_hang: (body.khach_hang || '').trim(),
        ngay_mua_vao: (body.ngay_mua_vao || duplicateItem.ngay_mua_vao || '').trim(),
        ngay_ban:
          body.tinh_trang === 'da_ban'
            ? (body.ngay_ban || duplicateItem.ngay_ban || today).trim()
            : null,
        hoa_don: (body.hoa_don || duplicateItem.hoa_don || '').trim(),
        giay_chung_nhan: (body.giay_chung_nhan || duplicateItem.giay_chung_nhan || '').trim(),
        ngay_cap_nhat_san_pham: today,
        location: (body.location !== undefined ? body.location : duplicateItem.location || 'Kho').trim(),
        hinh_anh: incomingImages.length > 0 ? incomingImages : duplicateItem.hinh_anh,
        ghi_chu: (body.ghi_chu !== undefined ? body.ghi_chu : duplicateItem.ghi_chu || '').trim()
      };

      paintings[dupIdx] = overwrittenPainting;
      savePaintings(paintings);

      return res.status(200).json({
        success: true,
        overwritten: true,
        data: overwrittenPainting,
        message: `Đã ghi đè tác phẩm "${overwrittenPainting.id}" và cập nhật ngày cập nhật (${today}).`
      });
    }

    const newId = candidateId || generateSku(author, medium, paintings);

    const newPainting = {
      id: newId,
      ten_tac_pham: (body.ten_tac_pham || '').trim(),
      tac_gia: author,
      chat_lieu: medium,
      ngay_them: body.ngay_them || today,
      gia: parsedPrice,
      ngay_cap_nhat_gia_gan_nhat:
        body.ngay_cap_nhat_gia_gan_nhat || (parsedPrice !== null ? today : ''),
      kich_thuoc_tranh: (body.kich_thuoc_tranh || '').trim(),
      kich_thuoc_khung_tranh: kf,
      nam_sang_tac: (body.nam_sang_tac || '').trim(),
      tinh_trang: body.tinh_trang === 'da_ban' ? 'da_ban' : 'chua_ban',
      khach_hang: (body.khach_hang || '').trim(),
      ngay_mua_vao: (body.ngay_mua_vao || '').trim(),
      ngay_ban: body.tinh_trang === 'da_ban' ? (body.ngay_ban || '').trim() || null : null,
      hoa_don: (body.hoa_don || '').trim(),
      giay_chung_nhan: (body.giay_chung_nhan || '').trim(),
      ngay_cap_nhat_san_pham: today,
      location: (body.location || 'Kho').trim(),
      hinh_anh: Array.isArray(body.hinh_anh)
        ? body.hinh_anh
        : body.hinh_anh
          ? [body.hinh_anh]
          : [],
      ghi_chu: (body.ghi_chu || '').trim()
    };

    paintings.unshift(newPainting);
    savePaintings(paintings);

    try {
      addPaintingLocationLog(
        newPainting.id,
        '',
        newPainting.location || 'Kho',
        today,
        'Khởi tạo vị trí khi thêm mới tác phẩm'
      );
    } catch (e) {
      console.warn('[Location Log] Failed to log initial location:', e.message);
    }

    res.status(201).json({ success: true, data: newPainting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Update painting
app.put('/api/paintings/:id', (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const paintings = getPaintings();

    const idx = paintings.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Painting not found' });
    }

    const current = paintings[idx];
    const today = getTodayString();

    let updatedPrice = current.gia;
    let priceDate = current.ngay_cap_nhat_gia_gan_nhat || today;

    if ('gia' in body) {
      if (body.gia === '' || body.gia === null || body.gia === undefined) {
        updatedPrice = null;
      } else {
        const num = Number(body.gia);
        updatedPrice = isNaN(num) ? null : num;
      }

      if (updatedPrice !== current.gia) {
        priceDate = today;
      }
    }

    const newStatus =
      body.tinh_trang !== undefined
        ? body.tinh_trang === 'da_ban'
          ? 'da_ban'
          : 'chua_ban'
        : current.tinh_trang;
    let newNgayBan = current.ngay_ban;
    let newKhachHang = current.khach_hang;

    if (newStatus === 'da_ban') {
      newNgayBan =
        body.ngay_ban !== undefined ? body.ngay_ban : current.ngay_ban || today;
      newKhachHang =
        body.khach_hang !== undefined ? body.khach_hang : current.khach_hang;
    } else {
      newNgayBan = null;
    }

    let kf =
      body.kich_thuoc_khung_tranh !== undefined
        ? body.kich_thuoc_khung_tranh
        : current.kich_thuoc_khung_tranh;
    if (kf && typeof kf === 'string' && kf.includes('(')) {
      kf = kf.split('(')[0].trim();
    }

    const oldLocation = current.location || 'Kho';
    const newLocation = body.location !== undefined ? String(body.location).trim() : oldLocation;

    const updated = {
      ...current,
      ...body,
      id: current.id,
      kich_thuoc_khung_tranh: kf,
      location: newLocation,
      gia: updatedPrice,
      ngay_cap_nhat_gia_gan_nhat: body.ngay_cap_nhat_gia_gan_nhat || priceDate,
      tinh_trang: newStatus,
      khach_hang: newKhachHang,
      ngay_ban: newNgayBan,
      ngay_cap_nhat_san_pham: body.ngay_cap_nhat_san_pham || getNowTimestampString(),
      hinh_anh:
        body.hinh_anh !== undefined
          ? Array.isArray(body.hinh_anh)
            ? body.hinh_anh
            : [body.hinh_anh]
          : current.hinh_anh
    };

    paintings[idx] = updated;
    savePaintings(paintings);

    if (newLocation && newLocation !== oldLocation) {
      try {
        const note = body.location_note || `Chuyển vị trí từ "${oldLocation}" sang "${newLocation}"`;
        addPaintingLocationLog(current.id, oldLocation, newLocation, today, note);
      } catch (logErr) {
        console.warn('[Location Log] Failed to record history:', logErr.message);
      }
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4c. Batch update tag print status
app.post('/api/paintings/batch-tag-status', (req, res) => {
  try {
    const { ids, da_in_tag } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });
    }
    const targetStatus = Boolean(da_in_tag);
    const paintings = getPaintings();
    let updatedCount = 0;

    for (let i = 0; i < paintings.length; i++) {
      if (ids.includes(paintings[i].id)) {
        paintings[i].da_in_tag = targetStatus;
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      savePaintings(paintings);
    }

    res.json({ success: true, count: updatedCount, da_in_tag: targetStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/paintings/:id/location-history', (req, res) => {
  try {
    const { id } = req.params;
    const history = getPaintingLocationHistory(id);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/paintings/:id/location-history', (req, res) => {
  try {
    const { id } = req.params;
    const { to_location, note, from_location } = req.body;
    if (!to_location || !String(to_location).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp vị trí mới (to_location)' });
    }

    const paintings = getPaintings();
    const idx = paintings.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Painting not found' });
    }

    const current = paintings[idx];
    const prevLoc = from_location || current.location || 'Kho';
    const nextLoc = String(to_location).trim();
    const today = getTodayString();

    addPaintingLocationLog(id, prevLoc, nextLoc, today, note || `Cập nhật sang ${nextLoc}`);

    current.location = nextLoc;
    current.ngay_cap_nhat_san_pham = today;
    paintings[idx] = current;
    savePaintings(paintings);

    res.json({ success: true, data: current, history: getPaintingLocationHistory(id) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// Custom Locations (Đã kết nối trực tiếp vào bảng custom_locations trên Google Sheets)
// -------------------------------------------------------------
const LOCATIONS_CONFIG_FILE = path.resolve('data', 'custom_locations.json');

function loadCustomLocations() {
  const sheetLocs = sheetDB
    .getAll('custom_locations')
    .map(item => (typeof item === 'string' ? item.trim() : String(item.location_name || '').trim()))
    .filter(Boolean);
  if (sheetLocs.length > 0) return sheetLocs;

  try {
    if (fs.existsSync(LOCATIONS_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCATIONS_CONFIG_FILE, 'utf8'));
      if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
    }
  } catch (err) {
    console.warn('[Locations] Failed to read custom locations:', err.message);
  }
  return [];
}

function saveCustomLocations(locations) {
  const rows = locations
    .map(loc => ({ location_name: String(loc).trim() }))
    .filter(r => r.location_name);
  sheetDB.replaceAll('custom_locations', rows);

  try {
    fs.writeFileSync(LOCATIONS_CONFIG_FILE, JSON.stringify(locations, null, 2), 'utf8');
  } catch (err) {
    console.error('[Locations] Failed to write custom locations:', err.message);
  }
}

app.get('/api/locations', (req, res) => {
  try {
    const paintings = getPaintings();
    const defaultLocations = ['Kho', 'Phòng khách', 'Khu vực 1', 'Khu vực 2', 'Hành lang', 'Phòng trưng bày'];
    const customLocations = loadCustomLocations();
    const usedLocations = paintings.map(p => p.location).filter(Boolean);
    const unique = Array.from(new Set([...defaultLocations, ...customLocations, ...usedLocations]));
    res.json({ success: true, data: unique });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/locations', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Tên vị trí không được để trống' });
    }
    const cleanName = String(name).trim();
    const current = loadCustomLocations();
    if (!current.includes(cleanName)) {
      current.push(cleanName);
      saveCustomLocations(current);
    }
    const paintings = getPaintings();
    const defaultLocations = ['Kho', 'Phòng khách', 'Khu vực 1', 'Khu vực 2', 'Hành lang', 'Phòng trưng bày'];
    const usedLocations = paintings.map(p => p.location).filter(Boolean);
    const unique = Array.from(new Set([...defaultLocations, ...current, ...usedLocations]));
    res.json({ success: true, data: unique, added: cleanName });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/locations/:name', (req, res) => {
  try {
    const targetName = decodeURIComponent(req.params.name || '').trim();
    if (!targetName) {
      return res.status(400).json({ success: false, message: 'Tên vị trí không hợp lệ' });
    }
    const current = loadCustomLocations();
    const updated = current.filter(loc => loc.toLowerCase() !== targetName.toLowerCase());
    saveCustomLocations(updated);

    const paintings = getPaintings();
    const defaultLocations = ['Kho', 'Phòng khách', 'Khu vực 1', 'Khu vực 2', 'Hành lang', 'Phòng trưng bày'];
    const usedLocations = paintings.map(p => p.location).filter(Boolean);
    const unique = Array.from(new Set([...defaultLocations, ...updated, ...usedLocations]));
    res.json({ success: true, data: unique, deleted: targetName });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// CRM & Customer Endpoints
// -------------------------------------------------------------
app.get('/api/customers', (req, res) => {
  try {
    const data = listCustomers();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/customers/:id', (req, res) => {
  try {
    const customer = getCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const newCustomer = createCustomer(req.body);
    res.status(201).json({ success: true, data: newCustomer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const updated = updateCustomer(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    deleteCustomer(req.params.id);
    res.json({ success: true, message: 'Deleted customer successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/customers/:id/interests', (req, res) => {
  try {
    const { painting_id, deal_price, note } = req.body;
    if (!painting_id) {
      return res.status(400).json({ success: false, message: 'painting_id is required' });
    }
    const updated = addCustomerInterest(req.params.id, painting_id, deal_price, note);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.delete('/api/customers/interests/:interestId', (req, res) => {
  try {
    removeCustomerInterest(req.params.interestId);
    res.json({ success: true, message: 'Removed interest successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/export-customers-excel', (req, res) => {
  try {
    runCustomerExcelExport();
    if (fs.existsSync(CUSTOMER_EXCEL_FILE)) {
      res.download(CUSTOMER_EXCEL_FILE, 'BinhMinhArt_Customers.xlsx');
    } else {
      res.status(404).json({ success: false, message: 'File Excel khách hàng chưa được tạo' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Delete painting
app.delete('/api/paintings/:id', (req, res) => {
  try {
    const { id } = req.params;
    let paintings = getPaintings();
    const initialLen = paintings.length;
    paintings = paintings.filter(p => p.id !== id);

    if (paintings.length === initialLen) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    savePaintings(paintings);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Upload Artwork Image(s)
app.post('/api/upload', uploadImage.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    const results = await Promise.all(
      req.files.map(async file => {
        const originalUrl = `/uploads/${file.filename}`;
        const thumbName = `thumb_${path.parse(file.filename).name}.jpg`;
        const thumbUrl = await ensureThumbnail(file.path, thumbName);
        return {
          url: originalUrl,
          thumbnail_url: thumbUrl || originalUrl,
          filename: file.filename,
          size: file.size
        };
      })
    );

    res.json({ success: true, files: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Export Excel (.xlsx) file download
app.get('/api/export-excel', (req, res) => {
  try {
    const paintings = getPaintings();
    const wb = buildExcelWorkbook(paintings);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="BinhMinhArt_Inventory.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8a. Preview Excel (.xlsx) file before importing
app.post('/api/import-excel/preview', uploadMemory.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel (.xlsx)' });
    }

    const current = getPaintings();
    const imported = parseExcelBuffer(req.file.buffer, current);
    if (imported.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'File Excel không có dữ liệu hợp lệ' });
    }

    const previewItems = imported.map(item => {
      const existing = findDuplicatePainting(item, current);
      return {
        ...item,
        id: existing ? existing.id : item.id,
        is_duplicate: Boolean(existing),
        duplicate_resolution: existing ? 'overwrite' : 'new',
        existing_snapshot: existing
          ? {
            id: existing.id,
            ten_tac_pham: existing.ten_tac_pham,
            tac_gia: existing.tac_gia,
            chat_lieu: existing.chat_lieu,
            kich_thuoc_tranh: existing.kich_thuoc_tranh,
            kich_thuoc_khung_tranh: existing.kich_thuoc_khung_tranh || '',
            nam_sang_tac: existing.nam_sang_tac || '',
            gia: existing.gia,
            tinh_trang: existing.tinh_trang,
            ngay_them: existing.ngay_them || '',
            ngay_cap_nhat_san_pham: existing.ngay_cap_nhat_san_pham || '',
            hinh_anh: existing.hinh_anh || []
          }
          : null
      };
    });

    const duplicateCount = previewItems.filter(i => i.is_duplicate).length;
    const newCount = previewItems.length - duplicateCount;

    res.json({
      success: true,
      summary: {
        fileName: req.file.originalname,
        totalCount: previewItems.length,
        newCount,
        duplicateCount
      },
      items: previewItems
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8b. Commit / Import Excel (.xlsx) file
app.post('/api/import-excel', uploadMemory.single('file'), (req, res) => {
  try {
    const current = getPaintings();
    const today = getTodayString();
    let incomingItems = [];

    if (req.body && Array.isArray(req.body.items)) {
      incomingItems = req.body.items;
    } else if (req.file) {
      incomingItems = parseExcelBuffer(req.file.buffer, current).map(item => {
        const existing = findDuplicatePainting(item, current);
        return {
          ...item,
          id: existing ? existing.id : item.id,
          is_duplicate: Boolean(existing),
          duplicate_resolution: req.body?.conflictMode || 'overwrite',
          existing_snapshot: existing ? { id: existing.id } : null
        };
      });
    } else {
      return res.status(400).json({ success: false, message: 'Không có dữ liệu hoặc file tải lên' });
    }

    if (incomingItems.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Danh sách dữ liệu nhập trống' });
    }

    const currentMap = new Map(current.map(p => [p.id, p]));
    let addedCount = 0;
    let overwrittenCount = 0;
    let keptCount = 0;

    for (const rawItem of incomingItems) {
      const targetId =
        (rawItem.existing_snapshot && rawItem.existing_snapshot.id) || rawItem.id;
      const existing =
        (targetId && currentMap.get(targetId)) || findDuplicatePainting(rawItem, current);

      if (existing) {
        if (rawItem.duplicate_resolution === 'keep_original') {
          keptCount++;
          continue;
        }
        const cleaned = cleanIngestedItem(rawItem);
        const priceChanged = cleaned.gia !== existing.gia;
        currentMap.set(existing.id, {
          ...existing,
          ...cleaned,
          id: existing.id,
          ngay_them: existing.ngay_them || cleaned.ngay_them || today,
          ngay_cap_nhat_gia_gan_nhat: priceChanged
            ? today
            : existing.ngay_cap_nhat_gia_gan_nhat || cleaned.ngay_cap_nhat_gia_gan_nhat || today,
          kich_thuoc_khung_tranh:
            cleaned.kich_thuoc_khung_tranh || existing.kich_thuoc_khung_tranh || '',
          ngay_cap_nhat_san_pham: today,
          hinh_anh:
            cleaned.hinh_anh && cleaned.hinh_anh.length > 0
              ? cleaned.hinh_anh
              : existing.hinh_anh
        });
        overwrittenCount++;
      } else {
        const cleaned = cleanIngestedItem(rawItem);
        currentMap.set(cleaned.id, {
          ...cleaned,
          ngay_them: cleaned.ngay_them || today,
          ngay_cap_nhat_san_pham: today
        });
        addedCount++;
      }
    }

    const merged = Array.from(currentMap.values());
    savePaintings(merged);

    res.json({
      success: true,
      message: `Hoàn tất: Thêm mới ${addedCount}, Thay thế & cập nhật ngày (${today}) ${overwrittenCount}, Giữ bản gốc ${keptCount} tác phẩm.`,
      stats: { addedCount, overwrittenCount, keptCount, total: merged.length },
      total: merged.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. BULK INGESTION: Preview
app.post(
  '/api/bulk-ingest/preview',
  uploadMemory.fields([
    { name: 'wordFile', maxCount: 5 },
    { name: 'folderImages', maxCount: 250 }
  ]),
  async (req, res) => {
    try {
      const wordFiles = (req.files && req.files['wordFile']) || [];
      const imageFiles = (req.files && req.files['folderImages']) || [];

      if (wordFiles.length === 0 && imageFiles.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất 1 file Word (.docx) hoặc 1 Folder hình ảnh đính kèm.'
        });
      }

      let relativePaths = [];
      if (req.body.relativePaths) {
        try {
          relativePaths = JSON.parse(req.body.relativePaths);
        } catch {
          relativePaths = [];
        }
      }

      let combinedWordResult = null;
      for (const wf of wordFiles) {
        const utf8Name = normNFC(Buffer.from(wf.originalname, 'latin1').toString('utf8'));
        const parsed = await parseWordDocxBuffer(wf.buffer, utf8Name);
        if (!combinedWordResult) {
          combinedWordResult = parsed;
        } else {
          combinedWordResult.items.push(...parsed.items);
          combinedWordResult.totalEmbeddedImages += parsed.totalEmbeddedImages;
        }
      }

      const folderImageItems = [];
      const folderStatsMap = {};

      for (let i = 0; i < imageFiles.length; i++) {
        const imgFile = imageFiles[i];
        const utf8OrigName = normNFC(
          Buffer.from(imgFile.originalname, 'latin1').toString('utf8')
        );
        const relPath = normNFC(relativePaths[i] || utf8OrigName);

        const ext = path.extname(utf8OrigName).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.jfif'].includes(ext)) continue;

        const folderName = path.dirname(relPath) !== '.' ? path.dirname(relPath) : 'Ảnh đính kèm';
        folderStatsMap[folderName] = (folderStatsMap[folderName] || 0) + 1;

        const safeFileName = `${Date.now()}_${i}_${path.basename(utf8OrigName)}`;
        const absDest = path.resolve('uploads', 'folder_images', safeFileName);
        fs.writeFileSync(absDest, imgFile.buffer);

        const publicUrl = `/uploads/folder_images/${encodeURIComponent(safeFileName)}`;
        const safeThumb = getThumbNameForPath(publicUrl);
        await ensureThumbnail(absDest, safeThumb);

        const meta = parseImageFileMetadata(path.basename(utf8OrigName), relPath, publicUrl);
        folderImageItems.push(meta);
      }

      const currentPaintings = getPaintings();
      const mergedItems = reconcileWordAndFolderItems(
        combinedWordResult,
        folderImageItems,
        currentPaintings
      );

      res.json({
        success: true,
        summary: {
          wordFileName: combinedWordResult ? combinedWordResult.sourceFileName : null,
          detectedArtist: combinedWordResult ? (combinedWordResult.detectedArtist || '') : (folderImageItems.find(f => f.tac_gia)?.tac_gia || ''),
          detectedPeriod: combinedWordResult ? combinedWordResult.detectedPeriod : '01/2026',
          wordItemsCount: combinedWordResult ? combinedWordResult.items.length : 0,
          wordEmbeddedImagesCount: combinedWordResult ? combinedWordResult.totalEmbeddedImages : 0,
          folderImagesCount: folderImageItems.length,
          foldersBreakdown: folderStatsMap,
          totalMergedCount: mergedItems.length,
          newCount: mergedItems.filter(i => !i.is_duplicate).length,
          duplicateCount: mergedItems.filter(i => i.is_duplicate).length,
          matchedBothCount: mergedItems.filter(i => i.match_source === 'word_and_folder').length,
          soldDetectedCount: mergedItems.filter(i => i.tinh_trang === 'da_ban').length
        },
        items: mergedItems
      });
    } catch (err) {
      console.error('[Bulk Ingest Preview Error]:', err);
      res.status(500).json({ success: false, message: 'Lỗi phân tách dữ liệu: ' + err.message });
    }
  }
);

// 10. BULK INGESTION: Sample Test
app.post('/api/bulk-ingest/sample-preview', async (req, res) => {
  try {
    const files = fs.readdirSync(path.resolve('.'));
    const docxFile = files.find(f => f.toLowerCase().endsWith('.docx'));
    if (!docxFile) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy file .docx mẫu' });
    }

    const buf = fs.readFileSync(path.resolve(docxFile));
    const wordResult = await parseWordDocxBuffer(buf, normNFC(docxFile));

    const folderImageItems = [];
    const folderStatsMap = {};

    const sampleFolders = [
      { dir: 'TRANH', urlPrefix: '/images/tranh/' },
      { dir: 'ĐÃ BÁN', urlPrefix: '/images/daban/' }
    ];

    for (const { dir, urlPrefix } of sampleFolders) {
      const absDir = path.resolve(dir);
      if (!fs.existsSync(absDir)) continue;
      for (const f of fs.readdirSync(absDir)) {
        const ext = path.extname(f).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
        folderStatsMap[normNFC(dir)] = (folderStatsMap[normNFC(dir)] || 0) + 1;
        const meta = parseImageFileMetadata(f, `${dir}/${f}`, `${urlPrefix}${f}`);
        folderImageItems.push(meta);
      }
    }

    const mergedItems = reconcileWordAndFolderItems(wordResult, folderImageItems, getPaintings());

    res.json({
      success: true,
      summary: {
        wordFileName: wordResult.sourceFileName,
        detectedArtist: wordResult.detectedArtist,
        detectedPeriod: wordResult.detectedPeriod,
        wordItemsCount: wordResult.items.length,
        wordEmbeddedImagesCount: wordResult.totalEmbeddedImages,
        folderImagesCount: folderImageItems.length,
        foldersBreakdown: folderStatsMap,
        totalMergedCount: mergedItems.length,
        newCount: mergedItems.filter(i => !i.is_duplicate).length,
        duplicateCount: mergedItems.filter(i => i.is_duplicate).length,
        matchedBothCount: mergedItems.filter(i => i.match_source === 'word_and_folder').length,
        soldDetectedCount: mergedItems.filter(i => i.tinh_trang === 'da_ban').length
      },
      items: mergedItems
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 11. BULK INGESTION COMMIT
app.post('/api/bulk-ingest/commit', async (req, res) => {
  try {
    const { items, mode = 'merge' } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách dữ liệu nạp trống' });
    }

    const today = getTodayString();
    let finalPaintings = [];
    let addedCount = 0;
    let overwrittenCount = 0;
    let keptCount = 0;

    if (mode === 'replace') {
      finalPaintings = items.map(raw => {
        const cleaned = cleanIngestedItem(raw);
        return {
          ...cleaned,
          ngay_cap_nhat_san_pham: today
        };
      });
      overwrittenCount = finalPaintings.length;
    } else {
      const current = getPaintings();
      const map = new Map(current.map(p => [p.id, p]));
      for (const rawItem of items) {
        const targetId =
          (rawItem.existing_snapshot && rawItem.existing_snapshot.id) || rawItem.id;
        const existing =
          (targetId && map.get(targetId)) || findDuplicatePainting(rawItem, current);

        if (existing) {
          if (rawItem.duplicate_resolution === 'keep_original') {
            keptCount++;
            continue;
          }
          const item = cleanIngestedItem(rawItem);
          const priceChanged = item.gia !== existing.gia;
          map.set(existing.id, {
            ...existing,
            ...item,
            id: existing.id,
            ngay_them: existing.ngay_them || item.ngay_them || today,
            ngay_cap_nhat_gia_gan_nhat: priceChanged
              ? today
              : existing.ngay_cap_nhat_gia_gan_nhat || item.ngay_cap_nhat_gia_gan_nhat || today,
            kich_thuoc_khung_tranh:
              item.kich_thuoc_khung_tranh || existing.kich_thuoc_khung_tranh || '',
            ngay_cap_nhat_san_pham: today,
            hinh_anh: item.hinh_anh && item.hinh_anh.length > 0 ? item.hinh_anh : existing.hinh_anh
          });
          overwrittenCount++;
        } else {
          const item = cleanIngestedItem(rawItem);
          map.set(item.id, {
            ...item,
            ngay_them: item.ngay_them || today,
            ngay_cap_nhat_san_pham: today
          });
          addedCount++;
        }
      }
      finalPaintings = Array.from(map.values());
    }

    savePaintings(finalPaintings);

    res.json({
      success: true,
      message: `Hoàn tất: Thêm mới ${addedCount}, Thay thế & cập nhật ngày (${today}) ${overwrittenCount}, Giữ bản gốc ${keptCount} tác phẩm.`,
      stats: { addedCount, overwrittenCount, keptCount, total: finalPaintings.length },
      total: finalPaintings.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function cleanIngestedItem(raw) {
  const {
    match_source,
    matched_file_name,
    is_duplicate,
    duplicate_resolution,
    existing_snapshot,
    ...rest
  } = raw;
  return {
    id: rest.id || `BMA-${Date.now().toString().slice(-4)}`,
    ten_tac_pham: rest.ten_tac_pham || '',
    tac_gia: rest.tac_gia || '',
    chat_lieu: rest.chat_lieu || '',
    ngay_them: rest.ngay_them || getTodayString(),
    gia: rest.gia !== undefined && rest.gia !== '' && rest.gia !== null ? Number(rest.gia) : null,
    ngay_cap_nhat_gia_gan_nhat: rest.ngay_cap_nhat_gia_gan_nhat || '',
    kich_thuoc_tranh: rest.kich_thuoc_tranh || '',
    kich_thuoc_khung_tranh: rest.kich_thuoc_khung_tranh || '',
    nam_sang_tac: rest.nam_sang_tac || '',
    tinh_trang: rest.tinh_trang === 'da_ban' ? 'da_ban' : 'chua_ban',
    khach_hang: rest.khach_hang || '',
    vi_tri: rest.vi_tri || (rest.tinh_trang === 'da_ban' ? 'Đã bán' : 'Kho'),
    ngay_mua_vao: rest.ngay_mua_vao || '',
    ngay_ban: rest.tinh_trang === 'da_ban' ? rest.ngay_ban || null : null,
    hoa_don: rest.hoa_don || '',
    giay_chung_nhan: rest.giay_chung_nhan || '',
    ngay_cap_nhat_san_pham: rest.ngay_cap_nhat_san_pham || getNowTimestampString(),
    hinh_anh: Array.isArray(rest.hinh_anh) ? rest.hinh_anh : [],
    ghi_chu: rest.ghi_chu || ''
  };
}

// 12. Network / Local WiFi Configuration API
app.get('/api/network-info', (req, res) => {
  res.json({ success: true, config: getNetworkConfig(), dbStatus: getDatabaseStatus() });
});

app.post('/api/network-info', (req, res) => {
  try {
    const { customIp } = req.body;
    fs.writeFileSync(
      NETWORK_CONFIG_FILE,
      JSON.stringify({ customIp: (customIp || '').trim() }, null, 2),
      'utf-8'
    );
    res.json({
      success: true,
      message: 'Đã lưu cấu hình địa chỉ IP nội bộ',
      config: getNetworkConfig()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 13. Reset to Initial Seed (14 paintings)
app.post('/api/reset-seed', (req, res) => {
  try {
    const seeded = resetToSeed();
    res.json({
      success: true,
      message: 'Đã phục hồi 14 tác phẩm gốc ban đầu vào cơ sở dữ liệu (bản sao lưu trước khi khôi phục được lưu trong data/backups)',
      data: seeded
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Serve frontend build in production
const distPath = path.resolve('dist');
if (fs.existsSync(distPath)) {
  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    })
  );
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/images') ||
      req.path.startsWith('/thumbnails') ||
      req.path.startsWith('/uploads')
    ) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Single-Protocol HTTPS Server (with auto-redirect from HTTP to HTTPS)
async function startServer() {
  // 1. Ensure Database & Thumbnails are fully initialized BEFORE accepting requests
  console.log('[BinhMinhArt Server] Initializing Database & Thumbnails...');
  await startDatabaseServices();
  await generateAllThumbnails();
  console.log('[BinhMinhArt Server] Database & Thumbnails ready.');

  try {
    const sslResult = ensureSslCertificate();
    const sslOptions = {
      key: sslResult.key,
      cert: sslResult.cert
    };
    const httpsServer = https.createServer(sslOptions, app);

    // HTTP Redirect Handler: Automatically upgrades any plain HTTP requests to HTTPS
    const httpRedirectServer = http.createServer((req, res) => {
      let hostname = 'localhost';
      if (req.headers.host) {
        const match = req.headers.host.match(/^(\[[a-fA-F0-9:]+\]|[^:]+)/);
        if (match) hostname = match[1];
      }
      const targetHost = `${hostname}:${PORT}`;
      res.writeHead(301, {
        Location: `https://${targetHost}${req.url}`,
        'Content-Type': 'text/plain'
      });
      res.end(`Redirecting to https://${targetHost}${req.url}`);
    });

    // TCP Multiplexer on PORT:
    // Byte 0x16 is TLS Handshake -> Direct to HTTPS Application
    // Any other byte is Plain HTTP -> Auto-redirect (301) to HTTPS
    const server = net.createServer((socket) => {
      socket.setTimeout(10000, () => socket.destroy());
      socket.once('data', (buffer) => {
        socket.pause();
        socket.unshift(buffer);
        if (buffer[0] === 0x16) {
          httpsServer.emit('connection', socket);
        } else {
          httpRedirectServer.emit('connection', socket);
        }
        process.nextTick(() => socket.resume());
      });
      socket.on('error', (err) => {
        if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
          console.warn('[Socket Error]:', err.message);
        }
      });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[BinhMinhArt Server] Cổng ${PORT} đã có một tiến trình server khác đang chạy ngầm sẵn sàng. Đang thoát an toàn.`);
        process.exit(0);
      } else {
        console.error('[BinhMinhArt Server] Fatal server error:', err);
        process.exit(1);
      }
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[BinhMinhArt Server] HTTPS Server running exclusively on port ${PORT}:`);
      console.log(`  - URL: https://localhost:${PORT}`);
      console.log(`  - Tự động chuyển hướng (301 redirect) toàn bộ HTTP sang HTTPS`);
    });
    return;
  } catch (err) {
    console.warn('[BinhMinhArt Server] HTTPS initialization failed, fallback to plain HTTP:', err.message);
  }

  const httpServer = http.createServer(app);
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[BinhMinhArt Server] Cổng ${PORT} đã có một tiến trình server khác đang chạy ngầm sẵn sàng. Đang thoát an toàn.`);
      process.exit(0);
    } else {
      console.error('[BinhMinhArt Server] Fatal server error:', err);
      process.exit(1);
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[BinhMinhArt Server] Plain HTTP server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[BinhMinhArt Server] Fatal startup error:', err);
});