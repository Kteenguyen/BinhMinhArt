// test/adversarial-m1-concurrency.test.mjs
/**
 * Empirical Adversarial Test Suite for Milestone 1:
 * - Concurrency race conditions (10 concurrent checkouts for same painting -> exactly 1 201, 9 409s)
 * - Physical unique artwork invariance ('da_ban' rejection on cart addition & checkout)
 * - Multi-item partial failure atomicity (zero partial writes on cart with available + sold items)
 * - Mutex error recovery & deadlock freedom (clean release after midway failures)
 * - Invariant gallery inventory baseline preservation ($3,082,550 USD, 298 in-stock, 37 sold)
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { AsyncMutex, checkoutMutex } from '../server/checkoutMutex.js';
import { convertUsdToVnd } from '../server/vietqrService.js';
import { DEFAULT_DB_PATH } from '../server/orderStore.js';
import { initPriceHistory, savePriceHistory } from '../server/priceHistoryStore.js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const BASE_URL = process.env.TEST_URL || 'https://localhost:5001';

describe('Milestone 1 Empirical Challenger: Adversarial Concurrency & Invariance Suite', () => {
  let allPaintings = [];
  let pRace = null;
  let pMultiA = null;
  let pMultiB = null;
  let pMultiC = null;
  let pRecover1 = null;
  let pRecover2 = null;
  let initialCustomer1 = null;
  let initialStats = null;
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
    // 1. Verify Server is reachable and record initial baseline stats
    const statsRes = await fetchJson(`${BASE_URL}/api/stats`);
    assert.equal(statsRes.status, 200, 'Server must be listening on BASE_URL');
    assert.equal(statsRes.body.success, true);
    initialStats = statsRes.body.stats;

    assert.equal(initialStats.inStockValue, 3082550, 'Baseline in-stock gallery value must be $3,082,550 USD');
    assert.equal(initialStats.inStockCount, 298, 'Baseline in-stock count must be 298');
    assert.equal(initialStats.soldCount, 37, 'Baseline sold count must be 37');

    // 2. Fetch all paintings and pick candidates
    const pRes = await fetchJson(`${BASE_URL}/api/paintings`);
    assert.equal(pRes.status, 200);
    allPaintings = pRes.body.data;

    // Pick candidates that are in stock ('chua_ban') and not the initial anchor demo items
    const available = allPaintings.filter(p =>
      p.tinh_trang === 'chua_ban' &&
      p.id !== 'DVS-SD-01' &&
      p.id !== 'DVS-SD-02' &&
      p.id !== 'DVS-SD-03'
    );
    assert.ok(available.length >= 6, 'Must have at least 6 available candidate paintings for stress testing');

    pRace = available[0];
    pMultiA = available[1];
    pMultiB = available[2];
    pMultiC = available[3];
    pRecover1 = available[4];
    pRecover2 = available[5];

    // Snapshot original states for clean rollback
    for (const p of [pRace, pMultiA, pMultiB, pMultiC, pRecover1, pRecover2]) {
      originalPaintingsMap.set(p.id, JSON.parse(JSON.stringify(p)));
    }

    // 3. Snapshot customer 1
    const custRes = await fetchJson(`${BASE_URL}/api/customers/1`);
    if (custRes.status === 200 && custRes.body.data) {
      initialCustomer1 = JSON.parse(JSON.stringify(custRes.body.data));
    }
  });

  after(async () => {
    // 1. Restore all touched paintings to initial state
    for (const p of [pRace, pMultiA, pMultiB, pMultiC, pRecover1, pRecover2]) {
      await restorePainting(p);
    }

    // 2. Restore customer 1
    if (initialCustomer1) {
      await fetch(`${BASE_URL}/api/customers/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests: initialCustomer1.interests || []
        })
      });
    }

    // 3. Purge challenge test invoices from SQLite
    try {
      const db = new DatabaseSync(DEFAULT_DB_PATH);
      db.exec("DELETE FROM invoices WHERE invoice_code LIKE 'HD-CHALLENGE-%';");
      db.close();
    } catch (err) {
      console.warn('⚠️ [Cleanup] Error cleaning challenge invoices:', err.message);
    }

    // 4. Purge challenge price logs from price history store
    try {
      const logs = initPriceHistory();
      const cleaned = logs.filter(l => !l.note || !l.note.includes('HD-CHALLENGE'));
      savePriceHistory(cleaned, { immediateSync: true });
    } catch (err) {
      console.warn('⚠️ [Cleanup] Error cleaning challenge price logs:', err.message);
    }

    // 5. Verify baseline inventory is fully restored
    const finalStatsRes = await fetchJson(`${BASE_URL}/api/stats`);
    if (finalStatsRes.status === 200 && finalStatsRes.body.stats) {
      const finalStats = finalStatsRes.body.stats;
      assert.equal(finalStats.inStockValue, 3082550, 'Gallery inStockValue must be fully restored to $3,082,550 USD');
      assert.equal(finalStats.inStockCount, 298, 'Gallery inStockCount must be fully restored to 298');
      assert.equal(finalStats.soldCount, 37, 'Gallery soldCount must be fully restored to 37');
    }
  });

  // =========================================================================
  // PROBE 1: Concurrency Race Conditions (10 Concurrent Requests)
  // =========================================================================
  test('PROBE 1: 10 concurrent checkout requests for the same painting: EXACTLY 1 succeeds (201) and all 9 receive HTTP 409 Conflict', async () => {
    const target = pRace;
    const testTimestamp = Date.now();
    const dealPrice = target.gia || 2000;

    // Build 10 distinct concurrent checkout requests for the exact same physical artwork
    const requests = Array.from({ length: 10 }, (_, i) => ({
      customer_id: 1,
      customer_name: `Concurrent Staff #${i + 1}`,
      customer_phone: `090100000${i}`,
      customer_email: `staff${i + 1}@binhminhart.vn`,
      invoice_code: `HD-CHALLENGE-10CONC-${testTimestamp}-${i + 1}`,
      items: [
        {
          painting_id: target.id,
          deal_price: dealPrice,
          note: `Concurrent checkout attempt #${i + 1}`
        }
      ],
      notes: `Race condition probe run index ${i + 1}`,
      payment_method: 'vietqr'
    }));

    // Dispatch all 10 simultaneously via Promise.all
    const responses = await Promise.all(
      requests.map(payload =>
        fetchJson(`${BASE_URL}/api/orders/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      )
    );

    // Analyze results
    const successes = responses.filter(r => r.status === 201);
    const conflicts = responses.filter(r => r.status === 409);
    const otherErrors = responses.filter(r => r.status !== 201 && r.status !== 409);

    assert.equal(
      otherErrors.length,
      0,
      `No unexpected status codes allowed. Found: ${otherErrors.map(e => e.status).join(', ')}`
    );
    assert.equal(
      successes.length,
      1,
      `EXACTLY 1 request must succeed with 201 Created. Actual: ${successes.length}`
    );
    assert.equal(
      conflicts.length,
      9,
      `EXACTLY 9 requests must fail with 409 Conflict. Actual: ${conflicts.length}`
    );

    // Verify successful response payload
    const winner = successes[0].body;
    assert.equal(winner.success, true);
    assert.ok(winner.data.invoice, 'Must return created invoice');
    assert.ok(winner.data.invoice.invoice_code.startsWith(`HD-CHALLENGE-10CONC-${testTimestamp}-`));
    assert.equal(winner.data.invoice.total_deal_price, dealPrice);
    assert.ok(winner.data.vietqr, 'Must return VietQR payment bundle');
    assert.equal(winner.data.vietqr.amount_vnd, convertUsdToVnd(dealPrice));
    assert.ok(winner.data.vietqr.memo.includes(winner.data.invoice.invoice_code.replace(/-/g, ' ')));
    assert.ok(winner.data.cleared_cart_items.includes(target.id));

    // Verify all 9 conflict responses provide proper error contract
    for (const conflict of conflicts) {
      assert.equal(conflict.body.success, false);
      assert.ok(
        conflict.body.message.includes('đã được bán trước đó, không thể thanh toán!'),
        `Error message must report duplicate sale: ${conflict.body.message}`
      );
      assert.ok(
        conflict.body.message.includes(target.id),
        `Error message must mention target painting ID ${target.id}`
      );
    }

    // Verify database state: painting must be 'da_ban' with winner's invoice code
    const pCheck = await fetchJson(`${BASE_URL}/api/paintings/${target.id}`);
    assert.equal(pCheck.status, 200);
    assert.equal(pCheck.body.data.tinh_trang, 'da_ban');
    assert.equal(pCheck.body.data.hoa_don, winner.data.invoice.invoice_code);
    assert.equal(pCheck.body.data.khach_hang, winner.data.invoice.customer_name);

    // Verify SQLite invoices table contains EXACTLY 1 invoice for this painting
    const db = new DatabaseSync(DEFAULT_DB_PATH);
    const invRows = db.prepare(
      "SELECT invoice_code FROM invoices WHERE invoice_code LIKE ?"
    ).all(`HD-CHALLENGE-10CONC-${testTimestamp}-%`);
    db.close();

    assert.equal(
      invRows.length,
      1,
      `SQLite must contain exactly 1 invoice for the race condition test. Actual: ${invRows.length}`
    );
    assert.equal(invRows[0].invoice_code, winner.data.invoice.invoice_code);
  });

  // =========================================================================
  // PROBE 2: Physical Unique Artwork Invariance
  // =========================================================================
  test('PROBE 2: Physical Unique Artwork Invariance: Sold artwork ("da_ban") CANNOT be added to cart (400) or checked out again (409)', async () => {
    // pRace is currently 'da_ban' from PROBE 1
    const soldArtwork = pRace;

    // Sub-test 2.1: Cart addition rejects sold artwork with HTTP 400
    const addCartRes = await fetchJson(`${BASE_URL}/api/customers/1/cart`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          {
            painting_id: soldArtwork.id,
            deal_price: 1800,
            note: 'Attempting to add sold painting'
          }
        ]
      })
    });

    assert.equal(
      addCartRes.status,
      400,
      `PUT /api/customers/:id/cart with sold painting must return 400 Bad Request. Actual: ${addCartRes.status}`
    );
    assert.equal(addCartRes.body.success, false);
    assert.ok(
      addCartRes.body.message.includes('đã được bán, không thể thêm vào giỏ hàng!'),
      `Error message must explicitly state sold status: ${addCartRes.body.message}`
    );
    assert.ok(addCartRes.body.message.includes(soldArtwork.id));

    // Sub-test 2.2: Cart view flags sold items as un-checkoutable if present
    // Add customer interest via raw interests endpoint to simulate pre-existing cart item
    await fetchJson(`${BASE_URL}/api/customers/1/interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        painting_id: soldArtwork.id,
        deal_price: 1800,
        note: 'Legacy interest'
      })
    });

    const viewCartRes = await fetchJson(`${BASE_URL}/api/customers/1/cart`);
    assert.equal(viewCartRes.status, 200);
    const cartData = viewCartRes.body.data;
    const soldItemInCart = cartData.items.find(it => it.painting_id === soldArtwork.id);
    assert.ok(soldItemInCart, 'Item should be retrieved in cart view');
    assert.equal(soldItemInCart.is_available, false, 'Sold item must have is_available === false');
    assert.equal(soldItemInCart.tinh_trang, 'da_ban', 'Sold item must have tinh_trang === "da_ban"');
    assert.equal(cartData.summary.can_checkout, false, 'Cart containing sold item must NOT allow checkout');
    assert.equal(cartData.summary.sold_count, 1);

    // Sub-test 2.3: Re-checkout of sold painting fails with HTTP 409 Conflict
    const reCheckoutRes = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Late Shopper',
        invoice_code: `HD-CHALLENGE-SOLD-${Date.now()}`,
        items: [{ painting_id: soldArtwork.id, deal_price: 1800 }],
        payment_method: 'vietqr'
      })
    });

    assert.equal(
      reCheckoutRes.status,
      409,
      `POST /api/orders/checkout with sold artwork must return 409 Conflict. Actual: ${reCheckoutRes.status}`
    );
    assert.equal(reCheckoutRes.body.success, false);
    assert.ok(
      reCheckoutRes.body.message.includes('đã được bán trước đó, không thể thanh toán!'),
      `Message must state: ${reCheckoutRes.body.message}`
    );

    // Sub-test 2.4: 5 concurrent requests all trying to checkout the sold artwork ALL return 409
    const concurrent5 = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        fetchJson(`${BASE_URL}/api/orders/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: 1,
            customer_name: `Sold Attacker #${i + 1}`,
            invoice_code: `HD-CHALLENGE-SOLD5-${Date.now()}-${i + 1}`,
            items: [{ painting_id: soldArtwork.id, deal_price: 1800 }],
            payment_method: 'vietqr'
          })
        })
      )
    );

    assert.equal(concurrent5.filter(r => r.status === 409).length, 5, 'All 5 concurrent requests must receive 409');
    assert.equal(concurrent5.filter(r => r.status === 201).length, 0, 'Zero requests must succeed');
  });

  // =========================================================================
  // PROBE 3: Multi-Item Partial Failure Atomicity
  // =========================================================================
  test('PROBE 3: Multi-item Partial Failure Atomicity: Cart with 2 available + 1 sold rejects completely without altering available paintings', async () => {
    // We have:
    // pMultiA (available: 'chua_ban')
    // pMultiB (we will sell it first to make it 'da_ban')
    // pMultiC (available: 'chua_ban')

    // 1. Prepare pMultiB as sold
    const prepRes = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Preparation Customer',
        invoice_code: `HD-CHALLENGE-PREPB-${Date.now()}`,
        items: [{ painting_id: pMultiB.id, deal_price: pMultiB.gia || 2000 }],
        payment_method: 'vietqr'
      })
    });
    assert.equal(prepRes.status, 201, 'Preparation sale of pMultiB must succeed');

    // Snapshot pre-test state of pMultiA and pMultiC
    const preA = (await fetchJson(`${BASE_URL}/api/paintings/${pMultiA.id}`)).body.data;
    const preC = (await fetchJson(`${BASE_URL}/api/paintings/${pMultiC.id}`)).body.data;
    assert.equal(preA.tinh_trang, 'chua_ban');
    assert.equal(preC.tinh_trang, 'chua_ban');

    // 2. Scenario 3A: Sold item placed in MIDDLE: [Available, Sold, Available]
    const middleInvoiceCode = `HD-CHALLENGE-ATOM-MID-${Date.now()}`;
    const midRes = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Atomicity Tester (Middle)',
        invoice_code: middleInvoiceCode,
        items: [
          { painting_id: pMultiA.id, deal_price: 1111 },
          { painting_id: pMultiB.id, deal_price: 2222 }, // SOLD ITEM
          { painting_id: pMultiC.id, deal_price: 3333 }
        ],
        payment_method: 'vietqr'
      })
    });

    assert.equal(midRes.status, 409, 'Must reject with 409 Conflict when 1 item is sold');
    assert.equal(midRes.body.success, false);
    assert.ok(midRes.body.message.includes(pMultiB.id));

    // Verify pMultiA was NOT altered (not sold, price not changed, hoa_don empty)
    const postA1 = (await fetchJson(`${BASE_URL}/api/paintings/${pMultiA.id}`)).body.data;
    assert.equal(postA1.tinh_trang, 'chua_ban', 'pMultiA must remain "chua_ban"');
    assert.equal(postA1.gia, preA.gia, 'pMultiA price must remain unchanged');
    assert.equal(postA1.hoa_don || '', preA.hoa_don || '', 'pMultiA hoa_don must remain unchanged');
    assert.equal(postA1.ngay_ban || null, null, 'pMultiA ngay_ban must remain null');

    // Verify pMultiC was NOT altered
    const postC1 = (await fetchJson(`${BASE_URL}/api/paintings/${pMultiC.id}`)).body.data;
    assert.equal(postC1.tinh_trang, 'chua_ban', 'pMultiC must remain "chua_ban"');
    assert.equal(postC1.gia, preC.gia, 'pMultiC price must remain unchanged');
    assert.equal(postC1.hoa_don || '', preC.hoa_don || '', 'pMultiC hoa_don must remain unchanged');
    assert.equal(postC1.ngay_ban || null, null, 'pMultiC ngay_ban must remain null');

    // 3. Scenario 3B: Sold item placed at the END: [Available, Available, Sold]
    // Tests that loop does not mutate earlier items before encountering the trailing sold item
    const trailingInvoiceCode = `HD-CHALLENGE-ATOM-TRAIL-${Date.now()}`;
    const trailRes = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Atomicity Tester (Trailing)',
        invoice_code: trailingInvoiceCode,
        items: [
          { painting_id: pMultiA.id, deal_price: 1111 },
          { painting_id: pMultiC.id, deal_price: 3333 },
          { painting_id: pMultiB.id, deal_price: 2222 } // SOLD ITEM AT END
        ],
        payment_method: 'vietqr'
      })
    });

    assert.equal(trailRes.status, 409, 'Must reject with 409 Conflict when trailing item is sold');
    assert.equal(trailRes.body.success, false);
    assert.ok(trailRes.body.message.includes(pMultiB.id));

    // Verify pMultiA and pMultiC STILL remain completely untouched
    const postA2 = (await fetchJson(`${BASE_URL}/api/paintings/${pMultiA.id}`)).body.data;
    assert.equal(postA2.tinh_trang, 'chua_ban', 'pMultiA must still be "chua_ban"');
    assert.equal(postA2.gia, preA.gia);

    const postC2 = (await fetchJson(`${BASE_URL}/api/paintings/${pMultiC.id}`)).body.data;
    assert.equal(postC2.tinh_trang, 'chua_ban', 'pMultiC must still be "chua_ban"');
    assert.equal(postC2.gia, preC.gia);

    // 4. Verify no invoice record was inserted into SQLite for rejected transactions
    const db = new DatabaseSync(DEFAULT_DB_PATH);
    const midInv = db.prepare('SELECT id FROM invoices WHERE invoice_code = ?').get(middleInvoiceCode);
    const trailInv = db.prepare('SELECT id FROM invoices WHERE invoice_code = ?').get(trailingInvoiceCode);
    db.close();

    assert.equal(midInv, undefined, 'No invoice record should exist for rejected middle checkout');
    assert.equal(trailInv, undefined, 'No invoice record should exist for rejected trailing checkout');
  });

  // =========================================================================
  // PROBE 4: Mutex Error Recovery & Deadlock Freedom
  // =========================================================================
  test('PROBE 4: Mutex Error Recovery: Failed checkout releases mutex cleanly without hanging subsequent checkouts', async () => {
    const candidate = pRecover1;
    const testTimestamp = Date.now();

    // Sub-test 4.1: Failure due to non-existent painting throws inside mutex
    const failStart = Date.now();
    const failRes = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Ghost Item Buyer',
        invoice_code: `HD-CHALLENGE-FAIL-${testTimestamp}`,
        items: [{ painting_id: 'GHOST-PAINTING-NON-EXISTENT-999', deal_price: 1000 }],
        payment_method: 'vietqr'
      })
    });
    const failDuration = Date.now() - failStart;

    assert.equal(failRes.status, 404, 'Must return 404 for non-existent painting');
    assert.ok(failDuration < 500, `Failure must return quickly (<500ms). Actual: ${failDuration}ms`);

    // Immediately trigger a valid checkout on pRecover1
    const recoverStart = Date.now();
    const recoverRes = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Recovery Buyer',
        invoice_code: `HD-CHALLENGE-RECOVER-${testTimestamp}`,
        items: [{ painting_id: candidate.id, deal_price: candidate.gia || 2000 }],
        payment_method: 'vietqr'
      })
    });
    const recoverDuration = Date.now() - recoverStart;

    assert.equal(
      recoverRes.status,
      201,
      `Valid checkout following an error must succeed with 201. Actual: ${recoverRes.status}`
    );
    assert.equal(recoverRes.body.success, true);
    assert.ok(
      recoverDuration < 1000,
      `Subsequent checkout must NOT hang or block (duration: ${recoverDuration}ms)`
    );

    // Sub-test 4.2: Duplicate invoice code error recovery
    // Re-submit the exact same invoice_code
    const dupRes = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Duplicate Code Buyer',
        invoice_code: `HD-CHALLENGE-RECOVER-${testTimestamp}`, // DUPLICATE CODE
        items: [{ painting_id: pRecover2.id, deal_price: 2000 }],
        payment_method: 'vietqr'
      })
    });
    assert.equal(dupRes.status, 409, 'Duplicate invoice code must throw 409 Conflict');

    // Immediately trigger valid checkout on pRecover1 (already sold) vs another candidate to verify mutex release
    // To verify mutex released, execute a valid checkout for pMultiA (restored) or a fresh candidate
    const rec2Start = Date.now();
    const rec2Res = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Recovery Buyer 2',
        invoice_code: `HD-CHALLENGE-RECOVER2-${testTimestamp}`,
        items: [{ painting_id: pMultiC.id, deal_price: pMultiC.gia || 2000 }],
        payment_method: 'vietqr'
      })
    });
    const rec2Duration = Date.now() - rec2Start;

    assert.equal(rec2Res.status, 201, 'Checkout after duplicate invoice error must succeed (201)');
    assert.ok(rec2Duration < 1000, `Must succeed without hanging (${rec2Duration}ms)`);
  });

  // =========================================================================
  // PROBE 6: Defect Investigation: Failure Rollback Atomicity
  // =========================================================================
  test('PROBE 6: Defect Verification: Failed checkout (Duplicate Invoice Code) MUST NOT corrupt painting state to "da_ban"', async () => {
    // Pick candidate pRecover2 which should be 'chua_ban'
    const target = pRecover2;
    await restorePainting(target);

    const checkPre = (await fetchJson(`${BASE_URL}/api/paintings/${target.id}`)).body.data;
    assert.equal(checkPre.tinh_trang, 'chua_ban', 'Pre-condition: painting must be in stock ("chua_ban")');

    // Create a known invoice code first to trigger collision
    const existingCode = `HD-CHALLENGE-DUPCODE-${Date.now()}`;
    const firstSale = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Existing Invoice Customer',
        invoice_code: existingCode,
        items: [{ painting_id: pMultiA.id, deal_price: pMultiA.gia || 2000 }],
        payment_method: 'vietqr'
      })
    });
    assert.equal(firstSale.status, 201, 'Baseline invoice creation must succeed');

    // Attempt checkout on target with the duplicate invoice code
    const failedCheckout = await fetchJson(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: 1,
        customer_name: 'Failing Customer',
        invoice_code: existingCode, // Collides with existing invoice!
        items: [{ painting_id: target.id, deal_price: 2500 }],
        payment_method: 'vietqr'
      })
    });

    assert.equal(failedCheckout.status, 409, 'Failed checkout must return 409 Conflict');
    assert.ok(failedCheckout.body.message.includes('đã tồn tại trong hệ thống'));

    // Empirical verification of invariant: target painting MUST STILL BE 'chua_ban'
    const checkPost = (await fetchJson(`${BASE_URL}/api/paintings/${target.id}`)).body.data;

    // CHALLENGER ASSERTION:
    // If savePaintings executed before createInvoice and wasn't rolled back, checkPost.tinh_trang will be 'da_ban'!
    assert.equal(
      checkPost.tinh_trang,
      'chua_ban',
      `CRITICAL DEFECT FOUND: Painting ${target.id} was mutated to "${checkPost.tinh_trang}" despite checkout failure!`
    );
  });

  // =========================================================================
  // PROBE 5: AsyncMutex Unit Stress: 50 Concurrent Tasks with 50% Chaos Failures
  // =========================================================================
  test('PROBE 5: AsyncMutex unit-level stress test: 50 concurrent tasks with intentional chaos failures execute in strict FIFO order without deadlocks', async () => {
    const mutex = new AsyncMutex();
    const executionLog = [];
    const totalTasks = 50;

    const taskPromises = Array.from({ length: totalTasks }, (_, i) => {
      const isChaosFailure = i % 2 === 1; // odd tasks intentionally fail
      return mutex.runExclusive(async () => {
        // Variable jitter
        await new Promise(r => setTimeout(r, (i % 5) * 5));
        executionLog.push(i);
        if (isChaosFailure) {
          throw new Error(`Intentional chaos error in task #${i}`);
        }
        return `success-${i}`;
      });
    });

    const settled = await Promise.allSettled(taskPromises);

    // Verify all 50 tasks were queued and settled
    assert.equal(settled.length, totalTasks);

    // Verify strict FIFO sequential execution order [0, 1, 2, ..., 49]
    const expectedLog = Array.from({ length: totalTasks }, (_, i) => i);
    assert.deepEqual(
      executionLog,
      expectedLog,
      'All tasks must have executed in strict FIFO arrival order despite errors'
    );

    // Verify exactly 25 fulfilled and 25 rejected
    const fulfilled = settled.filter(s => s.status === 'fulfilled');
    const rejected = settled.filter(s => s.status === 'rejected');
    assert.equal(fulfilled.length, 25);
    assert.equal(rejected.length, 25);

    // Verify rejected errors contain our exact message
    for (const r of rejected) {
      assert.ok(r.reason.message.includes('Intentional chaos error in task #'));
    }

    // Verify mutex is still fully functional after 50 tasks
    const canary = await mutex.runExclusive(async () => 'canary-ok');
    assert.equal(canary, 'canary-ok');
  });
});
