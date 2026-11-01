// server/db.js
import fs from 'fs';
import path from 'path';
import { saveExcelFileToDisk, parseExcelBuffer } from './excelService.js';
import { createStore } from './sqliteStore.js';
import sheetDB from './googleSheetSingleton.js';

const DATA_DIR = path.resolve('data');
const LEGACY_DIR = path.join(DATA_DIR, 'legacy');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
export const SQLITE_DB_FILE = path.join(DATA_DIR, 'binhminhart.db');
export const EXCEL_EXPORT_FILE = path.resolve('exports', 'BinhMinhArt_Inventory.xlsx');

const LEGACY_EXCEL_FILE = path.resolve('BinhMinhArt_Inventory.xlsx');
const LEGACY_JSON_FILE = path.join(DATA_DIR, 'paintings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const INITIAL_SEED = [
  {
    id: 'DVS-SD-01',
    ten_tac_pham: 'Thiếu nữ',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn dầu',
    ngay_them: '10-01-2026',
    gia: 1500,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '75x43cm',
    kich_thuoc_khung_tranh: '85x53cm',
    nam_sang_tac: '2012',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Thiếu nữ - Young girl, Sơn dầu - Oil on canvas, 75x43cm, 2012.jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SD-02',
    ten_tac_pham: 'Hương quê',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn dầu',
    ngay_them: '10-01-2026',
    gia: 2000,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '80x63cm',
    kich_thuoc_khung_tranh: '90x73cm',
    nam_sang_tac: '2018',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Hương quê - Taste of hometown, Sơn dầu - Oil on canvas, 80x63cm, 2018.jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SD-03',
    ten_tac_pham: 'Hoa mùa hạ',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn dầu',
    ngay_them: '10-01-2026',
    gia: 2000,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '80x60cm',
    kich_thuoc_khung_tranh: '92x72cm',
    nam_sang_tac: '2023',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Hoa mùa hạ, sơn dầu, 80x60cm, 2023.jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SD-04',
    ten_tac_pham: 'Thiếu nữ và hoa',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn dầu',
    ngay_them: '10-01-2026',
    gia: null,
    ngay_cap_nhat_gia_gan_nhat: '',
    kich_thuoc_tranh: '100x110cm',
    kich_thuoc_khung_tranh: '112x122cm',
    nam_sang_tac: '2012',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Thiếu nữ và hoa, 100x110cm, sơn dầu, 2012.JPG'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SD-05',
    ten_tac_pham: 'Trăng rơi thềm tóc',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn dầu',
    ngay_them: '10-01-2026',
    gia: null,
    ngay_cap_nhat_gia_gan_nhat: '',
    kich_thuoc_tranh: '100x130cm',
    kich_thuoc_khung_tranh: '112x142cm',
    nam_sang_tac: '2024',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Trăng rơi thềm tóc, sơn dầu, 100x130cm, 2024.jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SM-01',
    ten_tac_pham: 'Chân dung thiếu nữ',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    ngay_them: '10-01-2026',
    gia: 1200,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '30x40cm',
    kich_thuoc_khung_tranh: '40x50cm',
    nam_sang_tac: '2009',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Chân dung thiếu nữ, Sơn mài, 30x40cm, 2009.jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SM-02',
    ten_tac_pham: 'Thiếu nữ',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    ngay_them: '10-01-2026',
    gia: 1800,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '60x40cm',
    kich_thuoc_khung_tranh: '70x50cm',
    nam_sang_tac: '2025',
    tinh_trang: 'da_ban',
    khach_hang: 'Chị Hạnh (Đức)',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/daban/Dương Văn Sen, Thiếu nữ, Sơn mài, 60x40cm, 2025 - Chị Hạnh (Đức).jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SM-03',
    ten_tac_pham: 'Thiếu nữ',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    ngay_them: '10-01-2026',
    gia: 6000,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '80x90cm',
    kich_thuoc_khung_tranh: '92x102cm',
    nam_sang_tac: '2018',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Thiếu nữ - Young girl, Sơn mài - Lacquer, 80x90cm, 2018.jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SM-04',
    ten_tac_pham: 'Tuổi thanh xuân',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    ngay_them: '10-01-2026',
    gia: 5500,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '100x80cm',
    kich_thuoc_khung_tranh: '112x92cm',
    nam_sang_tac: '2024',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Tuổi thanh xuân, sơn mài, 100x80cm, 2024.jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SM-05',
    ten_tac_pham: 'Cung đàn xưa',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    ngay_them: '10-01-2026',
    gia: 6000,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '103x89cm',
    kich_thuoc_khung_tranh: '115x101cm',
    nam_sang_tac: '2025',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Cung đàn xưa, sơn mài, 103x89cm, 2025.jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SM-06',
    ten_tac_pham: 'Vó ngựa thành công',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    ngay_them: '10-01-2026',
    gia: 8000,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '100x120cm',
    kich_thuoc_khung_tranh: '114x134cm',
    nam_sang_tac: '2025',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Vó ngựa thành công, sơn mài, 100x120cm, 2025.jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SM-07',
    ten_tac_pham: 'Trong vườn',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    ngay_them: '10-01-2026',
    gia: 15000,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '100x180cm',
    kich_thuoc_khung_tranh: '115x195cm',
    nam_sang_tac: '2020',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Trong vườn - In the garden, Sơn mài - Lacquer, 100x180cm, 2020.jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SM-08',
    ten_tac_pham: 'Thiếu nữ',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    ngay_them: '10-01-2026',
    gia: 1200,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: 'H100',
    kich_thuoc_khung_tranh: '110x110cm',
    nam_sang_tac: '2020',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Thiếu nữ - Young girl, Sơn mài - Lacquer, H100.jpg'],
    ghi_chu: ''
  },
  {
    id: 'DVS-SM-09',
    ten_tac_pham: 'Nét vàng son',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    ngay_them: '10-01-2026',
    gia: 18000,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '120x240cm',
    kich_thuoc_khung_tranh: '136x256cm',
    nam_sang_tac: '2025',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    hinh_anh: ['/images/tranh/Dương Văn Sen, Nét vàng son, sơn mài, 120x240cm, 2025.jpg'],
    ghi_chu: ''
  }
];

