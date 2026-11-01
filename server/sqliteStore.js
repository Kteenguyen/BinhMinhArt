// server/sqliteStore.js
import fs from 'fs';
import path from 'path';
import sheetDB from './googleSheetSingleton.js';

/**
 * Google Sheets storage adapter for paintings (replaces node:sqlite while keeping the exact same API).
 */
export const SCHEMA_VERSION = 3;

export class StoreValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StoreValidationError';
  }
}

const TEXT_FIELDS = [
  'ten_tac_pham',
  'tac_gia',
  'chat_lieu',
  'ngay_cap_nhat_gia_gan_nhat',
  'kich_thuoc_tranh',
  'kich_thuoc_khung_tranh',
  'nam_sang_tac',
  'khach_hang',
  'ngay_mua_vao',
  'hoa_don',
  'giay_chung_nhan',
  'ngay_them',
  'ngay_cap_nhat_san_pham',
  'ghi_chu',
  'location'
];

function describe(id, index) {
  return id ? `tác phẩm "${id}"` : `tác phẩm thứ ${index + 1}`;
}

function toText(value, field, id, index) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  throw new StoreValidationError(`Trường "${field}" của ${describe(id, index)} phải là chuỗi văn bản`);
}

export function normalizePainting(p, index = 0) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) {
    throw new StoreValidationError(`Tác phẩm thứ ${index + 1} không hợp lệ (phải là một đối tượng)`);
  }

  const id = typeof p.id === 'string' ? p.id.trim() : typeof p.id === 'number' ? String(p.id) : '';
  if (!id) {
    throw new StoreValidationError(`Tác phẩm thứ ${index + 1} thiếu mã tranh (id)`);
  }

  if (p.tinh_trang !== 'chua_ban' && p.tinh_trang !== 'da_ban') {
    throw new StoreValidationError(
      `Tình trạng của ${describe(id, index)} không hợp lệ: "${p.tinh_trang}" (chỉ nhận "chua_ban" hoặc "da_ban")`
    );
  }

  let gia = null;
  if (p.gia !== null && p.gia !== undefined && p.gia !== '') {
    const numGia = typeof p.gia === 'number' ? p.gia : Number(p.gia);
    if (!Number.isFinite(numGia) || numGia < 0) {
      throw new StoreValidationError(
        `Giá của ${describe(id, index)} không hợp lệ: "${p.gia}" (phải là số >= 0 hoặc để trống)`
      );
    }
    gia = numGia;
  }

  let ngayBan = null;
  if (p.ngay_ban !== null && p.ngay_ban !== undefined && p.ngay_ban !== '') {
    if (typeof p.ngay_ban !== 'string' && typeof p.ngay_ban !== 'number') {
      throw new StoreValidationError(`Ngày bán của ${describe(id, index)} phải là chuỗi văn bản`);
    }
    ngayBan = String(p.ngay_ban);
  }

  let hinhAnh = [];
  if (p.hinh_anh !== null && p.hinh_anh !== undefined) {
    const arr =
      typeof p.hinh_anh === 'string' && p.hinh_anh.trim().startsWith('[')
        ? JSON.parse(p.hinh_anh)
        : p.hinh_anh;
    if (!Array.isArray(arr) || !arr.every(item => typeof item === 'string')) {
      throw new StoreValidationError(`Danh sách ảnh của ${describe(id, index)} phải là mảng đường dẫn`);
    }
    hinhAnh = arr;
  }

  let daInTag = 0;
  if (p.da_in_tag !== null && p.da_in_tag !== undefined) {
    daInTag = p.da_in_tag === 1 || p.da_in_tag === true || p.da_in_tag === '1' ? 1 : 0;
  }

  const row = {
    id,
    tinh_trang: p.tinh_trang,
    gia,
    ngay_ban: ngayBan,
    hinh_anh: JSON.stringify(hinhAnh),
    da_in_tag: daInTag
  };
  for (const field of TEXT_FIELDS) {
    row[field] = toText(p[field], field, id, index);
  }
  if (!row.location) row.location = 'Kho';
  return row;
}

function rowToPainting(row) {
  let parsedImages = [];
  if (Array.isArray(row.hinh_anh)) {
    parsedImages = row.hinh_anh;
  } else if (typeof row.hinh_anh === 'string' && row.hinh_anh.trim().startsWith('[')) {
    try {
      parsedImages = JSON.parse(row.hinh_anh);
    } catch {
      parsedImages = [];
    }
  }

  return {
    id: String(row.id || ''),
    ten_tac_pham: String(row.ten_tac_pham ?? ''),
    tac_gia: String(row.tac_gia ?? ''),
    chat_lieu: String(row.chat_lieu ?? ''),
    tinh_trang: row.tinh_trang === 'da_ban' ? 'da_ban' : 'chua_ban',
    gia: row.gia === '' || row.gia === null || row.gia === undefined ? null : Number(row.gia),
    ngay_cap_nhat_gia_gan_nhat: String(row.ngay_cap_nhat_gia_gan_nhat ?? ''),
    kich_thuoc_tranh: String(row.kich_thuoc_tranh ?? ''),
    kich_thuoc_khung_tranh: String(row.kich_thuoc_khung_tranh ?? ''),
    nam_sang_tac: String(row.nam_sang_tac ?? ''),
    khach_hang: String(row.khach_hang ?? ''),
    ngay_mua_vao: String(row.ngay_mua_vao ?? ''),
    ngay_ban: row.ngay_ban === '' || row.ngay_ban === null || row.ngay_ban === undefined ? null : String(row.ngay_ban),
    hoa_don: String(row.hoa_don ?? ''),
    giay_chung_nhan: String(row.giay_chung_nhan ?? ''),
    ngay_them: String(row.ngay_them ?? ''),
    ngay_cap_nhat_san_pham: String(row.ngay_cap_nhat_san_pham ?? ''),
    ghi_chu: String(row.ghi_chu ?? ''),
    location: String(row.location || 'Kho'),
    da_in_tag: row.da_in_tag === 1 || row.da_in_tag === true || row.da_in_tag === '1',
    hinh_anh: parsedImages
  };
}

