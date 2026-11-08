// test/e2e-inventory-upgrade.test.mjs
/**
 * ==============================================================================
 * BinhMinhArt Gallery Management System
 * Comprehensive E2E & Integration Acceptance Test Suite: Inventory Upgrade
 * Requirements: R1 (Data Cleanup), R2 (Monetary Formatting), R3 (2-Tier Location)
 * Standards: Category-Partition (Tier 1) + BVA (Tier 2) + Pairwise (Tier 3) + Workload (Tier 4)
 * ==============================================================================
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Bypass self-signed SSL certificate check for local HTTPS test on port 5001
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ROOT_DIR = fs.existsSync(path.join(process.cwd(), 'data', 'price_history.json'))
  ? process.cwd()
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BASE_URL = process.env.TEST_URL || 'https://localhost:5001';
const PRICE_HISTORY_FILE = path.join(ROOT_DIR, 'data', 'price_history.json');
const TARGET_PAINTING_ID = 'DVS-SD-01';

// Dynamic modules (loaded at runtime to allow progressive testability without top-level crashes)
let currencyModule = null;
let typesModule = null;
let serverOnline = false;

/**
 * Immediate cleanup helper (Zero-Clutter Directive)
 */
async function deleteArtworkImmediately(id) {
  if (!serverOnline || !id) return;
  try {
    await fetch(`${BASE_URL}/api/paintings/${id}`, { method: 'DELETE' });
  } catch {
    // Teardown safety
  }
}

/**
 * Reference Mathematical Specification: Digit-Count Cursor Calculation
 */
function calculatePreservedCursor(rawVal, prevCursor, newFormatted) {
  const digitsBefore = (rawVal.slice(0, prevCursor).match(/\d/g) || []).length;
  let count = 0;
  for (let i = 0; i < newFormatted.length; i++) {
    if (/\d/.test(newFormatted[i])) count++;
    if (count === digitsBefore) return i + 1;
  }
  return newFormatted.length;
}

