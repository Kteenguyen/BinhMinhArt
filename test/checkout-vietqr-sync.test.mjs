// test/checkout-vietqr-sync.test.mjs
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { AsyncMutex, checkoutMutex } from '../server/checkoutMutex.js';
import {
  createOrderStore,
  ArtworkAlreadySoldError,
  DuplicateInvoiceCodeError
} from '../server/orderStore.js';
import {
  formatTlv,
  computeCrc16,
  sanitizeNapasMemo,
  convertUsdToVnd,
  generateVietQrEmvcoPayload,
  generateVietQrQuickLinkUrl,
  generateLocalQrDataUrl,
  generateVietQrPayment,
  DEFAULT_BANK_CONFIG
} from '../server/vietqrService.js';
import sheetDB, {
  formatInvoiceForSheet,
  INVOICE_SHEET_HEADERS
} from '../server/googleSheetSingleton.js';

// Bypass self-signed SSL certificate check for local HTTPS test
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASE_URL = process.env.TEST_URL || 'https://localhost:5001';

describe('Milestone 1 Core: VietQR Payment Service Unit Tests', () => {
  test('TC-V1: CRC16-CCITT correctly computes standard test vector "123456789" -> "29B1"', () => {
    const crc = computeCrc16('123456789');
    assert.equal(crc, '29B1', 'CRC16-CCITT test vector "123456789" must produce 29B1');
  });

  test('TC-V2: formatTlv produces valid 2-digit length Tag-Length-Value chunks', () => {
    assert.equal(formatTlv('00', '01'), '000201');
    assert.equal(formatTlv('53', '704'), '5303704');
    assert.equal(formatTlv('58', 'VN'), '5802VN');
    assert.equal(formatTlv('08', ''), '');
    assert.equal(formatTlv('08', null), '');
  });

  test('TC-V3: sanitizeNapasMemo strips accents, special chars, uppercases, and respects length limits', () => {
    const raw = 'HD-20261111-001 Đỗ Hùng!';
    const sanitized = sanitizeNapasMemo(raw, 50);
    assert.ok(!/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(sanitized));
    assert.ok(!/[!@#$%^&*()]/i.test(sanitized));
    assert.equal(sanitized.toUpperCase(), sanitized);
    assert.ok(sanitized.length <= 50);
    assert.equal(sanitized, 'HD-20261111-001 DO HUNG');

    // Truncation check
    const longMemo = 'A'.repeat(80);
    assert.equal(sanitizeNapasMemo(longMemo, 50).length, 50);
  });

  test('TC-V4: convertUsdToVnd accurately converts and rounds to integer VND', () => {
    assert.equal(convertUsdToVnd(1800, 25400), 45720000);
    assert.equal(convertUsdToVnd(2109.5, 25400), 53581300);
    assert.equal(convertUsdToVnd(0, 25400), 0);
    assert.equal(convertUsdToVnd(-500, 25400), 0);
  });

  test('TC-V5: generateVietQrEmvcoPayload produces valid EMVCo string matching NAPAS 247 specification', () => {
    const payload = generateVietQrEmvcoPayload({
      bankId: '970422',
      accountNo: '0901234567',
      amountVnd: 45720000,
      memo: 'THANH TOAN HD 20261111 001',
      accountName: 'GALLERY BINH MINH'
    });

    assert.ok(payload.startsWith('000201'), 'Must start with Payload Format Indicator');
    assert.ok(payload.includes('0010A000000727'), 'Must include VietQR AID A000000727');
    assert.ok(payload.includes('5303704'), 'Must set currency to 704 (VND)');
    assert.ok(payload.includes('540845720000'), 'Must include Tag 54 amount');
    assert.ok(payload.includes('5802VN'), 'Must set country to VN');
    assert.ok(payload.includes('6304'), 'Must contain Tag 63 with length 04');

    // Verify CRC checksum in payload
    const dataBeforeCrc = payload.slice(0, -4);
    const checksumInPayload = payload.slice(-4);
    const expectedChecksum = computeCrc16(dataBeforeCrc);
    assert.equal(checksumInPayload, expectedChecksum, 'CRC16 checksum in payload must match computed CRC');
  });

  test('TC-V6: generateVietQrQuickLinkUrl generates valid URL with parameters', () => {
    const url = generateVietQrQuickLinkUrl({
      bankId: '970422',
      accountNo: '0901234567',
      amountVnd: 45720000,
      memo: 'THANH TOAN HD 20261111 001',
      accountName: 'GALLERY BINH MINH',
      template: 'compact2'
    });

    assert.ok(url.startsWith('https://img.vietqr.io/image/970422-0901234567-compact2.png'));
    assert.ok(url.includes('amount=45720000'));
    assert.ok(url.includes('addInfo='));
    assert.ok(url.includes('accountName='));
  });

  test('TC-V7: generateVietQrPayment completes end-to-end payment bundle with Base64 QR code', async () => {
    const payment = await generateVietQrPayment({
      invoiceCode: 'HD-20261111-001',
      dealTotalUsd: 1800,
      exchangeRate: 25400
    });

    assert.equal(payment.bank_id, '970422');
    assert.equal(payment.account_no, '0901234567');
    assert.equal(payment.amount_usd, 1800);
    assert.equal(payment.amount_vnd, 45720000);
    assert.equal(payment.memo, 'THANH TOAN HD 20261111 001');
    assert.ok(payment.qr_image_url.startsWith('https://img.vietqr.io/image/'));
    assert.ok(payment.qr_data_url.startsWith('data:image/png;base64,'));
    assert.ok(payment.emvco_payload.length > 50);
  });
});

describe('Milestone 1 Core: SheetDB Dual-Sync Formatting Unit Tests', () => {
  test('TC-S1: INVOICE_SHEET_HEADERS has exactly 12 explicit Vietnamese column headers', () => {
    assert.equal(INVOICE_SHEET_HEADERS.length, 12);
    const expected = [
      'Mã Hóa Đơn',
      'Mã Khách Hàng',
      'Tên Khách Hàng',
      'Số Điện Thoại',
      'Danh Sách Mã Tranh',
      'Tổng Giá Niêm Yết ($ USD)',
      'Tổng Giá Deal ($ USD)',
      'Chiết Khấu ($ USD)',
      'Phương Thức Thanh Toán',
      'Trạng Thái Thanh Toán',
      'Ghi Chú',
      'Ngày Tạo'
    ];
    assert.deepEqual(INVOICE_SHEET_HEADERS, expected);
  });

  test('TC-S2: formatInvoiceForSheet maps invoice to the 12 Vietnamese column keys with proper types', () => {
    const invoice = {
      id: 1,
      invoice_code: 'HD-20261111-001',
      customer_id: 1,
      customer_name: 'Nguyễn Văn An',
      customer_phone: '0901234567',
      painting_ids: ['DVS-SD-01', 'DVS-SD-02'],
      total_listed_price: 3500,
      total_deal_price: 3200,
      discount_amount: 300,
      payment_method: 'vietqr',
      payment_status: 'pending',
      notes: 'Giao tranh tận nơi',
      created_at: '2026-11-11 10:30:00'
    };

    const row = formatInvoiceForSheet(invoice);
    const keys = Object.keys(row);
    assert.deepEqual(keys, INVOICE_SHEET_HEADERS);
    assert.equal(row['Mã Hóa Đơn'], 'HD-20261111-001');
    assert.equal(row['Mã Khách Hàng'], 1);
    assert.equal(row['Tên Khách Hàng'], 'Nguyễn Văn An');
    assert.equal(row['Số Điện Thoại'], '0901234567');
    assert.equal(row['Danh Sách Mã Tranh'], 'DVS-SD-01, DVS-SD-02');
    assert.equal(row['Tổng Giá Niêm Yết ($ USD)'], 3500);
    assert.equal(row['Tổng Giá Deal ($ USD)'], 3200);
    assert.equal(row['Chiết Khấu ($ USD)'], 300);
    assert.equal(row['Phương Thức Thanh Toán'], 'vietqr');
    assert.equal(row['Trạng Thái Thanh Toán'], 'pending');
    assert.equal(row['Ghi Chú'], 'Giao tranh tận nơi');
    assert.equal(row['Ngày Tạo'], '2026-11-11 10:30:00');
  });

  test('TC-S3: sheetDB.syncInvoice and syncPaintingSold execute and update memory cache safely', () => {
    const invoice = {
      invoice_code: 'HD-TEST-SYNC-01',
      customer_id: 1,
      customer_name: 'Khách Test Sync',
      customer_phone: '0988776655',
      painting_ids: ['DVS-SD-03'],
      total_listed_price: 2000,
      total_deal_price: 1800,
      discount_amount: 200,
      payment_method: 'vietqr',
      payment_status: 'pending'
    };

    const syncRow = sheetDB.syncInvoice(invoice);
    assert.equal(syncRow['Mã Hóa Đơn'], 'HD-TEST-SYNC-01');

    // Verify meta.invoices updated
    const metaRow = sheetDB.getById('meta', 'invoices', 'key');
    assert.ok(metaRow && metaRow.value);
    const invoicesInMeta = JSON.parse(metaRow.value);
    assert.ok(Array.isArray(invoicesInMeta));
    const found = invoicesInMeta.find(r => r['Mã Hóa Đơn'] === 'HD-TEST-SYNC-01');
    assert.ok(found, 'Invoice must be present in meta.invoices');

    // Test syncPaintingSold
    sheetDB.syncPaintingSold('DVS-SD-03', {
      dealPrice: 1800,
      saleDate: '11-11-2026',
      customerName: 'Khách Test Sync',
      invoiceCode: 'HD-TEST-SYNC-01'
    });
    const p = sheetDB.getById('paintings', 'DVS-SD-03');
    if (p) {
      assert.equal(p.tinh_trang, 'da_ban');
      assert.equal(p.gia, 1800);
      assert.equal(p.hoa_don, 'HD-TEST-SYNC-01');
    }
  });
});

describe('Milestone 1 Core: OrderStore SQLite & Concurrency Mutex Unit Tests', () => {
  let testStore = null;

  before(() => {
    testStore = createOrderStore(':memory:');
  });

  after(() => {
    if (testStore) testStore.close();
  });

  test('TC-O1: createInvoice validates required fields and generates auto-increment ID', () => {
    assert.throws(
      () => testStore.createInvoice({ customer_id: 1, customer_name: 'Test' }),
      /Mã hóa đơn không được để trống/
    );
    assert.throws(
      () => testStore.createInvoice({ invoice_code: 'HD-001', customer_name: 'Test' }),
      /Mã khách hàng/
    );
    assert.throws(
      () => testStore.createInvoice({ invoice_code: 'HD-001', customer_id: 1, items: [] }),
      /Tên khách hàng không được để trống/
    );
    assert.throws(
      () => testStore.createInvoice({ invoice_code: 'HD-001', customer_id: 1, customer_name: 'An', items: [] }),
      /Danh sách tác phẩm không được để trống/
    );

    const created = testStore.createInvoice({
      invoice_code: 'HD-UNIT-001',
      customer_id: 1,
      customer_name: 'Nguyễn Văn An',
      customer_phone: '0901234567',
      items: [
        { painting_id: 'P-01', listed_price: 1000, deal_price: 900, note: 'Khách quen' }
      ],
      total_listed_price: 1000,
      total_deal_price: 900,
      discount_amount: 100,
      payment_method: 'vietqr',
      notes: 'Giao chiều'
    });

    assert.ok(created.id > 0);
    assert.equal(created.invoice_code, 'HD-UNIT-001');
    assert.deepEqual(created.painting_ids, ['P-01']);
    assert.equal(created.total_listed_price, 1000);
    assert.equal(created.total_deal_price, 900);
    assert.equal(created.discount_amount, 100);
    assert.equal(created.payment_status, 'pending');
  });

  test('TC-O2: Duplicate invoice_code throws DuplicateInvoiceCodeError (409)', () => {
    assert.throws(
      () => {
        testStore.createInvoice({
          invoice_code: 'HD-UNIT-001',
          customer_id: 2,
          customer_name: 'Trần Bình',
          items: [{ painting_id: 'P-02', deal_price: 500 }]
        });
      },
      (err) => {
        assert.ok(err instanceof DuplicateInvoiceCodeError);
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  });

  test('TC-O3: CRUD queries retrieve and update invoices correctly', () => {
    const byId = testStore.getInvoiceById(1);
    assert.ok(byId);
    assert.equal(byId.invoice_code, 'HD-UNIT-001');

    const byCode = testStore.getInvoiceByCode('HD-UNIT-001');
    assert.ok(byCode);
    assert.equal(byCode.id, 1);

    const byCust = testStore.getInvoicesByCustomerId(1);
    assert.ok(Array.isArray(byCust));
    assert.equal(byCust.length, 1);

    const updated = testStore.updateInvoicePaymentStatus(1, 'completed');
    assert.equal(updated.payment_status, 'completed');

    assert.throws(
      () => testStore.updateInvoicePaymentStatus(1, 'invalid_status'),
      /Trạng thái không hợp lệ/
    );
  });

  test('TC-O4: AsyncMutex ensures serialized sequential execution and handles errors safely', async () => {
    const mutex = new AsyncMutex();
    const order = [];

    const task1 = mutex.runExclusive(async () => {
      await new Promise(r => setTimeout(r, 40));
      order.push(1);
      return 'task1';
    });

    const task2 = mutex.runExclusive(async () => {
      await new Promise(r => setTimeout(r, 20));
      order.push(2);
      throw new Error('Task 2 intentional failure');
    });

    const task3 = mutex.runExclusive(async () => {
      await new Promise(r => setTimeout(r, 10));
      order.push(3);
      return 'task3';
    });

    const res1 = await task1;
    assert.equal(res1, 'task1');

    await assert.rejects(task2, /Task 2 intentional failure/);

    const res3 = await task3;
    assert.equal(res3, 'task3');

    // Verify tasks executed strictly in submission order: 1 -> 2 -> 3
    assert.deepEqual(order, [1, 2, 3]);
  });
});

describe('Milestone 1 Core: API Integration & Concurrency Checkout Acceptance Tests', async () => {
  let initialPaintings = null;
  let testTargetPainting = null;
  let candidatePainting = null;
  let initialCustomer1 = null;

  before(async () => {
    const res = await fetch(`${BASE_URL}/api/paintings`);
    assert.equal(res.status, 200, 'Server must be listening on BASE_URL');
    const data = await res.json();
    initialPaintings = data.data;

    // Snapshot customer 1
    const custRes = await fetch(`${BASE_URL}/api/customers/1`);
    if (custRes.status === 200) {
      initialCustomer1 = (await custRes.json()).data;
    }

    // Pick available artworks for checkout tests
    testTargetPainting = initialPaintings.find(p => p.tinh_trang === 'chua_ban' && p.id !== 'DVS-SD-01');
    candidatePainting = initialPaintings.find(
      p => p.tinh_trang === 'chua_ban' && p.id !== 'DVS-SD-01' && p.id !== 'DVS-SD-02'
    );
    assert.ok(testTargetPainting, 'Must have at least one available painting for checkout test');
  });

  after(async () => {
    // Restore candidate painting if sold during TC-A4
    if (candidatePainting) {
      await fetch(`${BASE_URL}/api/paintings/${candidatePainting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tinh_trang: candidatePainting.tinh_trang,
          gia: candidatePainting.gia,
          ngay_ban: candidatePainting.ngay_ban || null,
          khach_hang: candidatePainting.khach_hang || '',
          hoa_don: candidatePainting.hoa_don || ''
        })
      });
    }

    // Restore customer 1 interests
    if (initialCustomer1) {
      await fetch(`${BASE_URL}/api/customers/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: initialCustomer1.interests || []
        })
      });
    }
  });

  test('TC-A1: GET /api/customers/:id/cart returns enriched cart and dynamic totals', async () => {
    const res = await fetch(`${BASE_URL}/api/customers/1/cart`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.customer_id, 1);
    assert.ok(Array.isArray(body.data.items));
    assert.ok(body.data.summary);
    assert.equal(typeof body.data.summary.total_listed_price, 'number');
    assert.equal(typeof body.data.summary.total_deal_price, 'number');
    assert.equal(typeof body.data.summary.discount_amount, 'number');
    assert.equal(typeof body.data.summary.can_checkout, 'boolean');
  });

  test('TC-A2: PUT /api/customers/:id/cart rejects items already marked "da_ban"', async () => {
    // Locate or create a sold artwork
    const soldArtwork = initialPaintings.find(p => p.tinh_trang === 'da_ban');
    if (soldArtwork) {
      const res = await fetch(`${BASE_URL}/api/customers/1/cart`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ painting_id: soldArtwork.id, deal_price: 1000 }]
        })
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.message.includes('đã được bán'));
    }
  });

  test('TC-A3: POST /api/orders/checkout validates required payload and rejects empty cart', async () => {
    // Missing customer_name
    const res1 = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ painting_id: testTargetPainting.id, deal_price: 1500 }] })
    });
    assert.equal(res1.status, 400);

    // Empty items
    const res2 = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_name: 'Nguyễn Văn An', items: [] })
    });
    assert.equal(res2.status, 400);

    // Negative deal_price
    const res3 = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Nguyễn Văn An',
        items: [{ painting_id: testTargetPainting.id, deal_price: -100 }]
      })
    });
    assert.equal(res3.status, 400);

    // Duplicate painting_id within items
    const res4 = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Nguyễn Văn An',
        items: [
          { painting_id: testTargetPainting.id, deal_price: 1500 },
          { painting_id: testTargetPainting.id, deal_price: 1400 }
        ]
      })
    });
    assert.equal(res4.status, 400);
  });

  test('TC-A4: Concurrency Guard: Concurrent checkouts for same painting results in exactly 1 success and 409 Conflict', async () => {
    // Target painting to sell under race condition
    const candidate = candidatePainting;
    assert.ok(candidate, 'Must find an available candidate painting');

    const code1 = `HD-RACE-${Date.now()}-A`;
    const code2 = `HD-RACE-${Date.now()}-B`;

    const req1 = fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Staff A (Tablet)',
        invoice_code: code1,
        items: [{ painting_id: candidate.id, deal_price: 1900, note: 'Khách tablet mua' }],
        payment_method: 'vietqr'
      })
    });

    const req2 = fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Staff B (Desktop)',
        invoice_code: code2,
        items: [{ painting_id: candidate.id, deal_price: 1950, note: 'Khách PC mua' }],
        payment_method: 'vietqr'
      })
    });

    // Run simultaneously
    const [res1, res2] = await Promise.all([req1, req2]);
    const statuses = [res1.status, res2.status];

    assert.ok(statuses.includes(201), 'One request must succeed with 201 Created');
    assert.ok(statuses.includes(409), 'The competing request must fail with 409 Conflict');

    const successRes = res1.status === 201 ? res1 : res2;
    const failRes = res1.status === 409 ? res1 : res2;

    const successBody = await successRes.json();
    assert.equal(successBody.success, true);
    assert.ok(successBody.data.invoice);
    assert.ok(successBody.data.vietqr);
    assert.equal(successBody.data.vietqr.amount_vnd, convertUsdToVnd(successBody.data.invoice.total_deal_price));
    assert.ok(successBody.data.cleared_cart_items.includes(candidate.id));

    const failBody = await failRes.json();
    assert.equal(failBody.success, false);
    assert.ok(failBody.message.includes('đã được bán trước đó, không thể thanh toán!'));

    // Verify candidate painting is now 'da_ban' in database
    const verifyRes = await fetch(`${BASE_URL}/api/paintings/${candidate.id}`);
    const verifyBody = await verifyRes.json();
    assert.equal(verifyBody.data.tinh_trang, 'da_ban');
    assert.ok(verifyBody.data.ngay_ban);
    assert.ok(verifyBody.data.hoa_don.startsWith('HD-RACE-'));

    // Verify invoice created in GET /api/invoices
    const invRes = await fetch(`${BASE_URL}/api/invoices/${successBody.data.invoice.invoice_code}`);
    assert.equal(invRes.status, 200);
    const invBody = await invRes.json();
    assert.equal(invBody.data.invoice_code, successBody.data.invoice.invoice_code);
  });

  test('TC-A5: Submitting checkout again for the now sold painting immediately returns 409 Conflict', async () => {
    // Attempt checkout on candidatePainting again (which was sold in TC-A4)
    const res = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Late Buyer',
        items: [{ painting_id: candidatePainting.id, deal_price: 1800 }]
      })
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes('đã được bán trước đó, không thể thanh toán!'));
  });

  test('TC-A6: GET /api/invoices and GET /api/invoices/:id return persisted orders correctly', async () => {
    const listRes = await fetch(`${BASE_URL}/api/invoices`);
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.success, true);
    assert.ok(Array.isArray(listBody.data));
    assert.ok(listBody.data.length >= 1, 'Invoices list must contain at least 1 invoice from TC-A4');

    const firstInvoice = listBody.data[0];
    const byIdRes = await fetch(`${BASE_URL}/api/invoices/${firstInvoice.id}`);
    assert.equal(byIdRes.status, 200);
    const byIdBody = await byIdRes.json();
    assert.equal(byIdBody.data.id, firstInvoice.id);
    assert.equal(byIdBody.data.invoice_code, firstInvoice.invoice_code);

    // Non-existent invoice returns 404
    const notFoundRes = await fetch(`${BASE_URL}/api/invoices/999999`);
    assert.equal(notFoundRes.status, 404);
  });
});
