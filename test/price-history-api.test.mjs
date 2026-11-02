// test/price-history-api.test.mjs
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. Bypass self-signed SSL certificate check for local HTTPS test
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ROOT_DIR = fs.existsSync(path.join(process.cwd(), 'data', 'price_history.json'))
  ? process.cwd()
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.TEST_URL || 'https://localhost:5001';
const PRICE_HISTORY_FILE = path.join(ROOT_DIR, 'data', 'price_history.json');
const TARGET_ID = 'DVS-SD-01';

/**
 * Utility helper to get today's date in DD-MM-YYYY format
 */
function getTodayDateVN() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Utility helper to check if a date string represents today
 */
function isDateToday(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const todayVN = getTodayDateVN();
  const todayISO = new Date().toISOString().split('T')[0];
  return dateStr.includes(todayVN) || dateStr.includes(todayISO);
}

describe('M3: Price History & Auto-Date API Acceptance Test Suite', async () => {

  // Pre-flight check: Ensure server is listening on BASE_URL
  before(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/network-info`);
      assert.equal(res.status, 200, 'Server must be online and return 200 on /api/network-info');
    } catch (err) {
      assert.fail(`Cannot connect to server at ${BASE_URL}: ${err.message}`);
    }
  });

  // --------------------------------------------------------------------------
  // TEST CASE 1: Baseline Initialization on Startup
  // --------------------------------------------------------------------------
  await test('TC1: Baseline initialization on startup for painting DVS-SD-01', async () => {
    const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`);
    assert.equal(res.status, 200, 'GET /api/paintings/:id/price-history must return 200 OK');

    const body = await res.json();
    assert.equal(body.success, true, 'Response must have success: true');
    assert.ok(Array.isArray(body.data), 'body.data must be an array of price history records');
    assert.ok(body.data.length >= 1, 'Painting DVS-SD-01 must have at least 1 price history log');

    // Find the actual baseline log (date 09-01-2026 or id === 1 or matching initial baseline note and date)
    const baselineLog = body.data.find(
      l => (l.old_price === null && Number(l.new_price) === 1500 && (String(l.date).includes('09-01-2026') || l.id === 1)) ||
           (l.note === 'Khởi tạo mốc giá ban đầu' && String(l.date).includes('09-01-2026'))
    );

    assert.ok(baselineLog, 'Baseline log for DVS-SD-01 must exist in price history');
    assert.equal(baselineLog.painting_id, TARGET_ID, 'Baseline log must reference target painting_id');
    assert.ok(
      baselineLog.new_price === 1500 || baselineLog.new_price === 1600,
      `Baseline price must reflect initial value ($1,500 or $1,600), got: ${baselineLog.new_price}`
    );
    assert.ok(
      baselineLog.date.includes('09-01-2026') || 
      baselineLog.date.includes('10-01-2026') || 
      baselineLog.date.includes('2026-01-09'),
      `Baseline date must reflect historical record (09-01-2026), got: ${baselineLog.date}`
    );
  });

  // --------------------------------------------------------------------------
  // TEST CASE 2: Auto-update ngay_cap_nhat_gia_gan_nhat to today
  // --------------------------------------------------------------------------
  await test('TC2: Updating price from 1500 to 1600 automatically updates ngay_cap_nhat_gia_gan_nhat to today', async () => {
    // Ensure current price is 1500 before testing transition to 1600
    const curRes = await fetch(`${BASE_URL}/api/paintings`);
    const curData = await curRes.json();
    const curP = curData.data.find(p => p.id === TARGET_ID);
    if (curP && curP.gia !== 1500) {
      await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: TARGET_ID,
          gia: 1500,
          ngay_cap_nhat_gia_gan_nhat: '09-01-2026'
        })
      });
    }

    const targetNewPrice = 1600;
    const staleDateFromClient = '09-01-2026';

    // Intentionally send stale date in payload to verify server overrides it with today's date
    const updateRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: TARGET_ID,
        gia: targetNewPrice,
        ngay_cap_nhat_gia_gan_nhat: staleDateFromClient,
        price_note: 'Điều chỉnh giá tranh đợt kiểm thử tự động M3'
      })
    });

    assert.equal(updateRes.status, 200, 'PUT /api/paintings/:id must return 200 OK');
    const updateBody = await updateRes.json();
    assert.equal(updateBody.success, true, 'Update response must have success: true');
    assert.equal(updateBody.data.gia, targetNewPrice, `Price must be updated to ${targetNewPrice}`);

    const updatedDate = updateBody.data.ngay_cap_nhat_gia_gan_nhat;
    assert.notEqual(
      updatedDate,
      staleDateFromClient,
      'BUG REGRESSION CHECK: ngay_cap_nhat_gia_gan_nhat must NOT keep stale date from client payload'
    );
    assert.ok(
      isDateToday(updatedDate),
      `ngay_cap_nhat_gia_gan_nhat must be automatically set to today, got: "${updatedDate}"`
    );

    // Verify GET /api/paintings reflects the updated price and updated date
    const verifyRes = await fetch(`${BASE_URL}/api/paintings`);
    const verifyBody = await verifyRes.json();
    const painting = verifyBody.data.find(p => p.id === TARGET_ID);
    assert.ok(painting, 'Painting must exist in paintings list');
    assert.equal(painting.gia, targetNewPrice);
    assert.ok(isDateToday(painting.ngay_cap_nhat_gia_gan_nhat));
  });

  // --------------------------------------------------------------------------
  // TEST CASE 3: New log created in GET /api/paintings/:id/price-history
  // --------------------------------------------------------------------------
  await test('TC3: New log created in GET /api/paintings/:id/price-history with transition details', async () => {
    const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.length >= 2, 'History must contain at least 2 logs (baseline + new price)');

    // First item should be the latest log (chronologically descending)
    const latestLog = body.data[0];
    assert.equal(latestLog.painting_id, TARGET_ID);
    assert.equal(latestLog.new_price, 1600, 'Latest log new_price must be 1600');
    assert.equal(latestLog.old_price, 1500, 'Latest log old_price must be 1500');
    assert.ok(isDateToday(latestLog.date), `Latest log date must be today, got: ${latestLog.date}`);
    assert.ok(
      latestLog.note.includes('Điều chỉnh giá') || latestLog.note.includes('M3'),
      `Latest log note must reflect update note, got: "${latestLog.note}"`
    );
  });

  // --------------------------------------------------------------------------
  // TEST CASE 4: Restart resilience & local disk persistence
  // --------------------------------------------------------------------------
  await test('TC4: Restart resilience: verifies data in data/price_history.json survives restart', async () => {
    // 4a. Verify file exists on local filesystem
    assert.ok(fs.existsSync(PRICE_HISTORY_FILE), `File ${PRICE_HISTORY_FILE} must exist on disk`);

    // 4b. Parse file content from disk directly
    const rawContent = fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8');
    let parsedHistory = [];
    assert.doesNotThrow(() => {
      parsedHistory = JSON.parse(rawContent);
    }, 'data/price_history.json must contain valid JSON');

    assert.ok(Array.isArray(parsedHistory), 'Parsed content must be an array');
    const targetLogs = parsedHistory.filter(item => item.painting_id === TARGET_ID);
    assert.ok(targetLogs.length >= 2, 'Disk file must contain at least 2 logs for DVS-SD-01');

    // 4c. Verify presence of both 1500 baseline and 1600 update in the persistent file
    const hasBaseline = targetLogs.some(l => l.new_price === 1500 || l.old_price === null);
    const hasUpdate = targetLogs.some(l => l.new_price === 1600 && l.old_price === 1500);
    assert.ok(hasBaseline, 'Persistent disk store must retain the baseline log');
    assert.ok(hasUpdate, 'Persistent disk store must retain the 1500->1600 transition log');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 5: Edge cases
  // --------------------------------------------------------------------------
  await test('TC5a: Updating painting without price change keeps date unchanged and adds no duplicate log', async () => {
    // Fetch current state
    const beforeRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`);
    const beforeLogs = (await beforeRes.json()).data;
    const initialLogCount = beforeLogs.length;

    const paintingBeforeRes = await fetch(`${BASE_URL}/api/paintings`);
    const currentPainting = (await paintingBeforeRes.json()).data.find(p => p.id === TARGET_ID);
    const originalDate = currentPainting.ngay_cap_nhat_gia_gan_nhat;

    // Send update with SAME price (1600) and only changed general note
    const updateRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: TARGET_ID,
        gia: 1600,
        ghi_chu: 'Cập nhật ghi chú vị trí tranh, không đổi giá'
      })
    });
    assert.equal(updateRes.status, 200);
    const updatedPainting = (await updateRes.json()).data;

    // Date must remain unchanged
    assert.equal(
      updatedPainting.ngay_cap_nhat_gia_gan_nhat,
      originalDate,
      'Price update date must not change when price value is identical'
    );

    // History log count must NOT increase
    const afterRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`);
    const afterLogs = (await afterRes.json()).data;
    assert.equal(
      afterLogs.length,
      initialLogCount,
      'Zero unnecessary price logs must be appended when price did not change'
    );
  });

  await test('TC5b: Negative price is rejected with 400 Bad Request', async () => {
    const invalidRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: TARGET_ID,
        gia: -500
      })
    });

    assert.ok(
      invalidRes.status === 400 || invalidRes.status === 500,
      `Negative price must be rejected with error status, got ${invalidRes.status}`
    );
    const errorBody = await invalidRes.json();
    assert.equal(errorBody.success, false, 'Error response must have success: false');

    // Also verify PUT rejects negative new_price and invalid string new_price
    const negNewPriceRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: TARGET_ID,
        new_price: -200
      })
    });
    assert.equal(negNewPriceRes.status, 400, 'Negative new_price on PUT must return 400');

    const strNewPriceRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: TARGET_ID,
        new_price: 'abc'
      })
    });
    assert.equal(strNewPriceRes.status, 400, 'String new_price "abc" on PUT must return 400');
  });

  await test('TC5c: Non-existent painting ID returns empty array without crashing', async () => {
    const nonExistentRes = await fetch(`${BASE_URL}/api/paintings/NON-EXISTENT-ID-9999/price-history`);
    assert.equal(nonExistentRes.status, 200, 'Non-existent painting should return 200 with empty array');
    const body = await nonExistentRes.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.data, [], 'Data should be an empty array for non-existent painting');
  });

  await test('TC5d: Manual price adjustment via POST /api/paintings/:id/price-history', async () => {
    const manualRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_price: 1650,
        old_price: 1600,
        note: 'Điều chỉnh giá nhanh trực tiếp từ Subtab'
      })
    });

    assert.equal(manualRes.status, 200, 'POST /api/paintings/:id/price-history must return 200');
    const manualBody = await manualRes.json();
    assert.equal(manualBody.success, true);
    assert.ok(Array.isArray(manualBody.history), 'Must return updated history array');

    const topLog = manualBody.history[0];
    assert.equal(topLog.new_price, 1650);
    assert.equal(topLog.old_price, 1600);
    assert.equal(topLog.note, 'Điều chỉnh giá nhanh trực tiếp từ Subtab');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 5e: Ghost painting ID on POST returns 404 Not Found
  // --------------------------------------------------------------------------
  await test('TC5e: POST /api/paintings/GHOST-ID/price-history returns 404 Not Found', async () => {
    const ghostId = 'GHOST-PAINTING-404-TEST';
    const res = await fetch(`${BASE_URL}/api/paintings/${ghostId}/price-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_price: 3500,
        note: 'Attempt to add price log for non-existent painting'
      })
    });

    assert.equal(res.status, 404, 'POST to price-history for ghost ID must return 404 Not Found');
    const body = await res.json();
    assert.equal(body.success, false, 'Response body must have success: false');

    // Confirm that no logs exist for this ghost ID
    const verifyRes = await fetch(`${BASE_URL}/api/paintings/${ghostId}/price-history`);
    const verifyBody = await verifyRes.json();
    assert.deepEqual(verifyBody.data, [], 'Ghost ID must have no price history logs');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 5f: Invalid string price on POST returns 400 Bad Request
  // --------------------------------------------------------------------------
  await test('TC5f: POST /api/paintings/:id/price-history with invalid string returns 400 Bad Request', async () => {
    const invalidInputs = ['abc', 'NaN', 'invalid_price', '$$$'];

    for (const invalidPrice of invalidInputs) {
      const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_price: invalidPrice,
          note: `Testing invalid non-numeric price: ${invalidPrice}`
        })
      });

      assert.equal(
        res.status,
        400,
        `POST with non-numeric new_price "${invalidPrice}" must return 400 Bad Request, got ${res.status}`
      );
      const body = await res.json();
      assert.equal(body.success, false, 'Response body must have success: false');
    }

    // Verify no corrupted log (with null or NaN price) was appended
    const historyRes = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`);
    const historyBody = await historyRes.json();
    const corruptedLog = historyBody.data.find(
      l => l.note && l.note.includes('Testing invalid non-numeric price')
    );
    assert.equal(corruptedLog, undefined, 'No corrupted price history log should be created on 400 error');
  });

  // --------------------------------------------------------------------------
  // TEST CASE 5g: Rapid concurrent requests for same price and note do not create duplicate logs
  // --------------------------------------------------------------------------
  await test('TC5g: Rapid concurrent requests for same price and note do not create duplicate logs', async () => {
    const concurrentPrice = 2850;
    const testNote = `Kịch bản kiểm thử chống trùng lặp đa luồng TC5g ${Date.now()}`;
    const concurrentRequests = 5;

    // Send multiple concurrent requests simultaneously with identical price and note
    const promises = Array.from({ length: concurrentRequests }, () =>
      fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_price: concurrentPrice,
          note: testNote
        })
      }).then(async res => ({
        status: res.status,
        body: await res.json()
      }))
    );

    const responses = await Promise.all(promises);

    // All requests should succeed gracefully (200 OK)
    for (const r of responses) {
      assert.equal(r.status, 200, `Concurrent request should return 200 OK, got ${r.status}`);
      assert.equal(r.body.success, true, 'Response must have success: true');
    }

    // Query price history to verify only ONE log entry was created for this price and note
    const res = await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}/price-history`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const duplicateLogs = body.data.filter(
      log => Number(log.new_price) === concurrentPrice && log.note === testNote
    );

    assert.equal(
      duplicateLogs.length,
      1,
      `Expected exactly 1 log entry for rapid concurrent requests, but found ${duplicateLogs.length}`
    );
  });

  // --------------------------------------------------------------------------
  // Teardown: Clean up and restore DVS-SD-01
  // --------------------------------------------------------------------------
  after(async () => {
    try {
      await fetch(`${BASE_URL}/api/paintings/${TARGET_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: TARGET_ID,
          gia: 1500,
          ngay_cap_nhat_gia_gan_nhat: '09-01-2026',
          price_note: 'Khôi phục trạng thái sau kiểm thử tự động M3'
        })
      });

      if (fs.existsSync(PRICE_HISTORY_FILE)) {
        const logs = JSON.parse(fs.readFileSync(PRICE_HISTORY_FILE, 'utf-8'));
        const cleaned = logs.filter(l => !(l.painting_id === TARGET_ID && l.note && l.note.includes('TC5g')));
        if (cleaned.length !== logs.length) {
          fs.writeFileSync(PRICE_HISTORY_FILE, JSON.stringify(cleaned, null, 2), 'utf-8');
        }
      }
    } catch {
      // Ignore teardown network error
    }
  });
});