let store = null;
let initialized = false;

function getStore() {
  if (!store) store = createStore(SQLITE_DB_FILE);
  return store;
}

function loadLegacyPaintings() {
  let cached = null;
  if (fs.existsSync(LEGACY_JSON_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(LEGACY_JSON_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) cached = data;
    } catch (err) {
      console.error('[DB Migration] Cannot read legacy paintings.json:', err.message);
    }
  }

  if (fs.existsSync(LEGACY_EXCEL_FILE)) {
    try {
      const parsed = parseExcelBuffer(fs.readFileSync(LEGACY_EXCEL_FILE), cached || []);
      if (Array.isArray(parsed) && parsed.length > 0) return { source: 'xlsx', paintings: parsed };
    } catch (err) {
      console.error('[DB Migration] Cannot read legacy Excel file:', err.message);
    }
  }

  if (cached) return { source: 'json', paintings: cached };
  return { source: 'seed', paintings: INITIAL_SEED };
}

function archiveLegacyFiles() {
  try {
    fs.mkdirSync(LEGACY_DIR, { recursive: true });
    if (fs.existsSync(LEGACY_EXCEL_FILE)) {
      fs.renameSync(LEGACY_EXCEL_FILE, path.join(LEGACY_DIR, 'BinhMinhArt_Inventory.pre-sqlite.xlsx'));
    }
    if (fs.existsSync(LEGACY_JSON_FILE)) {
      fs.copyFileSync(LEGACY_JSON_FILE, path.join(LEGACY_DIR, 'paintings.pre-sqlite.json'));
    }
  } catch (err) {
    console.error('[DB Migration] Could not archive legacy files:', err.message);
  }
}

function ensureReady() {
  if (initialized) return;
  const db = getStore();

  if (sheetDB.isConfigured()) {
    if (!sheetDB.isInitialized) {
      return;
    }
    initialized = true;
    return;
  }

  if (!db.getMeta('legacy_import')) {
    let info;
    if (db.count() === 0) {
      const { source, paintings } = loadLegacyPaintings();
      db.replaceAll(paintings);
      info = { source, count: paintings.length };
      console.log(`[DB Migration] Imported ${paintings.length} paintings from "${source}"`);
      if (source === 'xlsx' || source === 'json') archiveLegacyFiles();
    } else {
      info = { source: 'local-store', count: db.count() };
    }
    db.setMeta('legacy_import', JSON.stringify({ ...info, at: new Date().toISOString() }));
  }
  initialized = true;
}

export function getPaintings() {
  ensureReady();
  return getStore().list();
}

export function savePaintings(paintings) {
  ensureReady();
  getStore().replaceAll(paintings);
  scheduleExcelExport();
}