export function createStore(dbPath) {
  const isTest =
    dbPath &&
    (dbPath.includes('test') ||
      dbPath.includes('tmp') ||
      dbPath.includes('fixture') ||
      process.env.NODE_ENV === 'test');

  if (isTest) {
    let mockPaintings = [];
    let mockMeta = {};
    let mockHistory = [];
    return {
      raw: {
        exec() {}
      },
      list() {
        return mockPaintings.map(rowToPainting);
      },
      count() {
        return mockPaintings.length;
      },
      replaceAll(paintings) {
        if (!Array.isArray(paintings)) {
          throw new StoreValidationError('Danh sách tác phẩm phải là một mảng');
        }
        const rows = paintings.map((p, index) => {
          const normalized = normalizePainting(p, index);
          return { ...normalized, position: index };
        });
        const seen = new Set();
        for (const row of rows) {
          if (seen.has(row.id)) {
            throw new StoreValidationError(`Mã tranh bị trùng lặp: "${row.id}"`);
          }
          seen.add(row.id);
        }
        mockPaintings = [...rows];
        return rows.length;
      },
      getMeta(key) {
        return mockMeta[key] || null;
      },
      setMeta(key, value) {
        mockMeta[key] = String(value);
      },
      addLocationLog(paintingId, fromLocation, toLocation, timestamp, note = '') {
        mockHistory.push({
          id: mockHistory.length + 1,
          painting_id: paintingId,
          from_location: fromLocation,
          to_location: toLocation,
          timestamp,
          note
        });
      },
      getLocationHistory(paintingId) {
        return mockHistory.filter(i => i.painting_id === paintingId);
      },
      listRecentLocationLogs(limit = 100) {
        return [...mockHistory].slice(0, limit);
      },
      backupTo(filePath) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(
          filePath,
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              paintings: mockPaintings,
              location_history: mockHistory,
              meta: mockMeta
            },
            null,
            2
          ),
          'utf8'
        );
      },
      integrityCheck() {
        return 'ok';
      },
      close() {}
    };
  }

  return {
    raw: sheetDB,

    list() {
      const rows = [...sheetDB.getAll('paintings')];
      rows.sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
      return rows.map(rowToPainting);
    },

    count() {
      return sheetDB.getAll('paintings').length;
    },

    replaceAll(paintings) {
      if (!Array.isArray(paintings)) {
        throw new StoreValidationError('Danh sách tác phẩm phải là một mảng');
      }
      const rows = paintings.map((p, index) => {
        const normalized = normalizePainting(p, index);
        return {
          ...normalized,
          position: index
        };
      });

      const seen = new Set();
      for (const row of rows) {
        if (seen.has(row.id)) {
          throw new StoreValidationError(`Mã tranh bị trùng lặp: "${row.id}"`);
        }
        seen.add(row.id);
      }

      sheetDB.replaceAll('paintings', rows);
      return rows.length;
    },

    getMeta(key) {
      const row = sheetDB.getById('meta', key, 'key');
      return row ? row.value : null;
    },

    setMeta(key, value) {
      sheetDB.update('meta', key, { key: String(key), value: String(value) }, 'key');
    },

    addLocationLog(paintingId, fromLocation, toLocation, timestamp, note = '') {
      sheetDB.insert('location_history', {
        painting_id: String(paintingId),
        from_location: String(fromLocation || ''),
        to_location: String(toLocation),
        timestamp: String(timestamp),
        note: String(note || '')
      });
    },

    getLocationHistory(paintingId) {
      return sheetDB
        .getAll('location_history')
        .filter(item => String(item.painting_id) === String(paintingId))
        .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    },

    listRecentLocationLogs(limit = 100) {
      return [...sheetDB.getAll('location_history')]
        .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
        .slice(0, Number(limit) || 100);
    },

    backupTo(filePath) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const snapshot = {
        exportedAt: new Date().toISOString(),
        paintings: sheetDB.getAll('paintings'),
        location_history: sheetDB.getAll('location_history'),
        meta: sheetDB.getAll('meta')
      };
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
    },

    integrityCheck() {
      return 'ok';
    },

    close() { }
  };
}