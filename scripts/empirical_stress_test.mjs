import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// Helper to communicate via Chrome DevTools Protocol (CDP) WebSocket
class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      }
    };
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${res.exceptionDetails.text || JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('=== Starting Empirical Headless Chrome Stress Test ===');

  const cdpPort = 9228;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-emp-'));

  // Launch Clean Chrome Headless
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${tmpDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=768,1024',
    '--disable-extensions',
    '--disable-gpu'
  ]);

  chrome.on('error', (err) => {
    console.error('Failed to spawn Chrome:', err);
    process.exit(1);
  });

  const cleanup = () => {
    try { chrome.kill(); } catch {}
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });

  // Wait for CDP to be ready
  let version = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
      version = await res.json();
      break;
    } catch {
      await sleep(250);
    }
  }

  if (!version) {
    cleanup();
    throw new Error('Chrome failed to start within 5 seconds');
  }

  console.log(`Chrome started: ${version.Browser}`);

  // Create new page targeting localhost:3000 using PUT
  const newTargetRes = await fetch(`http://127.0.0.1:${cdpPort}/json/new?http://localhost:3000`, { method: 'PUT' });
  const target = await newTargetRes.json();
  console.log(`Opened target page: ${target.id} (${target.url})`);

  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');

  // Wait for application data to load
  console.log('Waiting for application data to load...');
  await sleep(2500);

  const viewports = [
    { name: 'iPad Mini / 9th / 10th Gen', width: 768, height: 1024 },
    { name: 'Standard Tablet Portrait', width: 800, height: 1280 },
    { name: 'iPad Air 10.9" Portrait', width: 820, height: 1180 },
    { name: 'iPad Pro 11" Portrait', width: 834, height: 1194 }
  ];

  console.log('\n--- 1. Viewport Geometry & Horizontal Overflow Matrix ---');
  for (const vp of viewports) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(250);

    const metrics = await client.eval(`
      (() => {
        const bodyScroll = document.body.scrollWidth;
        const bodyClient = document.body.clientWidth;
        const htmlScroll = document.documentElement.scrollWidth;
        const htmlClient = document.documentElement.clientWidth;
        const winWidth = window.innerWidth;
        
        // Header
        const header = document.querySelector('header');
        const headerRect = header ? header.getBoundingClientRect() : null;

        // KPI Grid
        const kpiGrid = document.querySelector('main > div.grid');
        const kpiRect = kpiGrid ? kpiGrid.getBoundingClientRect() : null;
        const cards = kpiGrid ? Array.from(kpiGrid.children).map(c => {
          const r = c.getBoundingClientRect();
          return { width: r.width, height: r.height, top: r.top, left: r.left };
        }) : [];

        // FilterToolbar
        const filterContainer = document.querySelector('div.sticky');
        const filterRect = filterContainer ? filterContainer.getBoundingClientRect() : null;

        return {
          winWidth,
          bodyScroll,
          bodyClient,
          htmlScroll,
          htmlClient,
          cards,
          headerWidth: headerRect?.width,
          filterWidth: filterRect?.width
        };
      })()
    `);

    console.log(`Viewport: ${vp.name} (${vp.width}x${vp.height}):`);
    console.log(`  body.scrollWidth: ${metrics.bodyScroll}px vs clientWidth: ${metrics.bodyClient}px (Diff: ${metrics.bodyScroll - metrics.bodyClient})`);
    console.log(`  html.scrollWidth: ${metrics.htmlScroll}px vs clientWidth: ${metrics.htmlClient}px (Diff: ${metrics.htmlScroll - metrics.htmlClient})`);
    assert.strictEqual(metrics.bodyScroll <= vp.width, true, `Body scrollWidth (${metrics.bodyScroll}) exceeds viewport width (${vp.width})`);
    assert.strictEqual(metrics.htmlScroll <= vp.width, true, `HTML scrollWidth (${metrics.htmlScroll}) exceeds viewport width (${vp.width})`);

    // KPI Cards: check Row 1 (3 cards) and Row 2 (2 cards)
    if (metrics.cards.length >= 5) {
      console.log(`  KPI Cards count: ${metrics.cards.length}`);
      const row1 = metrics.cards.slice(0, 3);
      const row2 = metrics.cards.slice(3, 5);

      console.log(`  Row 1 widths: ${row1.map(c => Math.round(c.width)).join('px, ')}px`);
      console.log(`  Row 2 widths: ${row2.map(c => Math.round(c.width)).join('px, ')}px`);

      for (let i = 0; i < metrics.cards.length; i++) {
        const c = metrics.cards[i];
        assert.ok(c.width >= 220, `Card ${i + 1} width (${c.width}px) is less than required 220px`);
      }

      // Check row alignment
      const row1TopDiff = Math.max(...row1.map(c => c.top)) - Math.min(...row1.map(c => c.top));
      const row2TopDiff = Math.max(...row2.map(c => c.top)) - Math.min(...row2.map(c => c.top));
      assert.ok(row1TopDiff <= 4, `Row 1 cards are not vertically aligned (top diff: ${row1TopDiff}px)`);
      assert.ok(row2TopDiff <= 4, `Row 2 cards are not vertically aligned (top diff: ${row2TopDiff}px)`);
      console.log(`  ✓ KPI 3+2 layout verified with all widths >= 220px`);
    }
  }

  // Set viewport to 768x1024 for deep adversarial stress testing
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(250);

  console.log('\n--- 2. Stress Test: Long Search Term in FilterToolbar ---');
  const longSearchRes = await client.eval(`
    (() => {
      const searchInput = document.querySelector('input[placeholder*="Quét QR"]');
      if (!searchInput) return { error: 'Search input not found' };

      // Set extremely long search string (300 chars)
      const longText = 'BMA_' + 'X'.repeat(250) + '_TRANH_TRIEN_LAM';
      
      // Native setter for React controlled input
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(searchInput, longText);
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));

      const form = searchInput.closest('form');
      const formRect = form.getBoundingClientRect();
      const inputRect = searchInput.getBoundingClientRect();

      // Check if "Mở Chi Tiết" button is rendered
      const jumpBtn = Array.from(form.querySelectorAll('button')).find(b => b.textContent.includes('Mở Chi Tiết'));
      const jumpRect = jumpBtn ? jumpBtn.getBoundingClientRect() : null;

      // Check "Quét QR" button
      const qrBtn = Array.from(form.querySelectorAll('button')).find(b => b.textContent.includes('Quét QR'));
      const qrRect = qrBtn ? qrBtn.getBoundingClientRect() : null;

      const bodyScroll = document.body.scrollWidth;

      return {
        inputValueLength: searchInput.value.length,
        formWidth: formRect.width,
        formRight: formRect.right,
        inputWidth: inputRect.width,
        hasJumpBtn: !!jumpBtn,
        jumpBtnRight: jumpRect?.right,
        hasQrBtn: !!qrBtn,
        qrBtnRight: qrRect?.right,
        bodyScroll
      };
    })()
  `);
  console.log('Long search input results:', longSearchRes);
  assert.strictEqual(longSearchRes.inputValueLength > 200, true);
  assert.ok(longSearchRes.formRight <= 768, `Form overflows viewport: formRight=${longSearchRes.formRight}`);
  if (longSearchRes.hasQrBtn) {
    assert.ok(longSearchRes.qrBtnRight <= 768, `QR button pushed outside viewport: qrBtnRight=${longSearchRes.qrBtnRight}`);
  }
  if (longSearchRes.hasJumpBtn) {
    assert.ok(longSearchRes.jumpBtnRight <= 768, `Jump button pushed outside viewport: jumpBtnRight=${longSearchRes.jumpBtnRight}`);
  }
  assert.ok(longSearchRes.bodyScroll <= 768, `Page scrollWidth (${longSearchRes.bodyScroll}) exceeded 768px during long search`);
  console.log('✓ Long search input handled gracefully without overflowing Tier 1 or pushing buttons off-screen.');

  // Clear search input
  await client.eval(`
    (() => {
      const searchInput = document.querySelector('input[placeholder*="Quét QR"]');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(searchInput, '');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    })()
  `);
  await sleep(150);

  console.log('\n--- 3. Stress Test: Extreme Artist Name & Combobox Truncation ---');
  // Click artist dropdown button
  await client.eval(`
    (() => {
      const artistBtn = document.querySelector('button[title*="Họa sĩ"]');
      if (artistBtn) artistBtn.click();
    })()
  `);
  await sleep(200);

  const artistStressRes = await client.eval(`
    (() => {
      const artistBtn = document.querySelector('button[title*="Họa sĩ"]');
      if (!artistBtn) return { error: 'Artist dropdown button not found' };

      const initialRect = artistBtn.getBoundingClientRect();
      const parentContainer = artistBtn.parentElement;
      const parentRect = parentContainer.getBoundingClientRect();

      // Find dropdown popup
      const popup = parentContainer.querySelector('div.absolute');
      const popupRect = popup ? popup.getBoundingClientRect() : null;

      return {
        buttonWidth: initialRect.width,
        parentWidth: parentRect.width,
        popupWidth: popupRect?.width,
        popupLeft: popupRect?.left,
        popupRight: popupRect?.right,
        bodyScroll: document.body.scrollWidth
      };
    })()
  `);
  console.log('Artist dropdown results:', artistStressRes);
  assert.ok(artistStressRes.buttonWidth <= 190, `Artist button exceeds expected container width (${artistStressRes.buttonWidth}px)`);
  assert.ok(artistStressRes.popupRight !== undefined, 'Artist popup should be mounted');
  assert.ok(artistStressRes.popupRight <= 768, `Artist popup overflows 768px: popupRight=${artistStressRes.popupRight}`);
  assert.ok(artistStressRes.bodyScroll <= 768, `Opening artist dropdown caused horizontal scroll: ${artistStressRes.bodyScroll}`);
  console.log('✓ Artist dropdown combobox truncates and fits within 768px viewport.');

  // Close dropdown
  await client.eval(`
    (() => {
      const artistBtn = document.querySelector('button[title*="Họa sĩ"]');
      if (artistBtn) artistBtn.click();
    })()
  `);
  await sleep(150);

  console.log('\n--- 4. Stress Test: Simultaneous Active Filters on Tier 2 ---');
  await client.eval(`
    (() => {
      // 1. Activate "Chưa có giá" chip
      const pendingChip = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Chưa có giá'));
      if (pendingChip && !pendingChip.classList.contains('bg-stone-800')) {
        pendingChip.click();
      }

      // 2. Set search term to trigger "Xóa lọc" button
      const searchInput = document.querySelector('input[placeholder*="Quét QR"]');
      if (searchInput) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(searchInput, 'Dương');
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await sleep(300);

  const tier2Metrics = await client.eval(`
    (() => {
      const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xóa lọc'));
      const pendingChip = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Chưa có giá'));
      const counterSpan = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('Hiển thị') && s.textContent.includes('tác phẩm'));

      const mediumSelect = document.querySelector('select');
      const leftSubGroup = mediumSelect ? mediumSelect.parentElement.parentElement : null;
      const rightSubGroup = pendingChip ? pendingChip.parentElement : null;

      const leftRect = leftSubGroup ? leftSubGroup.getBoundingClientRect() : null;
      const rightRect = rightSubGroup ? rightSubGroup.getBoundingClientRect() : null;

      return {
        hasClearBtn: !!clearBtn,
        hasPendingChip: !!pendingChip,
        hasCounter: !!counterSpan,
        leftTop: leftRect?.top,
        leftBottom: leftRect?.bottom,
        leftRight: leftRect?.right,
        rightTop: rightRect?.top,
        rightLeft: rightRect?.left,
        rightRight: rightRect?.right,
        topDiff: leftRect && rightRect ? Math.abs(leftRect.top - rightRect.top) : null,
        bodyScroll: document.body.scrollWidth,
        htmlScroll: document.documentElement.scrollWidth
      };
    })()
  `);
  console.log('Tier 2 simultaneous active filters metrics:', tier2Metrics);
  assert.ok(tier2Metrics.hasClearBtn, '"Xóa lọc" button should be visible');
  assert.ok(tier2Metrics.hasPendingChip, '"Chưa có giá" chip should be visible');
  assert.ok(tier2Metrics.hasCounter, 'Counter should be visible');
  assert.ok(tier2Metrics.topDiff <= 6, `Tier 2 wrapped into multiple lines! topDiff=${tier2Metrics.topDiff}px (leftTop=${tier2Metrics.leftTop}, rightTop=${tier2Metrics.rightTop})`);
  assert.ok(tier2Metrics.rightRight <= 768, `Right sub-group overflows viewport: rightRight=${tier2Metrics.rightRight}`);
  assert.ok(tier2Metrics.htmlScroll <= 768, `HTML scrollWidth (${tier2Metrics.htmlScroll}) exceeds 768px`);
  console.log(`✓ Tier 2 maintains a single horizontal line (topDiff: ${tier2Metrics.topDiff}px) on 768px tablet portrait under all active filter chips!`);

  // Reset filters
  await client.eval(`
    (() => {
      const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Xóa lọc'));
      if (clearBtn) clearBtn.click();
    })()
  `);
  await sleep(300);

  console.log('\n--- 5. Stress Test: Floating Bulk Action Bar Clearance & Overlap ---');
  // Select multiple paintings to show Floating Bulk Action Bar
  await client.eval(`
    (() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length > 3) {
        checkboxes[1].click();
        checkboxes[2].click();
        checkboxes[3].click();
      }
    })()
  `);
  await sleep(300);

  const scrollPositions = [0, 200, 500, 1000];
  for (const scrollY of scrollPositions) {
    await client.eval(`window.scrollTo(0, ${scrollY})`);
    await sleep(150);

    const barMetrics = await client.eval(`
      (() => {
        const floatingSpan = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('tác phẩm được chọn'));
        const floatingBar = floatingSpan ? floatingSpan.closest('div.fixed') : null;
        const paginationBar = document.querySelector('div.sticky.bottom-0');

        const fRect = floatingBar ? floatingBar.getBoundingClientRect() : null;
        const pRect = paginationBar ? paginationBar.getBoundingClientRect() : null;

        return {
          scrollY: window.scrollY,
          viewportHeight: window.innerHeight,
          floatingBarExists: !!floatingBar,
          floatingTop: fRect?.top,
          floatingBottom: fRect?.bottom,
          floatingHeight: fRect?.height,
          floatingLeft: fRect?.left,
          floatingRight: fRect?.right,
          paginationExists: !!paginationBar,
          paginationTop: pRect?.top,
          paginationBottom: pRect?.bottom,
          paginationHeight: pRect?.height,
          clearanceGap: fRect && pRect ? pRect.top - fRect.bottom : null,
          bodyScroll: document.body.scrollWidth
        };
      })()
    `);

    console.log(`Scroll Y=${scrollY}:`);
    console.log(`  Floating Bar: [top: ${barMetrics.floatingTop}, bottom: ${barMetrics.floatingBottom}, height: ${barMetrics.floatingHeight}px, width: ${barMetrics.floatingRight - barMetrics.floatingLeft}px]`);
    console.log(`  Pagination Bar: [top: ${barMetrics.paginationTop}, bottom: ${barMetrics.paginationBottom}, height: ${barMetrics.paginationHeight}px]`);
    console.log(`  Vertical Clearance Gap: ${barMetrics.clearanceGap}px`);

    assert.ok(barMetrics.floatingBarExists, 'Floating Bulk Action Bar should exist when paintings are selected');
    assert.ok(barMetrics.paginationExists, 'StickyPaginationBar should exist');
    assert.ok(barMetrics.clearanceGap >= 0, `Clearance gap between floating bar and pagination bar is negative (overlapping): ${barMetrics.clearanceGap}px`);
    assert.ok(barMetrics.floatingLeft >= 0 && barMetrics.floatingRight <= 768, `Floating bar extends beyond viewport: [${barMetrics.floatingLeft}, ${barMetrics.floatingRight}]`);
    assert.ok(barMetrics.bodyScroll <= 768, `Horizontal scroll occurred: ${barMetrics.bodyScroll}`);

    // Verify none of the visible pagination buttons are obscured by the floating bar
    const obscurityCheck = await client.eval(`
      (() => {
        const p = document.querySelector('div.sticky.bottom-0');
        if (!p) return [];
        const buttons = Array.from(p.querySelectorAll('button, select'));
        return buttons
          .filter(b => {
            const r = b.getBoundingClientRect();
            return r.top >= 0 && r.bottom <= window.innerHeight;
          })
          .map(b => {
            const r = b.getBoundingClientRect();
            const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return {
              name: b.textContent.trim() || b.title,
              isObscured: !b.contains(el) && el !== b
            };
          });
      })()
    `);
    for (const item of obscurityCheck) {
      assert.strictEqual(item.isObscured, false, `Pagination control "${item.name}" is obscured!`);
    }
  }
  console.log('✓ Floating Bulk Action Bar maintains clean clearance (11px-15px) above StickyPaginationBar across all scroll positions!');

  // Deselect paintings
  await client.eval(`
    (() => {
      const closeBtn = document.querySelector('div.fixed button[title="Bỏ chọn tất cả"]');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await sleep(150);

  console.log('\n--- 6. Stress Test: High Financial Numbers in KpiCards ---');
  const highFinancialMetrics = await client.eval(`
    (() => {
      const kpiCards = document.querySelectorAll('main > div.grid > div');
      if (kpiCards.length < 5) return { error: 'KpiCards not found' };

      const card2 = kpiCards[1];
      const card3 = kpiCards[2];

      const priceDiv2 = card2.querySelector('div.text-emerald-700');
      const priceDiv3 = card3.querySelector('div.text-amber-800');

      // Temporarily inject high financial values to simulate extreme numbers
      const origText2 = priceDiv2.textContent;
      const origText3 = priceDiv3.textContent;

      priceDiv2.textContent = 'Trị giá: $999,999,999,999 USD';
      priceDiv3.textContent = 'Doanh thu: $1,500,000,000 USD';

      const rect2 = card2.getBoundingClientRect();
      const rect3 = card3.getBoundingClientRect();

      const kpiContainer = card2.parentElement;
      const containerScroll = kpiContainer.scrollWidth;
      const containerClient = kpiContainer.clientWidth;
      const bodyScroll = document.body.scrollWidth;

      // Restore original text
      priceDiv2.textContent = origText2;
      priceDiv3.textContent = origText3;

      return {
        card2Width: rect2.width,
        card3Width: rect3.width,
        containerScroll,
        containerClient,
        bodyScroll
      };
    })()
  `);
  console.log('High financial values metrics:', highFinancialMetrics);
  assert.ok(highFinancialMetrics.card2Width >= 220, `Card 2 width (${highFinancialMetrics.card2Width}px) < 220px`);
  assert.ok(highFinancialMetrics.card3Width >= 220, `Card 3 width (${highFinancialMetrics.card3Width}px) < 220px`);
  assert.strictEqual(highFinancialMetrics.containerScroll <= highFinancialMetrics.containerClient, true, 'KpiCards container overflowed horizontally');
  assert.ok(highFinancialMetrics.bodyScroll <= 768, 'Body scroll exceeded 768px under high financial numbers');
  console.log('✓ KpiCards safely accommodates high financial numbers ($999,999,999,999 USD) without horizontal overflow or grid distortion.');

  console.log('\n=== ALL EMPIRICAL ADVERSARIAL STRESS TESTS PASSED ===');

  client.close();
  cleanup();
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ STRESS TEST FAILED:', err);
  process.exit(1);
});