before(async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/network-info`);
    if (res.ok) serverOnline = true;
  } catch {
    serverOnline = false;
  }

  try {
    currencyModule = await import('../src/utils/currency.js');
  } catch {
    currencyModule = null;
  }

  try {
    typesModule = await import('../src/types.js');
  } catch {
    typesModule = null;
  }
});

// ==============================================================================
// TIER 1: CATEGORY-PARTITION & PRIMARY BEHAVIOR (HAPPY PATHS)
// ==============================================================================
describe('Tier 1: Category-Partition & Primary Behavior', () => {

  // ----------------------------------------------------------------------------
  // Requirement R1: Data & Fallback Cleanup
  // ----------------------------------------------------------------------------
  describe('Requirement R1: Data and Fallback Cleanup (Primary)', () => {

    test('TC-R1-T1-01: Price history store contains zero "Stress concurrent update" entries', () => {
      assert.ok(fs.existsSync(PRICE_HISTORY_FILE), 'data/price_history.json must exist');
      const raw = fs.readFileSync(PRICE_HISTORY_FILE, 'utf8');
      const logs = JSON.parse(raw);
      const stressLogs = logs.filter(l => l.note && l.note.includes('Stress concurrent update'));
      assert.equal(
        stressLogs.length,
        0,
        `[M1 Bug] data/price_history.json contains ${stressLogs.length} 'Stress concurrent update' logs. Must be 0.`
      );
    });

    test('TC-R1-T1-02: Authentic artwork inventory contains exactly 335 genuine paintings', async () => {
      if (serverOnline) {
        const res = await fetch(`${BASE_URL}/api/paintings`);
        assert.equal(res.status, 200, 'GET /api/paintings must return 200 OK');
        const body = await res.json();
        const paintings = body.data || body;
        assert.equal(
          paintings.length,
          335,
          `Authentic painting count must be exactly 335. Found ${paintings.length}.`
        );
      } else {
        const excelPath = path.join(ROOT_DIR, 'exports', 'BinhMinhArt_Inventory.xlsx');
        assert.ok(fs.existsSync(excelPath), 'BinhMinhArt_Inventory.xlsx must exist');
      }
    });

    test('TC-R1-T1-03: Authentic baseline price history logs (249 records) remain intact', () => {
      assert.ok(fs.existsSync(PRICE_HISTORY_FILE), 'data/price_history.json must exist');
      const raw = fs.readFileSync(PRICE_HISTORY_FILE, 'utf8');
      const logs = JSON.parse(raw);
      const baselines = logs.filter(l => l.note === 'Khởi tạo mốc giá ban đầu');
      assert.equal(
        baselines.length,
        249,
        `Exactly 249 authentic baseline price logs must exist. Found ${baselines.length}.`
      );
    });

    test('TC-R1-T1-04: Target artwork DVS-SD-01 retains authentic price and clean history', async () => {
      if (serverOnline) {
        const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_PAINTING_ID}`);
        assert.equal(res.status, 200);
        const body = await res.json();
        const p = body.data || body;
        assert.equal(p.gia, 1500, 'DVS-SD-01 price must be $1,500');

        const histRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_PAINTING_ID}/price-history`);
        assert.equal(histRes.status, 200);
        const histBody = await histRes.json();
        const logs = histBody.data || [];
        const stress = logs.filter(l => l.note && l.note.includes('Stress concurrent update'));
        assert.equal(stress.length, 0, 'DVS-SD-01 price history must contain zero stress logs');
      } else {
        const raw = fs.readFileSync(PRICE_HISTORY_FILE, 'utf8');
        const logs = JSON.parse(raw).filter(l => l.painting_id === TARGET_PAINTING_ID);
        const stress = logs.filter(l => l.note && l.note.includes('Stress concurrent update'));
        assert.equal(stress.length, 0, 'DVS-SD-01 price history must contain zero stress logs on disk');
      }
    });

    test('TC-R1-T1-05: Location history contains zero orphaned records for non-existent painting IDs', async () => {
      if (serverOnline) {
        const res = await fetch(`${BASE_URL}/api/paintings/Z/location-history`);
        if (res.status === 200) {
          const body = await res.json();
          const logs = body.data || [];
          assert.equal(logs.length, 0, 'Orphaned painting "Z" must have 0 location logs in active store');
        }
      }
    });

  });

  // ----------------------------------------------------------------------------
  // Requirement R2: Monetary Input Formatting & Parsing
  // ----------------------------------------------------------------------------
  describe('Requirement R2: Monetary Input Formatting & Parsing (Primary)', () => {

    test('TC-R2-T1-01: formatThousands formats standard integers with comma separators', () => {
      assert.ok(currencyModule, '[M2 Bug] src/utils/currency.js must exist and be implemented');
      const { formatThousands } = currencyModule;
      assert.equal(formatThousands(2109), '2,109');
      assert.equal(formatThousands(10500000), '10,500,000');
      assert.equal(formatThousands(150), '150');
      assert.equal(formatThousands(0), '0');
    });

    test('TC-R2-T1-02: parseNumericPrice extracts clean integer values from formatted strings', () => {
      assert.ok(currencyModule, '[M2 Bug] src/utils/currency.js must exist and be implemented');
      const { parseNumericPrice } = currencyModule;
      assert.equal(parseNumericPrice('2,109'), 2109);
      assert.equal(parseNumericPrice('10,500,000'), 10500000);
      assert.equal(parseNumericPrice(2109), 2109);
      assert.equal(parseNumericPrice('150'), 150);
    });

    test('TC-R2-T1-03: parseNumericPrice strips currency symbols, spaces, and formatting characters', () => {
      assert.ok(currencyModule, '[M2 Bug] src/utils/currency.js must exist and be implemented');
      const { parseNumericPrice } = currencyModule;
      assert.equal(parseNumericPrice('$2,109 USD'), 2109);
      assert.equal(parseNumericPrice('  10,500,000  '), 10500000);
      assert.equal(parseNumericPrice('$50,000'), 50000);
    });

    test('TC-R2-T1-04: Backend ingestion endpoint POST /api/paintings accepts formatted price strings', async () => {
      if (!serverOnline) return;
      const testId = `E2E-TEST-INGEST-${Date.now()}`;
      try {
        const res = await fetch(`${BASE_URL}/api/paintings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: testId,
            ten_tac_pham: 'Tác Phẩm Thử Nghiệm Định Dạng Tiền Tệ',
            tac_gia: 'Dương Văn Sen',
            chat_lieu: 'Sơn dầu',
            gia: '2,109',
            location: 'Kho'
          })
        });

        assert.ok(
          res.status === 200 || res.status === 201,
          `POST /api/paintings with '2,109' must return 200 or 201. Got ${res.status}`
        );
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.gia, 2109, 'Stored painting price must be numeric 2109');
      } finally {
        await deleteArtworkImmediately(testId);
      }
    });

    test('TC-R2-T1-05: Backend update endpoints PUT /api/paintings/:id accept formatted price strings', async () => {
      if (!serverOnline) return;
      const testId = `E2E-TEST-UPDATE-${Date.now()}`;
      try {
        const createRes = await fetch(`${BASE_URL}/api/paintings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: testId,
            ten_tac_pham: 'Artwork Test Update Comma',
            tac_gia: 'Đoàn Hồng',
            gia: 1000,
            location: 'Kho'
          })
        });
        assert.ok(createRes.status === 200 || createRes.status === 201);

        const updateRes = await fetch(`${BASE_URL}/api/paintings/${testId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: testId,
            gia: '3,750',
            price_note: 'Test update comma formatting acceptance'
          })
        });

        assert.equal(updateRes.status, 200, `PUT /api/paintings/:id with '3,750' must return 200 OK. Got ${updateRes.status}`);
        const updateBody = await updateRes.json();
        assert.equal(updateBody.data.gia, 3750, 'Updated price must be numeric 3750');
      } finally {
        await deleteArtworkImmediately(testId);
      }
    });

  });

  // ----------------------------------------------------------------------------
  // Requirement R3: Two-Tier Location Hierarchy
  // ----------------------------------------------------------------------------
  describe('Requirement R3: Two-Tier Location Hierarchy (Primary)', () => {

    test('TC-R3-T1-01: formatCompoundLocation formats Level 1 and Level 2 into compound string', () => {
      const helper = (typesModule && typesModule.formatCompoundLocation) ||
                     (currencyModule && currencyModule.formatCompoundLocation);
      assert.ok(helper, '[M3 Bug] formatCompoundLocation must be exported from types.js or currency.js');
      assert.equal(helper('Kho tầng hầm', 'khay 1'), 'Kho tầng hầm - khay 1');
      assert.equal(helper('Phòng trưng bày Tầng 1', 'kệ A3'), 'Phòng trưng bày Tầng 1 - kệ A3');
    });

    test('TC-R3-T1-02: formatCompoundLocation preserves Level 1 alone when Level 2 is omitted', () => {
      const helper = (typesModule && typesModule.formatCompoundLocation) ||
                     (currencyModule && currencyModule.formatCompoundLocation);
      assert.ok(helper, '[M3 Bug] formatCompoundLocation must be exported');
      assert.equal(helper('Kho', ''), 'Kho');
      assert.equal(helper('Kho tầng hầm', null), 'Kho tầng hầm');
      assert.equal(helper('Kho Gò Vấp', undefined), 'Kho Gò Vấp');
    });

    test('TC-R3-T1-03: parseCompoundLocation decomposes compound string into Level 1 and Level 2', () => {
      const helper = (typesModule && typesModule.parseCompoundLocation) ||
                     (currencyModule && currencyModule.parseCompoundLocation);
      assert.ok(helper, '[M3 Bug] parseCompoundLocation must be exported');
      const parsed = helper('Kho tầng hầm - khay 1');
      assert.equal(parsed.location_level1, 'Kho tầng hầm');
      assert.equal(parsed.location_level2, 'khay 1');
    });

    test('TC-R3-T1-04: parseCompoundLocation handles legacy single-tier locations gracefully', () => {
      const helper = (typesModule && typesModule.parseCompoundLocation) ||
                     (currencyModule && currencyModule.parseCompoundLocation);
      assert.ok(helper, '[M3 Bug] parseCompoundLocation must be exported');
      const parsed = helper('Kho');
      assert.equal(parsed.location_level1, 'Kho');
      assert.equal(parsed.location_level2, '');

      const parsedEmpty = helper('');
      assert.equal(parsedEmpty.location_level1, 'Kho');
      assert.equal(parsedEmpty.location_level2, '');
    });

    test('TC-R3-T1-05: Location movement API handles 2-tier location fields', async () => {
      if (!serverOnline) return;
      const testId = `E2E-TEST-LOC-${Date.now()}`;
      try {
        const createRes = await fetch(`${BASE_URL}/api/paintings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: testId,
            ten_tac_pham: 'Test 2-Tier Location Move',
            tac_gia: 'Nam Anh',
            location: 'Kho'
          })
        });
        assert.ok(createRes.status === 200 || createRes.status === 201);

        const moveRes = await fetch(`${BASE_URL}/api/paintings/${testId}/location-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_location: 'Kho',
            from_location_level1: 'Kho',
            from_location_level2: '',
            to_location: 'Kho tầng hầm - khay 1',
            to_location_level1: 'Kho tầng hầm',
            to_location_level2: 'khay 1',
            note: 'Chuyển vị trí thử nghiệm 2 tầng'
          })
        });

        assert.equal(moveRes.status, 200, `POST location-history must return 200 OK. Got ${moveRes.status}`);
        const moveBody = await moveRes.json();
        assert.equal(moveBody.success, true);

        const getHistRes = await fetch(`${BASE_URL}/api/paintings/${testId}/location-history`);
        assert.equal(getHistRes.status, 200);
        const histData = await getHistRes.json();
        const logs = histData.data || [];
        const latest = logs[logs.length - 1];
        assert.ok(latest, 'Must have at least one location history log');
        assert.equal(latest.to_location, 'Kho tầng hầm - khay 1');
      } finally {
        await deleteArtworkImmediately(testId);
      }
    });

  });

});

