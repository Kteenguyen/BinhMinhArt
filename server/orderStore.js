// server/orderStore.js
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.resolve('data');
export const DEFAULT_DB_PATH = path.join(DATA_DIR, 'binhminhart.db');

export class ArtworkAlreadySoldError extends Error {
  constructor(paintingId, title = '') {
    super(`Tác phẩm ${paintingId}${title ? ` ("${title}")` : ''} đã được bán trước đó, không thể thanh toán!`);
    this.name = 'ArtworkAlreadySoldError';
    this.code = 'ERR_ARTWORK_ALREADY_SOLD';
    this.statusCode = 409;
    this.paintingId = paintingId;
  }
}

export class DuplicateInvoiceCodeError extends Error {
  constructor(invoiceCode) {
    super(`Mã hóa đơn "${invoiceCode}" đã tồn tại trong hệ thống!`);
    this.name = 'DuplicateInvoiceCodeError';
    this.code = 'ERR_DUPLICATE_INVOICE_CODE';
    this.statusCode = 409;
    this.invoiceCode = invoiceCode;
  }
}

export function createOrderStore(dbPath = DEFAULT_DB_PATH) {
  const isMemory = dbPath === ':memory:';
  if (!isMemory) {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);

  // Configure high-concurrency PRAGMAs
  if (!isMemory) {
    try {
      db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 5000;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
      `);
    } catch {
      // Non-fatal if PRAGMA execution is restricted
    }
  }

  // Idempotent Table & Index Migration
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_code        TEXT NOT NULL UNIQUE CHECK (length(trim(invoice_code)) > 0),
      customer_id         INTEGER NOT NULL,
      customer_name       TEXT NOT NULL CHECK (length(trim(customer_name)) > 0),
      customer_phone      TEXT NOT NULL DEFAULT '',
      customer_email      TEXT NOT NULL DEFAULT '',
      painting_ids        TEXT NOT NULL CHECK (json_valid(painting_ids) AND json_type(painting_ids) = 'array'),
      items_detail        TEXT NOT NULL CHECK (json_valid(items_detail) AND json_type(items_detail) = 'array'),
      total_listed_price  REAL NOT NULL DEFAULT 0 CHECK (total_listed_price >= 0),
      total_deal_price    REAL NOT NULL DEFAULT 0 CHECK (total_deal_price >= 0),
      discount_amount     REAL NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
      payment_method      TEXT NOT NULL DEFAULT 'vietqr' CHECK (payment_method IN ('vietqr', 'tien_mat', 'chuyen_khoan', 'the', 'khac')),
      payment_status      TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'cancelled')),
      notes               TEXT NOT NULL DEFAULT '',
      created_at          TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_invoice_code ON invoices(invoice_code);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
    CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
  `);

  function rowToInvoice(row) {
    if (!row) return null;
    let paintingIds = [];
    try {
      paintingIds = typeof row.painting_ids === 'string' ? JSON.parse(row.painting_ids) : (row.painting_ids || []);
    } catch {
      paintingIds = [];
    }

    let itemsDetail = [];
    try {
      itemsDetail = typeof row.items_detail === 'string' ? JSON.parse(row.items_detail) : (row.items_detail || []);
    } catch {
      itemsDetail = [];
    }

    return {
      id: Number(row.id),
      invoice_code: String(row.invoice_code),
      customer_id: Number(row.customer_id),
      customer_name: String(row.customer_name),
      customer_phone: String(row.customer_phone || ''),
      customer_email: String(row.customer_email || ''),
      painting_ids: Array.isArray(paintingIds) ? paintingIds : [],
      items_detail: Array.isArray(itemsDetail) ? itemsDetail : [],
      total_listed_price: Number(row.total_listed_price || 0),
      total_deal_price: Number(row.total_deal_price || 0),
      discount_amount: Number(row.discount_amount || 0),
      payment_method: String(row.payment_method || 'vietqr'),
      payment_status: String(row.payment_status || 'pending'),
      notes: String(row.notes || ''),
      created_at: String(row.created_at || '')
    };
  }

  return {
    raw: db,

    createInvoice(data) {
      const code = String(data.invoice_code || '').trim();
      if (!code) throw new Error('Mã hóa đơn không được để trống');
      if (!data.customer_id) throw new Error('Mã khách hàng (customer_id) không được để trống');
      if (!data.customer_name) throw new Error('Tên khách hàng không được để trống');

      const paintingIds = Array.isArray(data.painting_ids)
        ? data.painting_ids
        : Array.isArray(data.items) ? data.items.map(it => it.painting_id) : [];
      if (paintingIds.length === 0) throw new Error('Danh sách tác phẩm không được để trống');

      const itemsDetail = Array.isArray(data.items_detail)
        ? data.items_detail
        : Array.isArray(data.items) ? data.items : [];

      const listedTotal = Number(data.total_listed_price) || 0;
      const dealTotal = Number(data.total_deal_price) || 0;
      const discount = Number(data.discount_amount) || Math.max(0, listedTotal - dealTotal);
      const createdAt = data.created_at || new Date().toISOString().replace('T', ' ').slice(0, 19);

      try {
        const stmt = db.prepare(`
          INSERT INTO invoices (
            invoice_code, customer_id, customer_name, customer_phone, customer_email,
            painting_ids, items_detail, total_listed_price, total_deal_price, discount_amount,
            payment_method, payment_status, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const res = stmt.run(
          code,
          Number(data.customer_id),
          String(data.customer_name).trim(),
          String(data.customer_phone || '').trim(),
          String(data.customer_email || '').trim(),
          JSON.stringify(paintingIds),
          JSON.stringify(itemsDetail),
          listedTotal,
          dealTotal,
          discount,
          String(data.payment_method || 'vietqr').toLowerCase(),
          String(data.payment_status || 'pending').toLowerCase(),
          String(data.notes || '').trim(),
          createdAt
        );

        return this.getInvoiceById(res.lastInsertRowid);
      } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed: invoices.invoice_code')) {
          throw new DuplicateInvoiceCodeError(code);
        }
        throw err;
      }
    },

    getInvoices(filters = {}) {
      let query = 'SELECT * FROM invoices WHERE 1=1';
      const params = [];

      if (filters.customer_id) {
        query += ' AND customer_id = ?';
        params.push(Number(filters.customer_id));
      }
      if (filters.payment_status) {
        query += ' AND payment_status = ?';
        params.push(String(filters.payment_status));
      }
      if (filters.payment_method) {
        query += ' AND payment_method = ?';
        params.push(String(filters.payment_method));
      }

      query += ' ORDER BY created_at DESC, id DESC';
      const limit = Math.min(Math.max(1, Number(filters.limit) || 100), 500);
      query += ` LIMIT ${limit}`;

      const rows = db.prepare(query).all(...params);
      return rows.map(rowToInvoice);
    },

    getInvoiceById(id) {
      const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(Number(id));
      return rowToInvoice(row);
    },

    getInvoiceByCode(code) {
      const row = db.prepare('SELECT * FROM invoices WHERE invoice_code = ?').get(String(code).trim());
      return rowToInvoice(row);
    },

    getInvoicesByCustomerId(customerId) {
      const rows = db.prepare('SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC, id DESC')
        .all(Number(customerId));
      return rows.map(rowToInvoice);
    },

    updateInvoicePaymentStatus(id, newStatus) {
      const valid = ['pending', 'completed', 'cancelled'];
      if (!valid.includes(newStatus)) {
        throw new Error(`Trạng thái không hợp lệ: "${newStatus}" (chỉ chấp nhận: ${valid.join(', ')})`);
      }
      db.prepare('UPDATE invoices SET payment_status = ? WHERE id = ?').run(newStatus, Number(id));
      return this.getInvoiceById(id);
    },

    deleteInvoice(id) {
      if (!id || isNaN(Number(id))) return false;
      const res = db.prepare('DELETE FROM invoices WHERE id = ?').run(Number(id));
      return res.changes > 0;
    },


    executeCheckoutTransaction(checkoutData) {
      const {
        customer_id,
        customer_name,
        customer_phone = '',
        customer_email = '',
        invoice_code,
        items,
        notes = '',
        payment_method = 'vietqr'
      } = checkoutData;

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Giỏ hàng trống, không thể thanh toán');
      }

      const todayVN = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      }).replace(/\//g, '-');

      // Check if paintings table exists in this database
      const hasPaintingsTable = Boolean(
        db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='paintings'").get()?.count
      );

      db.exec('BEGIN IMMEDIATE;');
      try {
        if (hasPaintingsTable) {
          // Step 1: Concurrency Guard - Validate all artworks are 'chua_ban'
          const checkStmt = db.prepare('SELECT id, tinh_trang, ten_tac_pham, gia FROM paintings WHERE id = ?');
          for (const item of items) {
            const painting = checkStmt.get(item.painting_id);
            if (!painting) {
              throw new Error(`Tác phẩm "${item.painting_id}" không tồn tại trong hệ thống`);
            }
            if (painting.tinh_trang === 'da_ban') {
              throw new ArtworkAlreadySoldError(painting.id, painting.ten_tac_pham);
            }
          }

          // Step 2: Atomic State Transition - Update each painting to 'da_ban'
          const updatePaintingStmt = db.prepare(`
            UPDATE paintings
            SET tinh_trang = 'da_ban',
                gia = ?,
                ngay_ban = ?,
                khach_hang = ?,
                hoa_don = ?,
                ngay_cap_nhat_san_pham = ?
            WHERE id = ? AND tinh_trang = 'chua_ban'
          `);

          for (const item of items) {
            const updRes = updatePaintingStmt.run(
              Number(item.deal_price),
              todayVN,
              String(customer_name).trim(),
              String(invoice_code).trim(),
              todayVN,
              String(item.painting_id).trim()
            );

            if (updRes.changes !== 1) {
              throw new ArtworkAlreadySoldError(item.painting_id);
            }
          }
        }

        // Step 3: Insert Invoice Record
        const totalListed = items.reduce((sum, it) => sum + (Number(it.listed_price) || 0), 0);
        const totalDeal = items.reduce((sum, it) => sum + (Number(it.deal_price) || 0), 0);
        const discountAmount = Math.max(0, totalListed - totalDeal);

        const insertInvStmt = db.prepare(`
          INSERT INTO invoices (
            invoice_code, customer_id, customer_name, customer_phone, customer_email,
            painting_ids, items_detail, total_listed_price, total_deal_price, discount_amount,
            payment_method, payment_status, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
        `);

        const invRes = insertInvStmt.run(
          String(invoice_code).trim(),
          Number(customer_id),
          String(customer_name).trim(),
          String(customer_phone).trim(),
          String(customer_email).trim(),
          JSON.stringify(items.map(it => it.painting_id)),
          JSON.stringify(items),
          totalListed,
          totalDeal,
          discountAmount,
          String(payment_method || 'vietqr').toLowerCase(),
          'pending',
          String(notes || '').trim()
        );

        db.exec('COMMIT;');
        return this.getInvoiceById(invRes.lastInsertRowid);
      } catch (err) {
        try {
          db.exec('ROLLBACK;');
        } catch {
          // ignore rollback failure if transaction already rolled back
        }
        if (err.message && err.message.includes('UNIQUE constraint failed: invoices.invoice_code')) {
          throw new DuplicateInvoiceCodeError(invoice_code);
        }
        throw err;
      }
    },

    close() {
      try {
        db.close();
      } catch {
        // ignore
      }
    }
  };
}

let defaultOrderStoreInstance = null;

export function getOrderStore() {
  if (!defaultOrderStoreInstance) {
    defaultOrderStoreInstance = createOrderStore(DEFAULT_DB_PATH);
  }
  return defaultOrderStoreInstance;
}

export function deleteInvoice(id) {
  return getOrderStore().deleteInvoice(id);
}

export default getOrderStore;
