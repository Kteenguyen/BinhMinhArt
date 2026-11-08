// server/priceHistoryStore.js
import fs from 'node:fs';
import path from 'node:path';
import sheetDB from './googleSheetSingleton.js';

let customStoragePath = null;
let priceHistoryCache = null;
let lastLoadedMtime = 0;
const recentLogMap = new Map(); // painting_id -> { new_price, timestamp, log }

export function setPriceHistoryFilePath(customPath) {
  customStoragePath = customPath;
  priceHistoryCache = null;
  lastLoadedMtime = 0;
  recentLogMap.clear();
}

export function getPriceHistoryFilePath() {
  if (customStoragePath) return customStoragePath;
  const DATA_DIR = path.resolve('data');
  return path.join(DATA_DIR, 'price_history.json');
}

export function resetPriceHistoryCache() {
  priceHistoryCache = null;
  lastLoadedMtime = 0;
  recentLogMap.clear();
}

function getTodayString() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy}`;
}

export function standardizeDate(dateInput, fallback = getTodayString()) {
  if (!dateInput || String(dateInput).trim() === '') return fallback;
  const str = String(dateInput).trim();
  const datePart = str.split(/[T\s]+/)[0];

  if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> DD-MM-YYYY
        return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      } else if (parts[2].length === 2) {
        // DD-MM-YY -> DD-MM-YYYY
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-20${parts[2]}`;
      } else if (parts[0].length <= 2 && parts[2].length === 4) {
        // DD-MM-YYYY
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      }
    }
  } else if (datePart.includes('/')) {
    const parts = datePart.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD -> DD-MM-YYYY
        return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
      } else if (parts[2].length === 4) {
        // DD/MM/YYYY -> DD-MM-YYYY
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      }
    }
  }
  return datePart || fallback;
}

function atomicWriteJsonSync(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const tempFile = path.join(dir, `.price_history.${process.pid}.${Date.now()}.${randomSuffix}.tmp`);
  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(tempFile, content, 'utf-8');
  try {
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    try {
      fs.copyFileSync(tempFile, filePath);
      fs.unlinkSync(tempFile);
    } catch (fallbackErr) {
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (_) {}
      }
      throw err;
    }
  }
}

