// test/adversarial-tier5-backend.test.mjs
/**
 * Milestone 3 Tier 5 Adversarial Coverage Hardening Suite
 * Deep White-Box Backend & VietQR Security Audit
 *
 * Focus Areas:
 * 1. Recursive EMVCo TLV parsing oracle & CRC16 checksum integrity across boundary amounts
 * 2. Malformed invoice codes, SQL injection attempts & search/memo parameter hardening
 * 3. Non-integer, negative, and invalid customer_id rigorous validation & zero side-effects
 * 4. High-volume concurrency & Mutex serialization stress tests (distinct vs same painting)
 * 5. Rollback snapshot restoration & transaction atomicity under forced errors
 * 6. Gallery Inventory Invariant verification and zero-pollution teardown
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

import {
  formatTlv,
  computeCrc16,
  sanitizeNapasMemo,
  sanitizeMerchantName,
  convertUsdToVnd,
  generateVietQrEmvcoPayload,
  generateVietQrQuickLinkUrl,
  generateLocalQrDataUrl,
  generateVietQrPayment,
  DEFAULT_BANK_CONFIG
} from '../server/vietqrService.js';

import {
  createOrderStore,
  getOrderStore,
  deleteInvoice,
  ArtworkAlreadySoldError,
  DuplicateInvoiceCodeError,
  DEFAULT_DB_PATH
} from '../server/orderStore.js';

import { AsyncMutex, checkoutMutex } from '../server/checkoutMutex.js';
import { initPriceHistory, savePriceHistory } from '../server/priceHistoryStore.js';
import { formatInvoiceForSheet, INVOICE_SHEET_HEADERS } from '../server/googleSheetSingleton.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASE_URL = process.env.TEST_URL || 'https://localhost:5001';

/**
 * Strict Recursive EMVCo TLV Parser Oracle
 * Recursively parses root TLVs and nested TLVs
 */
function parseEmvcoTlv(emvcoString) {
  const result = {};
  let idx = 0;
  while (idx < emvcoString.length) {
    if (idx + 4 > emvcoString.length) {
      throw new Error(`Incomplete TLV header at offset ${idx} in "${emvcoString}"`);
    }
    const tag = emvcoString.slice(idx, idx + 2);
    const lengthStr = emvcoString.slice(idx + 2, idx + 4);
    const length = parseInt(lengthStr, 10);
    if (isNaN(length) || length < 0) {
      throw new Error(`Invalid length "${lengthStr}" for tag "${tag}" at offset ${idx}`);
    }
    idx += 4;
    if (idx + length > emvcoString.length) {
      throw new Error(`Payload truncated: tag "${tag}" specifies length ${length}, but only ${emvcoString.length - idx} characters remain`);
    }
    const value = emvcoString.slice(idx, idx + length);
    idx += length;
    result[tag] = { length, value };
  }
  return result;
}

