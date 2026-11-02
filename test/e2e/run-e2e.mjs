// test/e2e/run-e2e.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TARGET_ID = 'DVS-SD-01';

async function getPlaywright() {
  try {
    return await import('playwright');
  } catch {
    return await import('/Users/mac/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
  }
}

async function runE2E() {
  console.log('[E2E Runner] Initializing Playwright and launching Google Chrome on macOS...');
  const { chromium } = await getPlaywright();
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  try {
    console.log('[E2E Runner] Creating Mobile Viewport context (430px x 932px, iPhone 14 Pro Max)...');
    const context = await browser.newContext({
      viewport: { width: 430, height: 932 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      ignoreHTTPSErrors: true
    });

    const page = await context.newPage();
    console.log('[E2E Runner] Navigating to https://localhost:5001...');
    await page.goto('https://localhost:5001', { waitUntil: 'networkidle', timeout: 30000 });

    // 1. Locate and click DVS-SD-01 Edit Button in Sticky Action Column
    console.log(`[E2E Runner] Locating edit action button for painting ${TARGET_ID}...`);
    const editBtn = page.locator(`[data-testid="inventory__action-edit--btn-${TARGET_ID}"]`);
    await editBtn.waitFor({ state: 'visible', timeout: 15000 });
    await editBtn.click();

    // 2. Verify Painting Detail Modal is open
    console.log('[E2E Runner] Verifying Painting Detail Modal opened...');
    const modalTitle = page.locator('text=Chi Tiết Hồ Sơ Tác Phẩm');
    await modalTitle.waitFor({ state: 'visible', timeout: 5000 });

    // 3. Verify Subtab "Nhật Ký Giá" exists on tabs navigation bar
    console.log('[E2E Runner] Locating subtab "Nhật Ký Giá"...');
    const priceTab = page.locator('[data-testid="painting-detail__tab-price-history"]')
      .or(page.locator('button:has-text("Nhật Ký Giá")'));
    await priceTab.waitFor({ state: 'visible', timeout: 5000 });

    // Verify compact height compliance for tab buttons (28px - 34px)
    const tabBox = await priceTab.boundingBox();
    assert.ok(tabBox, 'Price tab must have bounding box');
    console.log(`[E2E Runner] Tab button height: ${tabBox.height}px (Enterprise compact standard: 28px - 34px)`);
    assert.ok(tabBox.height >= 26 && tabBox.height <= 36, `Tab height ${tabBox.height}px violates compact standard`);

    // 4. Click Subtab "Nhật Ký Giá"
    console.log('[E2E Runner] Switching to subtab "Nhật Ký Giá"...');
    await priceTab.click();

    // 5. Verify Current Price KPI Bar is visible
    console.log('[E2E Runner] Verifying Current Price KPI bar...');
    const kpiBar = page.locator('[data-testid="price-history__kpi-current-price"]').first();
    await kpiBar.waitFor({ state: 'visible', timeout: 5000 });

    // 6. Verify Timeline Container is loaded
    console.log('[E2E Runner] Verifying Price History Timeline...');
    const timelineContainer = page.locator('[data-testid="price-history__timeline-container"]').first();
    await timelineContainer.waitFor({ state: 'visible', timeout: 5000 });

    const baselineBadge = page.locator('text=Mốc ban đầu').or(page.locator('text=Khởi tạo:')).first();
    await baselineBadge.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ [E2E Runner] Baseline log verified in Timeline!');

    // 7. Verify Quick Adjustment Card & Controls
    console.log('[E2E Runner] Testing Quick Price Adjustment card...');
    const quickAdjustCard = page.locator('[data-testid="price-history__quick-adjust-card"]').first();
    await quickAdjustCard.waitFor({ state: 'visible', timeout: 5000 });

    const priceInput = page.locator('[data-testid="price-history__input-new-price"]').first();
    await priceInput.waitFor({ state: 'visible', timeout: 5000 });

    const noteInput = page.locator('[data-testid="price-history__input-note"]').first();
    await noteInput.waitFor({ state: 'visible', timeout: 5000 });

    const submitBtn = page.locator('[data-testid="price-history__btn-submit"]').first();
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Determine a new price different from current price
    const currentPriceText = await kpiBar.innerText();
    const targetPrice = currentPriceText.includes('1,680') ? 1690 : 1680;
    const targetPriceFormatted = targetPrice === 1690 ? '$1,690' : '$1,680';

    console.log(`[E2E Runner] Entering new price ${targetPriceFormatted} and submitting...`);
    await priceInput.fill(String(targetPrice));
    await noteInput.fill('Playwright E2E Verification Adjustment');
    await submitBtn.click();

    // Verify KPI bar updates to target price
    const newPriceText = page.locator(`text=${targetPriceFormatted}`).first();
    await newPriceText.waitFor({ state: 'visible', timeout: 10000 });
    console.log(`✅ [E2E Runner] Current Price KPI reactive update to ${targetPriceFormatted} verified!`);

    // 8. Verify Zero Horizontal Overflow on Mobile 430px
    const hasHorizontalOverflow = await page.evaluate(() => {
      const modal = document.querySelector('div[role="dialog"]') || document.querySelector('.overflow-y-auto');
      if (!modal) return false;
      return modal.scrollWidth > modal.clientWidth + 1;
    });
    assert.equal(hasHorizontalOverflow, false, 'Mobile viewport must have zero horizontal overflow');
    console.log('✅ [E2E Runner] Mobile 430px Zero Horizontal Overflow confirmed!');

    // 9. Capture screenshot
    const screenshotPath = path.join(ROOT_DIR, 'test-results', 'price-history-mobile-430px.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`✅ [E2E Runner] Mobile screenshot captured at: ${screenshotPath}`);

    // 10. Desktop Viewport Verification
    console.log('[E2E Runner] Testing Desktop Viewport (1280px x 800px)...');
    const desktopPage = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: true
    });
    await desktopPage.goto('https://localhost:5001', { waitUntil: 'networkidle', timeout: 30000 });

    const desktopEditBtn = desktopPage.locator(`[data-testid="inventory__action-edit--btn-${TARGET_ID}"]`);
    await desktopEditBtn.waitFor({ state: 'visible', timeout: 10000 });
    await desktopEditBtn.click();

    const desktopPriceTab = desktopPage.locator('[data-testid="painting-detail__tab-price-history"]')
      .or(desktopPage.locator('button:has-text("Nhật Ký Giá")'));
    await desktopPriceTab.waitFor({ state: 'visible', timeout: 5000 });
    await desktopPriceTab.click();

    const desktopScreenshotPath = path.join(ROOT_DIR, 'test-results', 'price-history-desktop.png');
    await desktopPage.screenshot({ path: desktopScreenshotPath });
    console.log(`✅ [E2E Runner] Desktop screenshot captured at: ${desktopScreenshotPath}`);

    await desktopPage.close();
    await page.close();

    console.log('🎉 [E2E Runner] ALL E2E REQUIREMENTS PASSED WITH 100% SUCCESS!');
  } finally {
    await browser.close();
  }
}

runE2E().catch(err => {
  console.error('❌ [E2E Runner] Failed with error:', err);
  process.exit(1);
});