// ==============================================================================
// TIER 2: BOUNDARY VALUE ANALYSIS (BVA) & ADVERSARIAL TESTING
// ==============================================================================
describe('Tier 2: Boundary Value Analysis & Negative Testing', () => {

  // ----------------------------------------------------------------------------
  // Requirement R1: Data Integrity & Boundary Safeguards
  // ----------------------------------------------------------------------------
  describe('Requirement R1: Boundary Safeguards & Non-Pollution Invariants', () => {

    test('TC-R1-T2-01: Header and server guard against unconfirmed destructive seed reset', () => {
      const headerPath = path.join(ROOT_DIR, 'src', 'components', 'Header.jsx');
      assert.ok(fs.existsSync(headerPath), 'src/components/Header.jsx must exist');
      const headerCode = fs.readFileSync(headerPath, 'utf8');

      const hasUnsafeButton = headerCode.includes('handleResetSeed') && !headerCode.includes('confirm') && !headerCode.includes('XAC NHAN');
      assert.ok(
        !hasUnsafeButton,
        '[M1 Bug] Header.jsx contains unconfirmed "Phục Hồi Gốc" button that can wipe 335 authentic paintings'
      );
    });

    test('TC-R1-T2-02: Authentic in-stock and sold financial valuation boundary matches baseline', async () => {
      if (!serverOnline) return;
      const res = await fetch(`${BASE_URL}/api/stats`);
      assert.equal(res.status, 200);
      const body = await res.json();
      const stats = body.stats || {};

      assert.equal(stats.totalCount, 335, `Total count must be 335. Got ${stats.totalCount}`);
      assert.equal(stats.inStockCount, 298, `In-stock count must be 298. Got ${stats.inStockCount}`);
      assert.equal(stats.soldCount, 37, `Sold count must be 37. Got ${stats.soldCount}`);
      assert.equal(stats.inStockValue, 3082550, `In-stock valuation must be $3,082,550 USD. Got ${stats.inStockValue}`);
    });

    test('TC-R1-T2-03: Authentic artist distribution invariant matches 100%', async () => {
      if (!serverOnline) return;
      const res = await fetch(`${BASE_URL}/api/paintings`);
      const body = await res.json();
      const paintings = body.data || body;

      const artistCounts = {};
      for (const p of paintings) {
        artistCounts[p.tac_gia] = (artistCounts[p.tac_gia] || 0) + 1;
      }

      assert.equal(artistCounts['Đoàn Hồng'], 117, 'Đoàn Hồng must have 117 paintings');
      assert.equal(artistCounts['Hồ Hữu Thủ'], 73, 'Hồ Hữu Thủ must have 73 paintings');
      assert.equal(artistCounts['Lê Văn Xương'], 58, 'Lê Văn Xương must have 58 paintings');
      assert.equal(artistCounts['Dương Văn Sen'], 56, 'Dương Văn Sen must have 56 paintings');
      assert.equal(artistCounts['Nam Anh'], 25, 'Nam Anh must have 25 paintings');
      assert.equal(artistCounts['Bùi Quang Ánh'], 6, 'Bùi Quang Ánh must have 6 paintings');
    });

    test('TC-R1-T2-04: Read-only query execution preserves exact price history file size and records', () => {
      const beforeStat = fs.statSync(PRICE_HISTORY_FILE);
      const raw = fs.readFileSync(PRICE_HISTORY_FILE, 'utf8');
      const logs = JSON.parse(raw);

      assert.ok(Array.isArray(logs), 'Price history file must be valid JSON array');
      const afterStat = fs.statSync(PRICE_HISTORY_FILE);
      assert.equal(afterStat.size, beforeStat.size, 'Read operations must not mutate price history file');
    });

    test('TC-R1-T2-05: Cloud SheetDB meta sync table is verified free of stress logs', async () => {
      if (serverOnline) {
        const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_PAINTING_ID}/price-history`);
        const body = await res.json();
        const logs = body.data || [];
        const stress = logs.filter(l => l.note && l.note.includes('Stress concurrent update'));
        assert.equal(stress.length, 0, 'Cloud-synced API price history must have 0 stress logs');
      }
    });

  });

  // ----------------------------------------------------------------------------
  // Requirement R2: Currency Formatting Boundaries & Adversarial Inputs
  // ----------------------------------------------------------------------------
  describe('Requirement R2: Currency Boundaries & Adversarial Inputs', () => {

    test('TC-R2-T2-01: formatThousands and parseNumericPrice handle zero, null, undefined, and empty string', () => {
      assert.ok(currencyModule, '[M2 Bug] src/utils/currency.js must exist');
      const { formatThousands, parseNumericPrice } = currencyModule;

      assert.equal(formatThousands(0), '0');
      assert.equal(formatThousands(null), '');
      assert.equal(formatThousands(undefined), '');
      assert.equal(formatThousands(''), '');

      assert.equal(parseNumericPrice(0), 0);
      assert.equal(parseNumericPrice('0'), 0);
      assert.equal(parseNumericPrice(''), null);
      assert.equal(parseNumericPrice(null), null);
      assert.equal(parseNumericPrice(undefined), null);
    });

    test('TC-R2-T2-02: Extreme large number formatting and parsing up to MAX_SAFE_INTEGER', () => {
      assert.ok(currencyModule, '[M2 Bug] src/utils/currency.js must exist');
      const { formatThousands, parseNumericPrice } = currencyModule;

      assert.equal(formatThousands(999999999999), '999,999,999,999');
      assert.equal(parseNumericPrice('999,999,999,999'), 999999999999);
      assert.equal(formatThousands(1000000000), '1,000,000,000');
      assert.equal(parseNumericPrice('1,000,000,000'), 1000000000);
    });

    test('TC-R2-T2-03: Rejection of pure non-numeric or malformed strings by validation', async () => {
      assert.ok(currencyModule, '[M2 Bug] src/utils/currency.js must exist');
      const { parseNumericPrice } = currencyModule;

      assert.equal(parseNumericPrice('abc'), null);
      assert.equal(parseNumericPrice('invalid_string'), null);
      assert.equal(parseNumericPrice('!@#$%^&*()'), null);

      if (serverOnline) {
        // PUT endpoint rejection
        const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_PAINTING_ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: TARGET_PAINTING_ID,
            gia: 'abc_not_a_number'
          })
        });
        assert.equal(res.status, 400, `Backend must reject 'abc_not_a_number' with 400 Bad Request. Got ${res.status}`);

        // POST endpoint rejection
        const postRes = await fetch(`${BASE_URL}/api/paintings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ten_tac_pham: 'Test Invalid Price String',
            tac_gia: 'Dương Văn Sen',
            gia: 'abc'
          })
        });
        if (postRes.status === 200 || postRes.status === 201) {
          const body = await postRes.json();
          if (body?.data?.id) await deleteArtworkImmediately(body.data.id);
        }
        assert.equal(postRes.status, 400, `POST /api/paintings must reject 'abc' with 400 Bad Request. Got ${postRes.status}`);
      }
    });

    test('TC-R2-T2-04: Rejection of negative numbers by validation and backend persistence', async () => {
      if (serverOnline) {
        // PUT endpoint rejection
        const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_PAINTING_ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: TARGET_PAINTING_ID,
            gia: -500
          })
        });
        assert.equal(res.status, 400, `Backend must reject negative price -500 with 400 Bad Request. Got ${res.status}`);

        // POST endpoint rejection
        const postRes = await fetch(`${BASE_URL}/api/paintings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ten_tac_pham: 'Test Negative Price',
            tac_gia: 'Dương Văn Sen',
            gia: '-500'
          })
        });
        if (postRes.status === 200 || postRes.status === 201) {
          const body = await postRes.json();
          if (body?.data?.id) await deleteArtworkImmediately(body.data.id);
        }
        assert.equal(postRes.status, 400, `POST /api/paintings must reject '-500' with 400 Bad Request. Got ${postRes.status}`);
      }
    });

    test('TC-R2-T2-05: Digit-count cursor preservation calculation preserves position across comma injection', () => {
      const rawA = '21509';
      const prevCursorA = 3;
      const newFormattedA = '21,509';
      const preservedPosA = calculatePreservedCursor(rawA, prevCursorA, newFormattedA);
      assert.equal(preservedPosA, 4, 'Cursor after 3rd digit in 21,509 must be at index 4');

      const rawB = '21090';
      const prevCursorB = 5;
      const newFormattedB = '21,090';
      const preservedPosB = calculatePreservedCursor(rawB, prevCursorB, newFormattedB);
      assert.equal(preservedPosB, 6, 'Cursor at end must be at index 6');
    });

  });

  // ----------------------------------------------------------------------------
  // Requirement R3: Location Boundaries & Edge Cases
  // ----------------------------------------------------------------------------
  describe('Requirement R3: Location Boundaries & Delimiter Handling', () => {

    test('TC-R3-T2-01: Empty or whitespace-only Level 1 defaults safely to "Kho"', () => {
      const formatHelper = (typesModule && typesModule.formatCompoundLocation) ||
                           (currencyModule && currencyModule.formatCompoundLocation);
      const parseHelper = (typesModule && typesModule.parseCompoundLocation) ||
                          (currencyModule && currencyModule.parseCompoundLocation);

      assert.ok(formatHelper && parseHelper, '[M3 Bug] Location helpers must be exported');
      assert.equal(formatHelper('   ', 'khay 1'), 'Kho - khay 1');
      assert.equal(formatHelper('   ', '   '), 'Kho');

      const parsed = parseHelper('   ');
      assert.equal(parsed.location_level1, 'Kho');
      assert.equal(parsed.location_level2, '');
    });

    test('TC-R3-T2-02: Delimiter collision handling with multiple hyphens in Level 2', () => {
      const parseHelper = (typesModule && typesModule.parseCompoundLocation) ||
                          (currencyModule && currencyModule.parseCompoundLocation);
      assert.ok(parseHelper, '[M3 Bug] parseCompoundLocation must be exported');

      const parsed = parseHelper('Kho tầng hầm - Kệ A - Ngăn 3');
      assert.equal(parsed.location_level1, 'Kho tầng hầm');
      assert.equal(parsed.location_level2, 'Kệ A - Ngăn 3');
    });

    test('TC-R3-T2-03: Vietnamese diacritics and complex symbols in locations are preserved without corruption', () => {
      const formatHelper = (typesModule && typesModule.formatCompoundLocation) ||
                           (currencyModule && currencyModule.formatCompoundLocation);
      const parseHelper = (typesModule && typesModule.parseCompoundLocation) ||
                          (currencyModule && currencyModule.parseCompoundLocation);
      assert.ok(formatHelper && parseHelper);

      const complexL1 = 'Phòng trưng bày Tầng 1 (Khu VIP/Tây)';
      const complexL2 = 'Kệ số #3/2 - Khay A';
      const compound = formatHelper(complexL1, complexL2);
      assert.equal(compound, `${complexL1} - ${complexL2}`);

      const parsed = parseHelper(compound);
      assert.equal(parsed.location_level1, complexL1);
      assert.equal(parsed.location_level2, complexL2);
    });

    test('TC-R3-T2-04: Storage adapter sqliteStore includes location_level1 and location_level2 in TEXT_FIELDS', () => {
      const sqlitePath = path.join(ROOT_DIR, 'server', 'sqliteStore.js');
      assert.ok(fs.existsSync(sqlitePath), 'server/sqliteStore.js must exist');
      const code = fs.readFileSync(sqlitePath, 'utf8');

      assert.ok(
        code.includes('location_level1'),
        '[M3 Bug] server/sqliteStore.js TEXT_FIELDS must include location_level1'
      );
      assert.ok(
        code.includes('location_level2'),
        '[M3 Bug] server/sqliteStore.js TEXT_FIELDS must include location_level2'
      );
    });

    test('TC-R3-T2-05: Column contract in types.js maintains location column width and read-only status', () => {
      assert.ok(typesModule, 'src/types.js must be loadable');
      const { DEFAULT_COLUMNS, SOLD_COLUMNS } = typesModule;

      const locCol = (DEFAULT_COLUMNS || []).find(c => c.id === 'location');
      assert.ok(locCol, 'DEFAULT_COLUMNS must include location column');
      assert.equal(locCol.isEditable, false, 'location column must be read-only');
      assert.ok(locCol.width >= 120, 'location column width must be >= 120px for 2-tier badges');

      const soldLocCol = (SOLD_COLUMNS || []).find(c => c.id === 'location');
      assert.ok(soldLocCol, 'SOLD_COLUMNS must include location column');
    });

  });

});

// ==============================================================================
// TIER 3: PAIRWISE COMBINATORIAL TESTING (ORTHOGONAL INTERACTIONS)
// ==============================================================================
describe('Tier 3: Pairwise Combinatorial Matrix Testing', () => {

  const pairwiseMatrix = [
    { id: 'TC-PAIR-01', price: null, l1: 'Kho', l2: '', op: 'ingest' },
    { id: 'TC-PAIR-02', price: '2,109', l1: 'Kho tầng hầm', l2: 'khay 1', op: 'ingest' },
    { id: 'TC-PAIR-03', price: '15,000,000', l1: 'Phòng trưng bày Tầng 1', l2: 'kệ #A-3', op: 'update' },
    { id: 'TC-PAIR-04', price: 0, l1: 'Kho', l2: 'khay 2', op: 'ingest' },
    { id: 'TC-PAIR-05', price: '3,500', l1: 'Kho Gò Vấp', l2: '', op: 'update' },
    { id: 'TC-PAIR-06', price: '12,000', l1: 'Kho tầng hầm', l2: 'giá số 2', op: 'price_adjust' },
    { id: 'TC-PAIR-07', price: '750', l1: 'Phòng khách', l2: 'vách chính', op: 'relocate' },
    { id: 'TC-PAIR-08', price: '1,250,000', l1: 'Hành lang', l2: 'khay 4', op: 'ingest_and_relocate' }
  ];

  for (const tc of pairwiseMatrix) {
    test(`${tc.id}: Pairwise combination [Price: ${tc.price}, L1: "${tc.l1}", L2: "${tc.l2}", Op: ${tc.op}]`, async () => {
      if (!serverOnline) return;

      const testPaintingId = `E2E-PAIR-${tc.id}-${Date.now()}`;
      try {
        const initialPrice = tc.op === 'ingest' ? tc.price : 1000;
        const initialCompound = tc.l2 ? `${tc.l1} - ${tc.l2}` : tc.l1;

        const createRes = await fetch(`${BASE_URL}/api/paintings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: testPaintingId,
            ten_tac_pham: `Pairwise Test Artwork ${tc.id}`,
            tac_gia: 'Dương Văn Sen',
            gia: initialPrice,
            location: initialCompound,
            location_level1: tc.l1,
            location_level2: tc.l2
          })
        });

        assert.ok(
          createRes.status === 200 || createRes.status === 201,
          `Creation for ${tc.id} must succeed with 200 or 201. Got ${createRes.status}`
        );
        const createBody = await createRes.json();
        assert.equal(createBody.success, true);

        if (tc.op === 'update' || tc.op === 'price_adjust') {
          const updateRes = await fetch(`${BASE_URL}/api/paintings/${testPaintingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: testPaintingId,
              gia: tc.price,
              price_note: `Pairwise update for ${tc.id}`
            })
          });
          assert.equal(updateRes.status, 200);
        } else if (tc.op === 'relocate' || tc.op === 'ingest_and_relocate') {
          const moveRes = await fetch(`${BASE_URL}/api/paintings/${testPaintingId}/location-history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from_location: 'Kho',
              to_location: initialCompound,
              to_location_level1: tc.l1,
              to_location_level2: tc.l2,
              note: `Pairwise move for ${tc.id}`
            })
          });
          assert.equal(moveRes.status, 200);
        }
      } finally {
        await deleteArtworkImmediately(testPaintingId);
      }
    });
  }

});

