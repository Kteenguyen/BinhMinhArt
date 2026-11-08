// test/price-history-adversarial.test.mjs
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.TEST_URL || 'https://localhost:5001';
const PRICE_HISTORY_FILE = path.join(ROOT_DIR, 'data', 'price_history.json');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const TARGET_ID = 'DVS-SD-01';

function getTodayDateVN() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

describe('Adversarial Stress & Edge Case Test Suite for Price History & Auto-Date', async () => {

  let initialHistoryLogs = null;
  let initialMaxLogId = 0;
  let initialPaintingState = null;

  before(async () => {
    const res = await fetch(`${BASE_URL}/api/network-info`);
    assert.equal(res.status, 200, 'Server must be online');

    const pRes = await fetch(`${BASE_URL}/api/paintings`);
    const pData = await pRes.json();
    initialPaintingState = pData.data.find(p => p.id === TARGET_ID);

    if (fs.existsSync(PRICE_HISTORY_FILE)) {
      try {
        const raw = fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8');
        initialHistoryLogs = JSON.parse(raw);
        initialMaxLogId = initialHistoryLogs.reduce((max, l) => Math.max(max, Number(l.id) || 0), 0);
      } catch (_) {}
    }
  });

  after(async () => {
    // 1. Unconditional 2-Step Baseline Restoration for DVS-SD-01
    // Step 1a: Enforce authentic price 1500
    // Step 1b: Enforce authentic baseline dates ('09-01-2026') with priceChanged = false
    try {
      const putPriceRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: TARGET_ID,
          gia: 1500
        })
      });
      assert.equal(putPriceRes.status, 200, 'Teardown Step 1a: Price must be set to 1500');

      const putDateRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: TARGET_ID,
          gia: 1500,
          ngay_cap_nhat_gia_gan_nhat: '09-01-2026',
          ngay_cap_nhat_san_pham: '09-01-2026'
        })
      });
      assert.equal(putDateRes.status, 200, 'Teardown Step 1b: Baseline date must be set to 09-01-2026');
    } catch (err) {
      console.error('[Adversarial Teardown] Critical error during painting restoration:', err.message);
      throw err;
    }

    // 2. Purge all test-created logs from data/price_history.json
    // Strictly preserve baseline log (id: 1) and authentic manual adjustments (id: 1045, 1046)
    if (fs.existsSync(PRICE_HISTORY_FILE)) {
      try {
        const currentLogs = JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8'));
        const testPatterns = [
          'Stress concurrent update',
          'Concurrent direct POST',
          'Tặng tranh tri ân',
          'Giá thập phân',
          'Định giá tác phẩm kiệt tác',
          'Testing stale date override',
          'Regression shield probe',
          'Điều chỉnh giá tác phẩm'
        ];

        const cleanedLogs = currentLogs.filter(log => {
          if (String(log.painting_id) !== TARGET_ID) return true;
          if (log.note === 'Khởi tạo mốc giá ban đầu') return true;
          if (log.id === 1045 || log.id === 1046) return true;
          if (initialMaxLogId > 0 && log.id <= initialMaxLogId) {
            const isTestPattern = testPatterns.some(p => log.note && log.note.includes(p));
            return !isTestPattern;
          }
          return false;
        });

        const tmpFile = `${PRICE_HISTORY_FILE}.tmp.${Date.now()}`;
        fs.writeFileSync(tmpFile, JSON.stringify(cleanedLogs, null, 2), 'utf-8');
        fs.renameSync(tmpFile, PRICE_HISTORY_FILE);
      } catch (err) {
        console.error('[Adversarial Teardown] Failed to clean price_history.json:', err.message);
        throw err;
      }
    }

    // 3. Trigger server cache reload and await cloud writeQueue drain
    const reloadRes = await fetch(`${BASE_URL}/api/price-history/reload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(reloadRes.status, 200, 'Teardown Step 3: /api/price-history/reload must succeed');

    // 4. Post-Teardown Invariant Verification
    const verifyRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`);
    assert.equal(verifyRes.status, 200);
    const verifyData = (await verifyRes.json()).data;
    assert.equal(verifyData.gia, 1500, 'Teardown Invariant: DVS-SD-01 price must be exactly 1500');
    assert.equal(verifyData.ngay_cap_nhat_gia_gan_nhat, '09-01-2026', 'Teardown Invariant: date must be 09-01-2026');

    const statsRes = await fetch(`${BASE_URL}/api/stats`);
    assert.equal(statsRes.status, 200);
    const statsData = (await statsRes.json()).stats;
    assert.equal(statsData.totalCount, 335, 'Teardown Invariant: total paintings must be 335');
    assert.equal(statsData.inStockValue, 3082550, 'Teardown Invariant: valuation must be $3,082,550');
  });

  // ==========================================================================
  // SECTION 1: CONCURRENCY & RACE CONDITIONS
  // ==========================================================================
  await test('ADV-1.1: Rapid concurrent PUT price updates on same painting preserve ID sequence and avoid corruption', async () => {
    const concurrentCount = 15;
    const basePrice = 2100;

    const promises = Array.from({ length: concurrentCount }, (_, i) => {
      const price = basePrice + i;
      return fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: TARGET_ID,
          gia: price,
          price_note: `Stress concurrent update #${i + 1} (${price})`
        })
      }).then(r => r.json());
    });

    const results = await Promise.all(promises);
    assert.equal(results.length, concurrentCount);

    for (const r of results) {
      assert.equal(r.success, true);
    }

    const diskContent = fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8');
    const logs = JSON.parse(diskContent);
    assert.ok(Array.isArray(logs));

    const idSet = new Set();
    const duplicateIds = [];
    for (const log of logs) {
      if (idSet.has(log.id)) {
        duplicateIds.push(log.id);
      }
      idSet.add(log.id);
    }
    assert.deepEqual(duplicateIds, [], 'All IDs in disk store must be unique');

    const dataFiles = fs.readdirSync(DATA_DIR);
    const strayTmpFiles = dataFiles.filter(f => f.startsWith('.price_history') && f.endsWith('.tmp'));
    assert.deepEqual(strayTmpFiles, [], 'Zero stray .tmp files after concurrent updates');
  });

  await test('ADV-1.2: Rapid concurrent POST to /price-history maintains strictly unique IDs', async () => {
    const count = 10;
    const promises = Array.from({ length: count }, (_, i) => {
      return fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_price: 3000 + i,
          new_price: 3000 + i + 1,
          note: `Concurrent direct POST #${i + 1}`
        })
      }).then(r => r.json());
    });

    const results = await Promise.all(promises);
    for (const r of results) {
      assert.equal(r.success, true);
    }

    const diskLogs = JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8'));
    const allIds = diskLogs.map(l => l.id);
    const uniqueIds = new Set(allIds);
    assert.equal(allIds.length, uniqueIds.size);
  });

  // ==========================================================================
  // SECTION 2: BOUNDARY INPUT TESTING
  // ==========================================================================
  await test('ADV-2.1: Price = 0 (Free / Zero-Price) is accepted and logged correctly', async () => {
    const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: TARGET_ID,
        gia: 0,
        price_note: 'Tặng tranh tri ân (giá 0 USD)'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.gia, 0);

    const histRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`);
    const histBody = await histRes.json();
    assert.equal(histBody.data[0].new_price, 0);
  });

  await test('ADV-2.2: Negative prices are strictly rejected with 400 Bad Request', async () => {
    const negativeTestCases = [-1, -0.01, -999999, -1e10];

    for (const neg of negativeTestCases) {
      const putRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: TARGET_ID, gia: neg })
      });
      assert.equal(putRes.status, 400, `PUT with negative price ${neg} must return 400`);

      const postRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_price: neg })
      });
      assert.equal(postRes.status, 400, `POST with negative price ${neg} must return 400`);
    }
  });

  await test('ADV-2.3: Decimals and floating point values are handled cleanly', async () => {
    const floatPrice = 1750.75;
    const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: TARGET_ID,
        gia: floatPrice,
        price_note: 'Giá thập phân đấu giá quốc tế'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.gia, floatPrice);

    const histRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`);
    const hist = (await histRes.json()).data;
    assert.equal(hist[0].new_price, floatPrice);
  });

  await test('ADV-2.4: Large numeric prices (high valuation) are preserved without overflow', async () => {
    const largePrice = 50000000;
    const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: TARGET_ID,
        gia: largePrice,
        price_note: 'Định giá tác phẩm kiệt tác'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.gia, largePrice);
  });

  // ==========================================================================
  // SECTION 3: STALE DATE OVERRIDE ENFORCEMENT
  // ==========================================================================
  await test('ADV-3.1: Stale ancient date in payload is strictly overridden with today when price changes', async () => {
    await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: TARGET_ID, gia: 1500, ngay_cap_nhat_gia_gan_nhat: '09-01-2026' })
    });

    const ancientDates = ['01-01-2000', '1999-12-31', '15-08-1980', '01/01/2000'];
    const todayVN = getTodayDateVN();

    for (let idx = 0; idx < ancientDates.length; idx++) {
      const staleDate = ancientDates[idx];
      const newPrice = 1600 + (idx + 1) * 50;
      const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: TARGET_ID,
          gia: newPrice,
          ngay_cap_nhat_gia_gan_nhat: staleDate,
          price_note: `Testing stale date override for ${staleDate}`
        })
      });

      assert.equal(res.status, 200);
      const data = (await res.json()).data;
      assert.notEqual(data.ngay_cap_nhat_gia_gan_nhat, staleDate);
      assert.equal(data.ngay_cap_nhat_gia_gan_nhat, todayVN);

      const hRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`);
      const hLogs = (await hRes.json()).data;
      assert.equal(hLogs[0].date, todayVN);
    }
  });

  // ==========================================================================
  // SECTION 4: NON-EXISTENT PAINTING ID HANDLING & RESILIENCE
  // ==========================================================================
  await test('ADV-4.1: PUT on non-existent painting ID returns 404 without crashing', async () => {
    const nonExistentIds = [
      'GHOST-PAINTING-9999',
      'NON_EXISTENT_ID',
      'UNKNOWN-ARTIST-01',
      '../../../etc/passwd',
      '<script>alert(1)</script>'
    ];

    for (const ghostId of nonExistentIds) {
      const res = await fetch(`${BASE_URL}/api/paintings/${encodeURIComponent(ghostId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ghostId, gia: 2000 })
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
    }

    const ping = await fetch(`${BASE_URL}/api/network-info`);
    assert.equal(ping.status, 200);
  });

  await test('ADV-4.2: GET /price-history on non-existent painting ID returns empty array gracefully', async () => {
    const res = await fetch(`${BASE_URL}/api/paintings/GHOST-NONEXISTENT-PID/price-history`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.data, []);
  });

  // ==========================================================================
  // SECTION 5: EMPIRICAL DEFECT PROBES (BUGS DISCOVERED)
  // ==========================================================================
  await test('ADV-5.1 [REGRESSION SHIELD]: POST /price-history on non-existent painting ID returns 404 Not Found', async () => {
    const ghostId = 'GHOST-DEFECT-PID-999';
    const res = await fetch(`${BASE_URL}/api/paintings/${ghostId}/price-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_price: 9999, note: 'Regression shield probe' })
    });

    const status = res.status;
    const body = await res.json();

    assert.equal(status, 404, 'POST to price-history for ghost ID must return 404 Not Found');
    assert.equal(body.success, false, 'Body success must be false');
  });

  await test('ADV-5.2 [REGRESSION SHIELD]: POST /price-history with non-numeric string returns 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_price: 'invalid_price_string', note: 'Regression shield invalid string' })
    });

    const status = res.status;
    const body = await res.json();

    assert.equal(status, 400, 'POST with non-numeric new_price must return 400 Bad Request');
    assert.equal(body.success, false, 'Body success must be false');
  });
});