export function resetToSeed() {
  ensureReady();
  backupDatabase('pre-reset');
  savePaintings(INITIAL_SEED);
  return INITIAL_SEED;
}

export function addPaintingLocationLog(paintingId, fromLocation, toLocation, timestamp, note = '') {
  ensureReady();
  getStore().addLocationLog(paintingId, fromLocation, toLocation, timestamp, note);
}

export function getPaintingLocationHistory(paintingId) {
  ensureReady();
  return getStore().getLocationHistory(paintingId);
}

export function getRecentLocationLogs(limit = 100) {
  ensureReady();
  return getStore().listRecentLocationLogs(limit);
}

const EXPORT_DEBOUNCE_MS = Number(process.env.BMA_EXPORT_DEBOUNCE_MS) || 800;
const EXPORT_RETRY_MS = Number(process.env.BMA_EXPORT_RETRY_MS) || 30000;
let exportTimer = null;
let exportFailureCount = 0;
const exportStatus = { ok: null, lastAttemptAt: null, lastSuccessAt: null, lastError: null };

function scheduleExcelExport(delayMs = EXPORT_DEBOUNCE_MS) {
  if (exportTimer) clearTimeout(exportTimer);
  exportTimer = setTimeout(runExcelExport, delayMs);
  exportTimer.unref();
}

function runExcelExport() {
  exportTimer = null;
  exportStatus.lastAttemptAt = new Date().toISOString();
  try {
    saveExcelFileToDisk(getStore().list(), EXCEL_EXPORT_FILE);
    exportStatus.ok = true;
    exportStatus.lastSuccessAt = exportStatus.lastAttemptAt;
    exportStatus.lastError = null;
    exportFailureCount = 0;
  } catch (err) {
    exportStatus.ok = false;
    exportStatus.lastError = err.message;
    exportFailureCount += 1;
    scheduleExcelExport(EXPORT_RETRY_MS);
  }
}

const BACKUP_KEEP = 14;
const BACKUP_MIN_AGE_MS = 20 * 60 * 60 * 1000;
const BACKUP_CHECK_MS = 6 * 60 * 60 * 1000;

function listBackupFiles() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter(name => /^binhminhart-.*\.(db|json)$/.test(name))
    .sort();
}

export function backupDatabase(label = 'auto') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(BACKUP_DIR, `binhminhart-${stamp}-${label}.json`);
  getStore().backupTo(file);

  const files = listBackupFiles();
  for (const old of files.slice(0, Math.max(0, files.length - BACKUP_KEEP))) {
    fs.rmSync(path.join(BACKUP_DIR, old), { force: true });
  }
  return file;
}

function backupIfDue() {
  try {
    const files = listBackupFiles();
    const newest = files.length ? fs.statSync(path.join(BACKUP_DIR, files[files.length - 1])).mtimeMs : 0;
    if (Date.now() - newest >= BACKUP_MIN_AGE_MS) {
      const file = backupDatabase('auto');
      console.log(`[DB Backup] Created ${path.basename(file)}`);
    }
  } catch (err) {
    console.error('[DB Backup] Backup failed:', err.message);
  }
}

function fileInfo(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return { exists: true, sizeBytes: stat.size, lastModified: stat.mtime.toISOString() };
  } catch {
    return { exists: false, sizeBytes: 0, lastModified: null };
  }
}

export function getDatabaseStatus() {
  ensureReady();
  const backups = listBackupFiles();
  return {
    engine: 'google-sheets',
    exists: sheetDB.isConfigured(),
    sizeBytes: 0,
    lastModified: new Date().toISOString(),
    fileName: 'Google Sheets (Apps Script API)',
    filePath: sheetDB.url,
    paintingCount: getStore().count(),
    backupCount: backups.length,
    lastBackupFile: backups.length ? backups[backups.length - 1] : null,
    excelReport: {
      ...fileInfo(EXCEL_EXPORT_FILE),
      fileName: path.basename(EXCEL_EXPORT_FILE),
      filePath: EXCEL_EXPORT_FILE,
      ...exportStatus
    }
  };
}

export async function startDatabaseServices() {
  await sheetDB.init();
  ensureReady();
  scheduleExcelExport(200);
  backupIfDue();
  setInterval(backupIfDue, BACKUP_CHECK_MS).unref();
  console.log(`[DB] Google Sheets database ready (${getStore().count()} paintings)`);
}