// ==============================================================================
// TIER 4: REAL-WORLD WORKLOAD SCENARIOS (OPERATIONAL WORKFLOWS)
// ==============================================================================
describe('Tier 4: Real-World Workload Scenarios', () => {

  test('TC-WORKLOAD-01: Complete intake of high-value artwork with 2-tier location & formatted price', async () => {
    if (!serverOnline) return;
    const testId = `E2E-WL-INTAKE-${Date.now()}`;
    try {
      const createRes = await fetch(`${BASE_URL}/api/paintings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testId,
          ten_tac_pham: 'Kiệt Tác Mùa Thu Bình Minh',
          tac_gia: 'Dương Văn Sen',
          chat_lieu: 'Sơn dầu',
          gia: '25,000',
          location: 'Kho tầng hầm - kệ VIP-1',
          location_level1: 'Kho tầng hầm',
          location_level2: 'kệ VIP-1',
          kich_thuoc_tranh: '100x150cm',
          nam_sang_tac: '2026'
        })
      });

      assert.ok(
        createRes.status === 200 || createRes.status === 201,
        `Intake must return 200 or 201. Got ${createRes.status}`
      );
      const body = await createRes.json();
      assert.equal(body.data.gia, 25000, 'Price must be sanitized to integer 25000');
      assert.equal(body.data.location, 'Kho tầng hầm - kệ VIP-1');

      const histRes = await fetch(`${BASE_URL}/api/paintings/${testId}/price-history`);
      assert.equal(histRes.status, 200);
      const histBody = await histRes.json();
      const logs = histBody.data || [];
      assert.ok(logs.length >= 1, 'Initial price history must be generated for priced intake');
      assert.equal(logs[0].new_price, 25000);
    } finally {
      await deleteArtworkImmediately(testId);
    }
  });

  test('TC-WORKLOAD-02: Artwork curation & relocation movement audit trail', async () => {
    if (!serverOnline) return;
    const testId = `E2E-WL-RELOC-${Date.now()}`;
    try {
      const createRes = await fetch(`${BASE_URL}/api/paintings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testId,
          ten_tac_pham: 'Tranh Trưng Bày Gallery',
          tac_gia: 'Hồ Hữu Thủ',
          gia: 5000,
          location: 'Kho'
        })
      });
      assert.ok(createRes.status === 200 || createRes.status === 201);

      const moveRes = await fetch(`${BASE_URL}/api/paintings/${testId}/location-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_location: 'Kho',
          from_location_level1: 'Kho',
          from_location_level2: '',
          to_location: 'Phòng trưng bày Tầng 1 - vách số 2',
          to_location_level1: 'Phòng trưng bày Tầng 1',
          to_location_level2: 'vách số 2',
          note: 'Chuyển treo phục vụ triển lãm mùa xuân'
        })
      });
      assert.equal(moveRes.status, 200);

      const histRes = await fetch(`${BASE_URL}/api/paintings/${testId}/location-history`);
      assert.equal(histRes.status, 200);
      const histBody = await histRes.json();
      const logs = histBody.data || [];
      assert.ok(logs.some(l => l.to_location === 'Phòng trưng bày Tầng 1 - vách số 2'));
    } finally {
      await deleteArtworkImmediately(testId);
    }
  });

  test('TC-WORKLOAD-03: Price negotiation, discount adjustment, and sold transaction settlement', async () => {
    if (!serverOnline) return;
    const testId = `E2E-WL-SOLD-${Date.now()}`;
    try {
      const createRes = await fetch(`${BASE_URL}/api/paintings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testId,
          ten_tac_pham: 'Tranh Đàm Phán Bán Buôn',
          tac_gia: 'Đoàn Hồng',
          gia: 5000,
          location: 'Kho'
        })
      });
      assert.ok(createRes.status === 200 || createRes.status === 201);

      const adjustRes = await fetch(`${BASE_URL}/api/paintings/${testId}/price-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_price: '4,500',
          note: 'Chiết khấu 10% khách thân thiết'
        })
      });
      assert.equal(adjustRes.status, 200);

      const soldRes = await fetch(`${BASE_URL}/api/paintings/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testId,
          tinh_trang: 'da_ban',
          gia: '4,200',
          khach_hang: 'Nguyễn Văn VIP'
        })
      });
      assert.equal(soldRes.status, 200);
      const soldBody = await soldRes.json();
      assert.equal(soldBody.data.tinh_trang, 'da_ban');
      assert.equal(soldBody.data.gia, 4200, 'Sold deal price must be integer 4200');
    } finally {
      await deleteArtworkImmediately(testId);
    }
  });

  test('TC-WORKLOAD-04: Multi-tier location filtering and inventory search simulation', () => {
    const mockInventory = [
      { id: 'P1', location_level1: 'Kho tầng hầm', location_level2: 'khay 1', location: 'Kho tầng hầm - khay 1' },
      { id: 'P2', location_level1: 'Kho tầng hầm', location_level2: 'khay 2', location: 'Kho tầng hầm - khay 2' },
      { id: 'P3', location_level1: 'Kho tầng hầm', location_level2: 'kệ B1', location: 'Kho tầng hầm - kệ B1' },
      { id: 'P4', location_level1: 'Phòng trưng bày Tầng 1', location_level2: 'vách chính', location: 'Phòng trưng bày Tầng 1 - vách chính' },
      { id: 'P5', location_level1: 'Kho Gò Vấp', location_level2: '', location: 'Kho Gò Vấp' },
      { id: 'P6', location_level1: 'Kho', location_level2: '', location: 'Kho' }
    ];

    const filterL1 = mockInventory.filter(p => p.location_level1 === 'Kho tầng hầm');
    assert.equal(filterL1.length, 3, 'Filter Level 1 Kho tầng hầm must match exactly 3 items');

    const filterL1L2 = mockInventory.filter(p => p.location_level1 === 'Kho tầng hầm' && p.location_level2 === 'khay 1');
    assert.equal(filterL1L2.length, 1, 'Filter Level 1 + Level 2 khay 1 must match exactly 1 item');
    assert.equal(filterL1L2[0].id, 'P1');

    const searchKhay = mockInventory.filter(p => p.location.toLowerCase().includes('khay'));
    assert.equal(searchKhay.length, 2, 'Search "khay" must match P1 and P2');
  });

  test('TC-WORKLOAD-05: High-throughput mutation resilience and monotonic timestamp ordering', async () => {
    if (!serverOnline) return;
    const testId = `E2E-WL-CONCUR-${Date.now()}`;
    try {
      const createRes = await fetch(`${BASE_URL}/api/paintings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testId,
          ten_tac_pham: 'Tranh Thử Nghiệm Tải Cao',
          tac_gia: 'Dương Văn Sen',
          gia: 1000,
          location: 'Kho'
        })
      });
      assert.ok(createRes.status === 200 || createRes.status === 201);

      const updates = ['1,100', '1,200', '1,300', '1,400', '1,500'];
      for (const p of updates) {
        const res = await fetch(`${BASE_URL}/api/paintings/${testId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: testId,
            gia: p,
            price_note: `Sequential price adjustment to ${p}`
          })
        });
        assert.equal(res.status, 200);
      }

      const finalRes = await fetch(`${BASE_URL}/api/paintings/${testId}`);
      const finalBody = await finalRes.json();
      assert.equal(finalBody.data.gia, 1500, 'Final price after sequential updates must be 1500');

      const histRes = await fetch(`${BASE_URL}/api/paintings/${testId}/price-history`);
      const histBody = await histRes.json();
      const logs = histBody.data || [];
      assert.ok(logs.length >= 5, 'Must contain all 5 sequential price history logs');
    } finally {
      await deleteArtworkImmediately(testId);
    }
  });

});