export function loadPriceHistory() {
  const filePath = getPriceHistoryFilePath();
  if (fs.existsSync(filePath)) {
    try {
      lastLoadedMtime = fs.statSync(filePath).mtimeMs;
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error(`[priceHistoryStore] Error reading ${filePath}:`, err.message);
    }
  }

  // Fallback to sheetDB meta
  if (sheetDB && typeof sheetDB.getById === 'function') {
    try {
      const metaRow = sheetDB.getById('meta', 'price_history', 'key');
      if (metaRow && metaRow.value) {
        const parsed = JSON.parse(metaRow.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          atomicWriteJsonSync(filePath, parsed);
          try {
            lastLoadedMtime = fs.statSync(filePath).mtimeMs;
          } catch (_) {}
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[priceHistoryStore] Error recovering from sheetDB meta:', err.message);
    }
  }

  return [];
}

export function initPriceHistory() {
  const filePath = getPriceHistoryFilePath();
  let currentMtime = 0;
  try {
    if (fs.existsSync(filePath)) {
      currentMtime = fs.statSync(filePath).mtimeMs;
    }
  } catch (_) {}

  if (priceHistoryCache === null || (currentMtime > 0 && currentMtime !== lastLoadedMtime)) {
    priceHistoryCache = loadPriceHistory();
    lastLoadedMtime = currentMtime;
    recentLogMap.clear();
  }
  return priceHistoryCache;
}

let metaSyncTimer = null;

export function flushMetaSync() {
  if (metaSyncTimer) {
    clearTimeout(metaSyncTimer);
    metaSyncTimer = null;
  }
  if (sheetDB && typeof sheetDB.update === 'function' && priceHistoryCache) {
    try {
      sheetDB.update('meta', 'price_history', {
        key: 'price_history',
        value: JSON.stringify(priceHistoryCache)
      }, 'key');
    } catch (err) {
      console.warn('[priceHistoryStore] sheetDB meta sync failed:', err.message);
    }
  }
}

function scheduleMetaSync(delayMs = 300) {
  if (metaSyncTimer) clearTimeout(metaSyncTimer);
  metaSyncTimer = setTimeout(() => {
    metaSyncTimer = null;
    flushMetaSync();
  }, delayMs);
  if (metaSyncTimer.unref) metaSyncTimer.unref();
}

export function savePriceHistory(logs, options = {}) {
  if (!Array.isArray(logs)) {
    throw new Error('Price history logs must be an array');
  }
  priceHistoryCache = logs;
  const filePath = getPriceHistoryFilePath();

  // 1. Atomic write to disk
  atomicWriteJsonSync(filePath, logs);
  try {
    lastLoadedMtime = fs.statSync(filePath).mtimeMs;
  } catch (_) {}

  // 2. Debounced or immediate sync to sheetDB meta
  if (options.immediateSync) {
    flushMetaSync();
  } else {
    scheduleMetaSync(300);
  }

  return priceHistoryCache;
}

export function addPaintingPriceLog(paintingId, oldPrice, newPrice, date, note = '') {
  initPriceHistory();
  const pid = String(paintingId || '').trim();
  if (!pid) {
    throw new Error('paintingId is required to add price log');
  }

  const now = Date.now();
  const normalizedNewPrice = newPrice !== null && newPrice !== undefined && newPrice !== '' ? Number(newPrice) : null;
  const normalizedOldPrice = oldPrice !== null && oldPrice !== undefined && oldPrice !== '' ? Number(oldPrice) : null;

  // Idempotency & Deduplication: Prevent duplicate logs if the last log for the same painting
  // has identical new_price and was created < 3 seconds ago (e.g. rapid multi-tap or network retry).
  const existingLogs = priceHistoryCache.filter(item => String(item.painting_id) === pid);
  const lastLog = existingLogs.length > 0 ? existingLogs[existingLogs.length - 1] : null;

  let lastTimestamp = 0;
  if (recentLogMap.has(pid)) {
    lastTimestamp = recentLogMap.get(pid).timestamp || 0;
  } else if (lastLog) {
    if (lastLog.created_at) {
      lastTimestamp = new Date(lastLog.created_at).getTime();
    } else if (lastLog.timestamp) {
      lastTimestamp = Number(lastLog.timestamp);
    }
  }

  if (
    lastLog &&
    lastLog.new_price === normalizedNewPrice &&
    lastTimestamp > 0 &&
    (now - lastTimestamp) < 3000
  ) {
    console.warn(`[priceHistoryStore] Deduplicating rapid log for ${pid}: identical new_price ${normalizedNewPrice} within ${now - lastTimestamp}ms`);
    return recentLogMap.get(pid)?.log || lastLog;
  }

  const maxId = priceHistoryCache.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  const logDate = standardizeDate(date);

  const newLog = {
    id: maxId + 1,
    painting_id: pid,
    old_price: normalizedOldPrice,
    new_price: normalizedNewPrice,
    date: logDate,
    note: String(note || 'Điều chỉnh giá tác phẩm').trim(),
    created_at: new Date(now).toISOString()
  };

  priceHistoryCache.push(newLog);
  recentLogMap.set(pid, { new_price: normalizedNewPrice, timestamp: now, log: newLog });
  savePriceHistory(priceHistoryCache);
  return newLog;
}

export function getPaintingPriceHistory(paintingId) {
  initPriceHistory();
  const pid = String(paintingId || '').trim();
  return priceHistoryCache
    .filter(log => String(log.painting_id) === pid)
    .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
}

export function initBaselinePriceLogs(paintings) {
  initPriceHistory();
  if (!Array.isArray(paintings) || paintings.length === 0) {
    return priceHistoryCache;
  }

  let modified = false;
  let nextId = priceHistoryCache.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;

  for (const p of paintings) {
    if (!p || !p.id) continue;
    const pid = String(p.id).trim();

    // Check if painting has a price
    const hasPrice = p.gia !== null && p.gia !== undefined && p.gia !== '' && !isNaN(Number(p.gia));
    if (!hasPrice) continue;

    // Deduplication check: does ANY price history log already exist for this painting?
    const hasLog = priceHistoryCache.some(log => String(log.painting_id) === pid);
    if (hasLog) continue; // Skip, deduplicated

    // Painting has price but no history logs -> create baseline log
    const baselinePrice = (pid === 'DVS-SD-01') ? 1500 : Number(p.gia);
    const baselineDate = (pid === 'DVS-SD-01')
      ? '09-01-2026'
      : standardizeDate(p.ngay_cap_nhat_gia_gan_nhat || p.ngay_them || getTodayString());

    priceHistoryCache.push({
      id: nextId++,
      painting_id: pid,
      old_price: null,
      new_price: baselinePrice,
      date: baselineDate,
      note: 'Khởi tạo mốc giá ban đầu'
    });
    modified = true;
  }

  if (modified) {
    savePriceHistory(priceHistoryCache);
  }

  return priceHistoryCache;
}