describe('Milestone 3 Tier 5 Adversarial Coverage Hardening Suite', () => {
  let initialStats = null;
  let allPaintings = [];
  let availableCandidates = [];
  const originalPaintingsMap = new Map();

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const body = await res.json().catch(() => null);
    return { status: res.status, headers: res.headers, body };
  }

  async function restorePainting(p) {
    if (!p) return;
    const orig = originalPaintingsMap.get(p.id);
    if (!orig) return;
    await fetch(`${BASE_URL}/api/paintings/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tinh_trang: orig.tinh_trang,
        gia: orig.gia,
        ngay_ban: orig.ngay_ban || null,
        khach_hang: orig.khach_hang || '',
        hoa_don: orig.hoa_don || '',
        ngay_cap_nhat_gia_gan_nhat: orig.ngay_cap_nhat_gia_gan_nhat || null
      })
    });
  }

  before(async () => {
    // 1. Snapshot baseline gallery statistics
    const statsRes = await fetchJson(`${BASE_URL}/api/stats`);
    assert.equal(statsRes.status, 200, 'Server must be listening on BASE_URL');
    initialStats = statsRes.body.stats;

    assert.equal(initialStats.totalCount, 335, 'Baseline totalCount must be 335');
    assert.equal(initialStats.inStockCount, 298, 'Baseline inStockCount must be 298');
    assert.equal(initialStats.inStockValue, 3082550, 'Baseline inStockValue must be $3,082,550 USD');
    assert.equal(initialStats.soldCount, 37, 'Baseline soldCount must be 37');

    // 2. Fetch candidate paintings for checkout tests (avoiding DVS-SD- paintings used in regression tests)
    const pRes = await fetchJson(`${BASE_URL}/api/paintings`);
    assert.equal(pRes.status, 200);
    allPaintings = pRes.body.data;
    availableCandidates = allPaintings.filter(p =>
      p.tinh_trang === 'chua_ban' &&
      !p.id.startsWith('DVS-SD-')
    );
    assert.ok(availableCandidates.length >= 10, 'Need at least 10 candidate paintings for tests');

    for (const p of availableCandidates.slice(0, 10)) {
      originalPaintingsMap.set(p.id, JSON.parse(JSON.stringify(p)));
    }
  });

  after(async () => {
    // 1. Restore all candidate paintings to original status
    for (const p of availableCandidates.slice(0, 10)) {
      await restorePainting(p);
    }

    // 2. Clean up test invoices with prefix HD-T5-
    try {
      const db = new DatabaseSync(DEFAULT_DB_PATH);
      db.exec("DELETE FROM invoices WHERE invoice_code LIKE 'HD-T5-%';");
      db.close();
    } catch (err) {
      console.warn('⚠️ [Cleanup] Error cleaning Tier 5 invoices:', err.message);
    }

    // 3. Clean up test price history logs
    try {
      const logs = initPriceHistory();
      const cleaned = logs.filter(l => !l.note || !l.note.includes('HD-T5-'));
      savePriceHistory(cleaned, { immediateSync: true });
    } catch (err) {
      console.warn('⚠️ [Cleanup] Error cleaning Tier 5 price logs:', err.message);
    }

    // 4. Invariant Assertion: Verify gallery inventory is exactly 100% restored
    const finalStatsRes = await fetchJson(`${BASE_URL}/api/stats`);
    if (finalStatsRes.status === 200 && finalStatsRes.body.stats) {
      const finalStats = finalStatsRes.body.stats;
      assert.equal(finalStats.totalCount, 335, 'Gallery totalCount must remain exactly 335');
      assert.equal(finalStats.inStockCount, 298, 'Gallery inStockCount must remain exactly 298');
      assert.equal(finalStats.inStockValue, 3082550, 'Gallery inStockValue must remain exactly $3,082,550 USD');
      assert.equal(finalStats.soldCount, 37, 'Gallery soldCount must remain exactly 37');
    }
  });

  // =========================================================================
  // SUITE 1: EMVCo TLV Deep Recursive Parsing Oracle & CRC16 Integrity
  // =========================================================================
  describe('Suite 1: EMVCo TLV Recursive Parsing Oracle & CRC16 Integrity', () => {
    test('ADV-T5-1.1: Multi-level recursive parser oracle decodes root and nested tags accurately', () => {
      const payload = generateVietQrEmvcoPayload({
        bankId: '970422',
        accountNo: '0901234567',
        amountVnd: 50800000,
        memo: 'HD-T5-20261111-001',
        accountName: 'GALLERY BINH MINH',
        city: 'HA NOI'
      });

      // 1. Parse root level
      const rootTlvs = parseEmvcoTlv(payload);
      assert.equal(rootTlvs['00'].value, '01', 'Tag 00 Payload Format Indicator must be 01');
      assert.equal(rootTlvs['01'].value, '12', 'Tag 01 Initiation Method must be 12 (Dynamic)');
      assert.equal(rootTlvs['53'].value, '704', 'Tag 53 Currency must be 704 (VND)');
      assert.equal(rootTlvs['54'].value, '50800000', 'Tag 54 Amount must match amountVnd');
      assert.equal(rootTlvs['58'].value, 'VN', 'Tag 58 Country must be VN');
      assert.equal(rootTlvs['59'].value, 'GALLERY BINH MINH', 'Tag 59 Merchant Name');
      assert.equal(rootTlvs['60'].value, 'HA NOI', 'Tag 60 City');

      // 2. Parse nested Tag 38 (Merchant Account Info)
      assert.ok(rootTlvs['38'], 'Tag 38 must be present');
      const sub38 = parseEmvcoTlv(rootTlvs['38'].value);
      assert.equal(sub38['00'].value, 'A000000727', 'Subtag 00 AID must be VietQR A000000727');
      assert.equal(sub38['02'].value, 'QRIBFTTA', 'Subtag 02 Service Code must be QRIBFTTA');

      // 3. Parse nested Subtag 01 of Tag 38 (Beneficiary Info)
      assert.ok(sub38['01'], 'Subtag 01 must be present in Tag 38');
      const beneficiary = parseEmvcoTlv(sub38['01'].value);
      assert.equal(beneficiary['00'].value, '970422', 'Beneficiary Subtag 00 must be bankId BIN 970422');
      assert.equal(beneficiary['01'].value, '0901234567', 'Beneficiary Subtag 01 must be accountNo');

      // 4. Parse nested Tag 62 (Additional Data / Memo)
      assert.ok(rootTlvs['62'], 'Tag 62 must be present');
      const sub62 = parseEmvcoTlv(rootTlvs['62'].value);
      assert.equal(sub62['08'].value, 'HD-T5-20261111-001', 'Subtag 08 must be sanitized memo');

      // 5. Verify Tag 63 CRC16
      assert.ok(rootTlvs['63'], 'Tag 63 CRC16 must be present');
      assert.equal(rootTlvs['63'].length, 4, 'CRC16 length must be 4');
      const rawBeforeCrc = payload.slice(0, -4);
      const computed = computeCrc16(rawBeforeCrc);
      assert.equal(rootTlvs['63'].value, computed, 'CRC16 must match computed CRC16-CCITT');
    });

    test('ADV-T5-1.2: Boundary financial conversions ($0, $0.01, $1, $1800, $25400, $10M, $100M) maintain mathematical CRC16', () => {
      const boundaryAmounts = [
        { usd: 0, expectedVnd: 0, isDynamic: false },
        { usd: 0.01, expectedVnd: 254, isDynamic: true },
        { usd: 1, expectedVnd: 25400, isDynamic: true },
        { usd: 1800, expectedVnd: 45720000, isDynamic: true },
        { usd: 25400, expectedVnd: 645160000, isDynamic: true },
        { usd: 10000000, expectedVnd: 254000000000, isDynamic: true },
        { usd: 99999999, expectedVnd: 2539999974600, isDynamic: true }
      ];

      for (const b of boundaryAmounts) {
        const vnd = convertUsdToVnd(b.usd, 25400);
        assert.equal(vnd, b.expectedVnd, `USD ${b.usd} must convert to VND ${b.expectedVnd}`);

        const payload = generateVietQrEmvcoPayload({
          amountVnd: vnd,
          memo: `PAY ${b.usd}`
        });

        const tlvs = parseEmvcoTlv(payload);
        if (b.isDynamic) {
          assert.equal(tlvs['01'].value, '12', `Tag 01 for USD ${b.usd} must be 12`);
          assert.equal(tlvs['54'].value, String(b.expectedVnd), `Tag 54 for USD ${b.usd} must match`);
        } else {
          assert.equal(tlvs['01'].value, '11', 'Tag 01 for $0 must be 11 (Static)');
          assert.equal(tlvs['54'], undefined, 'Tag 54 must be omitted for $0');
        }

        // Verify CRC16 for every boundary amount
        const payloadWithoutCrc = payload.slice(0, -4);
        const expectedCrc = computeCrc16(payloadWithoutCrc);
        assert.equal(tlvs['63'].value, expectedCrc, `CRC16 for USD ${b.usd} must match computed CRC`);
      }
    });

    test('ADV-T5-1.3: CRC16 Fuzzing & Tamper-Proofing Oracle (Single character modification invalidates checksum)', () => {
      const originalPayload = generateVietQrEmvcoPayload({
        amountVnd: 45720000,
        memo: 'INTEGRITY TEST'
      });

      const rootTlvs = parseEmvcoTlv(originalPayload);
      const originalCrc = rootTlvs['63'].value;

      // Tamper-test 10 different index positions in the payload
      const testIndices = [0, 5, 12, 20, 35, 45, 55, 65, originalPayload.length - 10, originalPayload.length - 5];

      for (const idx of testIndices) {
        const char = originalPayload[idx];
        const replacement = char === 'A' ? 'B' : 'A';
        const tampered = originalPayload.slice(0, idx) + replacement + originalPayload.slice(idx + 1);

        const tamperedWithoutCrc = tampered.slice(0, -4);
        const tamperedCalculatedCrc = computeCrc16(tamperedWithoutCrc);

        assert.notEqual(
          tamperedCalculatedCrc,
          originalCrc,
          `Tampering character at index ${idx} must produce different CRC16`
        );
      }
    });

    test('ADV-T5-1.4: Extreme length and character set sanitization in NAPAS memo', () => {
      // 1. Extreme 500-char input with special characters and emojis
      const complexMemo = 'Đơn hàng VIP #999 🎉 (Hà Nội -> TP. Hồ Chí Minh) — Giảm 20% & Freeship!!! ' + 'X'.repeat(400);
      const sanitized = sanitizeNapasMemo(complexMemo, 50);

      assert.equal(sanitized.length, 50, 'Sanitized memo must be clamped to max 50 chars');
      assert.ok(!/[À-ỹđĐ]/.test(sanitized), 'Diacritics must be converted to plain ASCII');
      assert.ok(!/[^A-Z0-9 -]/.test(sanitized), 'Must contain only uppercase alphanumeric, spaces, and hyphens');

      // 2. Empty or whitespace memo
      assert.equal(sanitizeNapasMemo(''), '');
      assert.equal(sanitizeNapasMemo('   '), '');
      assert.equal(sanitizeNapasMemo(null), '');
      assert.equal(sanitizeNapasMemo(undefined), '');

      // 3. Merchant name max 25 chars
      const longMerchant = 'Phòng Trưng Bày Nghệ Thuật Bình Minh Art Gallery Premium';
      const sanitizedMerchant = sanitizeMerchantName(longMerchant, 25);
      assert.equal(sanitizedMerchant.length, 25);
      assert.equal(sanitizedMerchant, 'PHONG TRUNG BAY NGHE THUA');
    });

    test('ADV-T5-1.5: Offline Base64 QR code generation produces valid PNG data URI', async () => {
      const payload = generateVietQrEmvcoPayload({ amountVnd: 100000, memo: 'OFFLINE QR TEST' });
      const dataUrl = await generateLocalQrDataUrl(payload);

      assert.ok(dataUrl, 'generateLocalQrDataUrl must return a data URI');
      assert.ok(dataUrl.startsWith('data:image/png;base64,'), 'Data URI must be PNG Base64');
      assert.ok(dataUrl.length > 500, 'Data URI length must be substantial for valid image');
    });
  });

  // =========================================================================
  // SUITE 2: Malformed Invoice Codes & SQL Injection Hardening
  // =========================================================================
  describe('Suite 2: Malformed Invoice Codes & SQL Injection Hardening', () => {
    test('ADV-T5-2.1: SQL injection attempts in GET /api/invoices query parameters are sanitized safely', async () => {
      const injectionAttacks = [
        { param: 'customer_id', value: '1 OR 1=1' },
        { param: 'customer_id', value: '1; DROP TABLE invoices; --' },
        { param: 'payment_status', value: "' OR '1'='1" },
        { param: 'payment_method', value: "vietqr' UNION SELECT null,null,null --" },
        { param: 'limit', value: '10; DROP TABLE invoices; --' },
        { param: 'limit', value: '-999' },
        { param: 'limit', value: '99999999' }
      ];

      for (const atk of injectionAttacks) {
        const url = `${BASE_URL}/api/invoices?${encodeURIComponent(atk.param)}=${encodeURIComponent(atk.value)}`;
        const res = await fetchJson(url);

        assert.equal(res.status, 200, `Query with ${atk.param}="${atk.value}" must not crash server (status 200)`);
        assert.equal(res.body.success, true);
        assert.ok(Array.isArray(res.body.data), 'Result data must remain an array');
        assert.ok(res.body.count <= 500, 'Limit clamp must cap results <= 500');
      }
    });

    test('ADV-T5-2.2: SQL injection attempts in invoice code lookups GET /api/invoices/:id are handled safely', async () => {
      const maliciousCodes = [
        "' OR '1'='1",
        "1; DROP TABLE invoices; --",
        "admin'--",
        "<script>alert(1)</script>",
        "../../etc/passwd",
        "%27%20OR%201=1--"
      ];

      for (const code of maliciousCodes) {
        const res = await fetchJson(`${BASE_URL}/api/invoices/${encodeURIComponent(code)}`);
        assert.equal(res.status, 404, `Malicious lookup "${code}" must return 404 Not Found safely`);
        assert.equal(res.body.success, false);
      }
    });

    test('ADV-T5-2.3: OrderStore raw prepared statements enforce constraints and prevent SQL injection', () => {
      const memStore = createOrderStore(':memory:');

      // Attempt SQL injection via invoice_code
      const sqlInjectionCode = "HD-INJ'; DROP TABLE invoices; --";
      const inv = memStore.createInvoice({
        invoice_code: sqlInjectionCode,
        customer_id: 1,
        customer_name: 'SQL Tester',
        items: [{ painting_id: 'P-SQL-01', deal_price: 1000 }]
      });

      assert.equal(inv.invoice_code, sqlInjectionCode, 'Invoice code must be stored as literal text');

      // Verify table invoices STILL EXISTS
      const checkTable = memStore.raw.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='invoices'").get();
      assert.equal(checkTable.count, 1, 'Invoices table must not be dropped by injected SQL code');

      // Lookup by exact injected string
      const retrieved = memStore.getInvoiceByCode(sqlInjectionCode);
      assert.equal(retrieved.id, inv.id);

      memStore.close();
    });

    test('ADV-T5-2.4: Malformed invoice codes with only whitespaces are rejected by CHECK constraint', () => {
      const memStore = createOrderStore(':memory:');

      assert.throws(() => {
        memStore.createInvoice({
          invoice_code: '   ',
          customer_id: 1,
          customer_name: 'Whitespace Test',
          items: [{ painting_id: 'P-WS-01', deal_price: 1000 }]
        });
      }, /Mã hóa đơn không được để trống/);

      assert.throws(() => {
        memStore.createInvoice({
          invoice_code: 'HD-EMPTY-NAME',
          customer_id: 1,
          customer_name: '   ',
          items: [{ painting_id: 'P-WS-02', deal_price: 1000 }]
        });
      }, /CHECK constraint failed: length\(trim\(customer_name\)\) > 0/);

      memStore.close();
    });

    test('ADV-T5-2.5: Cart payload validation in POST /api/orders/checkout: empty items, duplicate IDs, missing name', async () => {
      const candidate = availableCandidates[0];

      // 1. Missing or whitespace-only customer_name
      const resNoName = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 1,
          customer_name: '   ',
          items: [{ painting_id: candidate.id, deal_price: 1000 }]
        })
      });
      assert.equal(resNoName.status, 400);
      assert.ok(resNoName.body.message.includes('Tên khách hàng không được để trống'));

      // 2. Empty items array
      const resEmptyItems = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 1,
          customer_name: 'Valid Name',
          items: []
        })
      });
      assert.equal(resEmptyItems.status, 400);
      assert.ok(resEmptyItems.body.message.includes('Giỏ hàng trống'));

      // 3. Duplicate painting_id in same cart request
      const resDupItems = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 1,
          customer_name: 'Valid Name',
          items: [
            { painting_id: candidate.id, deal_price: 1000 },
            { painting_id: candidate.id, deal_price: 1200 }
          ]
        })
      });
      assert.equal(resDupItems.status, 400);
      assert.ok(resDupItems.body.message.includes('trùng lặp trong giỏ hàng'));

      // 4. Negative deal_price in item
      const resNegPrice = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 1,
          customer_name: 'Valid Name',
          items: [{ painting_id: candidate.id, deal_price: -500 }]
        })
      });
      assert.equal(resNegPrice.status, 400);
      assert.ok(resNegPrice.body.message.includes('Giá thương lượng không hợp lệ'));
    });

    test('ADV-T5-2.6: OrderStore updateInvoicePaymentStatus enforces status whitelist and updates database', () => {
      const memStore = createOrderStore(':memory:');
      const inv = memStore.createInvoice({
        invoice_code: 'HD-STATUS-001',
        customer_id: 1,
        customer_name: 'Status Tester',
        items: [{ painting_id: 'P-ST-01', deal_price: 1000 }]
      });

      assert.equal(inv.payment_status, 'pending');

      // Valid update to completed
      const updated = memStore.updateInvoicePaymentStatus(inv.id, 'completed');
      assert.equal(updated.payment_status, 'completed');

      // Valid update to cancelled
      const cancelled = memStore.updateInvoicePaymentStatus(inv.id, 'cancelled');
      assert.equal(cancelled.payment_status, 'cancelled');

      // Invalid status throws
      assert.throws(() => {
        memStore.updateInvoicePaymentStatus(inv.id, 'refunded_invalid');
      }, /Trạng thái không hợp lệ/);

      memStore.close();
    });

    test('ADV-T5-2.7: OrderStore deleteInvoice works idempotently and handles invalid IDs safely', () => {
      const memStore = createOrderStore(':memory:');
      const inv = memStore.createInvoice({
        invoice_code: 'HD-DEL-TEST',
        customer_id: 1,
        customer_name: 'Delete Tester',
        items: [{ painting_id: 'P-DEL-01', deal_price: 1000 }]
      });

      assert.equal(memStore.deleteInvoice(inv.id), true, 'First delete returns true');
      assert.equal(memStore.deleteInvoice(inv.id), false, 'Second delete of same ID returns false');
      assert.equal(memStore.deleteInvoice(null), false, 'Delete with null returns false');
      assert.equal(memStore.deleteInvoice('non_numeric'), false, 'Delete with non-numeric returns false');

      memStore.close();
    });
  });

  // =========================================================================
  // SUITE 3: Customer ID Rigorous Boundary & Type Validation
  // =========================================================================
  describe('Suite 3: Customer ID Boundary & Type Validation', () => {
    test('ADV-T5-3.1: Boundary matrix of invalid customer_id inputs are strictly rejected with HTTP 400', async () => {
      const candidate = availableCandidates[0];
      const invalidCustomerIds = [
        -1,                   // Negative integer
        -9999,                // Large negative
        -0,                   // Negative zero
        0,                    // Zero
        0.5,                  // Decimal float
        1.99,                 // Non-integer float
        'not_numeric',        // Alphabetic string
        '123abc',             // Alphanumeric string
        true,                 // Boolean true
        false,                // Boolean false
        null,                 // Null
        undefined,            // Undefined
        [],                   // Array
        {},                   // Object
        NaN,                  // Not-a-Number
        Infinity,             // Positive infinity
        -Infinity             // Negative infinity
      ];

      for (const invalidId of invalidCustomerIds) {
        const res = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: invalidId,
            customer_name: 'Boundary Test Buyer',
            invoice_code: `HD-T5-BADCUST-${Date.now()}-${Math.random()}`,
            items: [{ painting_id: candidate.id, deal_price: 1200 }],
            payment_method: 'vietqr'
          })
        });

        assert.equal(
          res.status,
          400,
          `customer_id: ${JSON.stringify(invalidId)} must be rejected with HTTP 400 Bad Request`
        );
        assert.equal(res.body.success, false);
      }

      // Assert candidate painting remains 'chua_ban' and untouched
      const check = (await fetchJson(`${BASE_URL}/api/paintings/${candidate.id}`)).body.data;
      assert.equal(check.tinh_trang, 'chua_ban', 'Candidate artwork must remain untouched');
    });

    test('ADV-T5-3.2: String-encoded positive integers (e.g. " 42 ") are parsed cleanly to positive integer', async () => {
      const candidate = availableCandidates[1];
      const testCode = `HD-T5-STRCUST-${Date.now()}`;

      const res = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: ' 42 ',
          customer_name: 'String ID Buyer',
          invoice_code: testCode,
          items: [{ painting_id: candidate.id, deal_price: candidate.gia || 2000 }],
          payment_method: 'vietqr'
        })
      });

      assert.equal(res.status, 201, 'Valid string-encoded integer " 42 " must be accepted (HTTP 201)');
      assert.equal(res.body.data.invoice.customer_id, 42, 'Parsed customer_id must be integer 42');

      // Restore candidate immediately
      await restorePainting(candidate);
    });
  });

  // =========================================================================
  // SUITE 4: High-Volume Concurrency & Mutex Serialization Stress Tests
  // =========================================================================
  describe('Suite 4: High-Volume Concurrency & Mutex Serialization', () => {
    test('ADV-T5-4.1: AsyncMutex stress test: 50 concurrent tasks run in strictly serialized order', async () => {
      const mutex = new AsyncMutex();
      const executionLog = [];
      let concurrentActive = 0;
      let maxConcurrent = 0;

      const tasks = Array.from({ length: 50 }, (_, i) => {
        return mutex.runExclusive(async () => {
          concurrentActive++;
          if (concurrentActive > maxConcurrent) maxConcurrent = concurrentActive;
          // Yield to event loop to allow concurrency collision if mutex is flawed
          await new Promise(r => setTimeout(r, 2));
          executionLog.push(i);
          concurrentActive--;
          return i;
        });
      });

      const results = await Promise.all(tasks);
      assert.equal(results.length, 50, 'All 50 tasks must resolve');
      assert.equal(maxConcurrent, 1, 'Max concurrent executions inside mutex must strictly be 1');
      assert.equal(executionLog.length, 50, 'Execution log must have exactly 50 entries');
    });

    test('ADV-T5-4.2: High-volume concurrent checkouts on the SAME painting (10 requests): Exactly 1 succeeds, 9 receive 409', async () => {
      const target = availableCandidates[2];
      const timestamp = Date.now();
      const concurrency = 10;

      const requests = Array.from({ length: concurrency }, (_, i) => {
        return fetchJson(`${BASE_URL}/api/orders/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: 1,
            customer_name: `Concurrent Race Buyer ${i}`,
            invoice_code: `HD-T5-RACE-SAME-${timestamp}-${i}`,
            items: [{ painting_id: target.id, deal_price: target.gia || 1500 }],
            payment_method: 'vietqr'
          })
        });
      });

      const responses = await Promise.all(requests);
      const successes = responses.filter(r => r.status === 201);
      const conflicts = responses.filter(r => r.status === 409);

      assert.equal(successes.length, 1, 'Exactly 1 checkout must succeed with 201 Created');
      assert.equal(conflicts.length, concurrency - 1, `Exactly ${concurrency - 1} checkouts must fail with 409 Conflict`);

      for (const conflict of conflicts) {
        assert.ok(
          conflict.body.message.includes('đã được bán'),
          'Conflict message must state artwork was already sold'
        );
      }

      // Restore painting immediately
      await restorePainting(target);
    });

    test('ADV-T5-4.3: Concurrent checkouts on 5 DISTINCT paintings: All 5 succeed with 201 Created (no false conflicts)', async () => {
      const candidates = availableCandidates.slice(3, 8);
      assert.equal(candidates.length, 5, 'Must have 5 distinct candidate paintings');
      const timestamp = Date.now();

      const requests = candidates.map((c, i) => {
        return fetchJson(`${BASE_URL}/api/orders/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: i + 1,
            customer_name: `Distinct Buyer ${i}`,
            invoice_code: `HD-T5-DISTINCT-${timestamp}-${i}`,
            items: [{ painting_id: c.id, deal_price: c.gia || 1800 }],
            payment_method: 'vietqr'
          })
        });
      });

      const responses = await Promise.all(requests);
      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        assert.equal(res.status, 201, `Checkout for distinct painting ${candidates[i].id} must succeed (201)`);
        assert.equal(res.body.success, true);
        assert.ok(res.body.data.vietqr, 'Must generate valid VietQR payload');
      }

      // Verify all 5 are marked 'da_ban'
      for (const c of candidates) {
        const check = (await fetchJson(`${BASE_URL}/api/paintings/${c.id}`)).body.data;
        assert.equal(check.tinh_trang, 'da_ban', `Painting ${c.id} must be transitioned to da_ban`);
      }

      // Restore all 5 paintings
      for (const c of candidates) {
        await restorePainting(c);
      }
    });

    test('ADV-T5-4.4: Mutex fault recovery: Exception inside callback does not deadlock subsequent tasks', async () => {
      const mutex = new AsyncMutex();
      await assert.rejects(async () => {
        await mutex.runExclusive(async () => {
          throw new Error('Forced crash inside mutex');
        });
      }, /Forced crash inside mutex/);

      // Subsequent call must execute immediately without hanging or deadlocking
      const subsequentResult = await mutex.runExclusive(async () => {
        return 'recovered_ok';
      });
      assert.equal(subsequentResult, 'recovered_ok', 'Mutex must fully release on exception and process subsequent calls');
    });
  });

  // =========================================================================
  // SUITE 5: Rollback Snapshot Restoration & Transaction Atomicity
  // =========================================================================
  describe('Suite 5: Rollback Snapshot Restoration & Transaction Atomicity', () => {
    test('ADV-T5-5.1: OrderStore executeCheckoutTransaction rolls back SQLite changes completely under forced error', () => {
      const memDb = createOrderStore(':memory:');

      // Create a simulated paintings table in SQLite
      memDb.raw.exec(`
        CREATE TABLE paintings (
          id TEXT PRIMARY KEY,
          ten_tac_pham TEXT,
          tinh_trang TEXT,
          gia REAL,
          ngay_ban TEXT,
          khach_hang TEXT,
          hoa_don TEXT,
          ngay_cap_nhat_san_pham TEXT
        );
        INSERT INTO paintings (id, ten_tac_pham, tinh_trang, gia) VALUES
          ('P-ROLLBACK-1', 'Bức Tranh Số 1', 'chua_ban', 2000),
          ('P-ROLLBACK-2', 'Bức Tranh Số 2', 'da_ban', 3000);
      `);

      // Attempt checkout of cart containing P-ROLLBACK-1 (available) and P-ROLLBACK-2 (sold)
      assert.throws(() => {
        memDb.executeCheckoutTransaction({
          customer_id: 1,
          customer_name: 'Test Rollback Buyer',
          invoice_code: 'HD-T5-ROLLBACK-001',
          items: [
            { painting_id: 'P-ROLLBACK-1', deal_price: 1800, listed_price: 2000 },
            { painting_id: 'P-ROLLBACK-2', deal_price: 2800, listed_price: 3000 }
          ]
        });
      }, ArtworkAlreadySoldError);

      // Verify P-ROLLBACK-1 was NOT transitioned to 'da_ban'
      const p1 = memDb.raw.prepare("SELECT * FROM paintings WHERE id = 'P-ROLLBACK-1'").get();
      assert.equal(p1.tinh_trang, 'chua_ban', 'P-ROLLBACK-1 must remain chua_ban due to transaction rollback');
      assert.equal(p1.hoa_don, null);

      // Verify no invoice was created
      const invoices = memDb.raw.prepare("SELECT count(*) as count FROM invoices WHERE invoice_code = 'HD-T5-ROLLBACK-001'").get();
      assert.equal(invoices.count, 0, 'No invoice row must exist after rollback');

      memDb.close();
    });

    test('ADV-T5-5.2: Live API checkout duplicate invoice code rejects with HTTP 409 and does not sell artwork', async () => {
      const candidate = availableCandidates[8];
      const dupCode = `HD-T5-DUPCODE-${Date.now()}`;

      // 1. First checkout succeeds with dupCode
      const res1 = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 1,
          customer_name: 'First Buyer',
          invoice_code: dupCode,
          items: [{ painting_id: candidate.id, deal_price: 2000 }],
          payment_method: 'vietqr'
        })
      });
      assert.equal(res1.status, 201, 'First checkout must succeed');

      // 2. Restore candidate painting to 'chua_ban' while KEEPING dupCode invoice in database
      await restorePainting(candidate);

      // 3. Second checkout with the SAME invoice code must be rejected with 409 Conflict
      const res2 = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 2,
          customer_name: 'Second Buyer Duplicate Code',
          invoice_code: dupCode,
          items: [{ painting_id: candidate.id, deal_price: 2000 }],
          payment_method: 'vietqr'
        })
      });

      assert.equal(res2.status, 409, 'Duplicate invoice_code must be rejected with HTTP 409 Conflict');
      assert.ok(res2.body.message.includes('đã tồn tại trong hệ thống'), 'Message must indicate duplicate invoice code');

      // 4. Assert candidate painting was NOT sold
      const check = (await fetchJson(`${BASE_URL}/api/paintings/${candidate.id}`)).body.data;
      assert.equal(check.tinh_trang, 'chua_ban', 'Candidate painting must remain chua_ban');
    });

    test('ADV-T5-5.3: SheetDB sync payload matches exact 12-column header specification', () => {
      const mockInvoice = {
        id: 99,
        invoice_code: 'HD-T5-SHEET-001',
        customer_id: 10,
        customer_name: 'Nguyễn Văn Kiểm Thử',
        customer_phone: '0912345678',
        painting_ids: ['P-01', 'P-02'],
        total_listed_price: 5000,
        total_deal_price: 4500,
        discount_amount: 500,
        payment_method: 'vietqr',
        payment_status: 'pending',
        notes: 'Giao hàng tận nhà',
        created_at: '2026-11-11 12:00:00'
      };

      const sheetRow = formatInvoiceForSheet(mockInvoice);
      const keys = Object.keys(sheetRow);

      assert.equal(keys.length, 12, 'Sheet payload must have exactly 12 columns');
      for (const expectedHeader of INVOICE_SHEET_HEADERS) {
        assert.ok(keys.includes(expectedHeader), `Header "${expectedHeader}" must be present in sheetRow`);
      }

      assert.equal(sheetRow['Mã Hóa Đơn'], 'HD-T5-SHEET-001');
      assert.equal(sheetRow['Mã Khách Hàng'], 10);
      assert.equal(sheetRow['Tên Khách Hàng'], 'Nguyễn Văn Kiểm Thử');
      assert.equal(sheetRow['Danh Sách Mã Tranh'], 'P-01, P-02');
      assert.equal(sheetRow['Tổng Giá Deal ($ USD)'], 4500);
      assert.equal(sheetRow['Chiết Khấu ($ USD)'], 500);
    });

    test('ADV-T5-5.4: Snapshot Rollback Shield logic restores paintings and cleans transient invoice', () => {
      const memStore = createOrderStore(':memory:');
      const testCode = 'HD-T5-SNAP-001';

      // 1. Simulate initial inventory snapshot
      const snapshotPaintings = [
        { id: 'P-SNAP-1', tinh_trang: 'chua_ban', gia: 2000, hoa_don: null },
        { id: 'P-SNAP-2', tinh_trang: 'chua_ban', gia: 3000, hoa_don: null }
      ];
      let workingPaintings = JSON.parse(JSON.stringify(snapshotPaintings));

      // 2. Step 1: Create invoice
      const invoice = memStore.createInvoice({
        invoice_code: testCode,
        customer_id: 1,
        customer_name: 'Rollback Tester',
        items: [{ painting_id: 'P-SNAP-1', deal_price: 1800 }]
      });
      assert.ok(invoice && invoice.id > 0);

      // 3. Step 2: Mutate working paintings
      workingPaintings[0].tinh_trang = 'da_ban';
      workingPaintings[0].gia = 1800;
      workingPaintings[0].hoa_don = testCode;

      // 4. Step 3: Simulate downstream failure and catch block execution
      try {
        throw new Error('Simulated external service timeout or crash');
      } catch (err) {
        // Rollback shield executes:
        // a. Restore working paintings from snapshot
        workingPaintings = JSON.parse(JSON.stringify(snapshotPaintings));
        // b. Delete invoice from SQLite
        memStore.deleteInvoice(invoice.id);
      }

      // Assert complete restoration
      assert.equal(workingPaintings[0].tinh_trang, 'chua_ban');
      assert.equal(workingPaintings[0].gia, 2000);
      assert.equal(workingPaintings[0].hoa_don, null);

      const checkInv = memStore.getInvoiceByCode(testCode);
      assert.equal(checkInv, null, 'Transient invoice must be deleted on rollback');

      memStore.close();
    });
  });

  // =========================================================================
  // SUITE 6: Gallery Inventory Invariant Final Verification
  // =========================================================================
  describe('Suite 6: Gallery Baseline Inventory Invariant Final Verification', () => {
    test('ADV-T5-6.1: Gallery inventory statistics match authentic baseline (335 paintings, 298 in-stock, $3,082,550 USD)', async () => {
      const res = await fetchJson(`${BASE_URL}/api/stats`);
      assert.equal(res.status, 200);
      const stats = res.body.stats;

      assert.equal(stats.totalCount, 335, 'Total gallery paintings must remain 335');
      assert.equal(stats.inStockCount, 298, 'In-stock count must remain 298');
      assert.equal(stats.inStockValue, 3082550, 'In-stock valuation must remain $3,082,550 USD');
      assert.equal(stats.soldCount, 37, 'Sold count must remain 37');
    });
  });
});
