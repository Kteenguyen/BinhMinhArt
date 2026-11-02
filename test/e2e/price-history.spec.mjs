// test/e2e/price-history.spec.mjs
import { test, expect } from '@playwright/test';

const TARGET_ID = 'DVS-SD-01';

test.describe('M3: E2E Price History Subtab & Quick Adjustment Verification', () => {

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Mobile-First Viewport (430px x 932px - iPhone 14 Pro Max)
  // --------------------------------------------------------------------------
  test.describe('Mobile Viewport (iPhone 14 Pro Max - 430px)', () => {
    test.use({
      channel: 'chrome',
      ignoreHTTPSErrors: true,
      viewport: { width: 430, height: 932 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });

    test('Mobile: Open modal, switch to "Nhật Ký Giá" subtab, verify timeline and quick adjustment', async ({ page }) => {
      // 1. Navigate to Dashboard
      await page.goto('https://localhost:5001', { waitUntil: 'networkidle' });
      await expect(page.locator('text=TỔNG KHO TRANH').or(page.locator('text=KHO TRANH'))).toBeVisible({ timeout: 15000 });

      // 2. Locate painting DVS-SD-01 Edit Button in Sticky Action Column
      const editButton = page.locator(`[data-testid="inventory__action-edit--btn-${TARGET_ID}"]`);
      await expect(editButton).toBeVisible({ timeout: 10000 });
      await editButton.click();

      // 3. Verify Painting Detail Modal is open
      const modalTitle = page.locator('text=Chi Tiết Hồ Sơ Tác Phẩm');
      await expect(modalTitle).toBeVisible({ timeout: 5000 });

      // 4. Verify Subtab "Nhật Ký Giá" exists on tabs navigation bar
      const priceTab = page.locator('[data-testid="painting-detail__tab-price-history"]')
        .or(page.locator('button:has-text("Nhật Ký Giá")'));
      await expect(priceTab).toBeVisible();

      // 5. Verify compact height compliance for tab buttons (28px - 34px)
      const tabBox = await priceTab.boundingBox();
      expect(tabBox.height).toBeGreaterThanOrEqual(28);
      expect(tabBox.height).toBeLessThanOrEqual(34);

      // 6. Switch to "Nhật Ký Giá" tab
      await priceTab.click();

      // 7. Verify Current Price KPI Bar is visible and displays mono font price
      const kpiBar = page.locator('[data-testid="price-history__kpi-current-price"]').first();
      await expect(kpiBar).toBeVisible();
      await expect(kpiBar.locator('text=$').first()).toBeVisible();

      // 8. Verify Timeline Container is loaded with historical entries
      const timelineContainer = page.locator('[data-testid="price-history__timeline-container"]').first();
      await expect(timelineContainer).toBeVisible();

      // Verify baseline entry or historical price is rendered
      const baselineItem = page.locator('text=Mốc ban đầu').or(page.locator('text=Khởi tạo:')).first();
      await expect(baselineItem).toBeVisible({ timeout: 5000 });

      // 9. Test Quick Adjustment Card
      const quickAdjustCard = page.locator('[data-testid="price-history__quick-adjust-card"]').first();
      await expect(quickAdjustCard).toBeVisible();

      const priceInput = page.locator('[data-testid="price-history__input-new-price"]').first();
      await expect(priceInput).toBeVisible();

      const noteInput = page.locator('[data-testid="price-history__input-note"]').first();
      await expect(noteInput).toBeVisible();

      const submitBtn = page.locator('[data-testid="price-history__btn-submit"]').first();
      await expect(submitBtn).toBeVisible();

      // Verify submit button height compliance (28px - 36px)
      const submitBox = await submitBtn.boundingBox();
      expect(submitBox.height).toBeGreaterThanOrEqual(28);
      expect(submitBox.height).toBeLessThanOrEqual(36);

      // Enter a new test price different from current price
      const currentPriceText = await kpiBar.innerText();
      const targetPrice = currentPriceText.includes('1,680') ? 1690 : 1680;
      const targetPriceFormatted = targetPrice === 1690 ? '$1,690' : '$1,680';

      await priceInput.fill(String(targetPrice));
      await noteInput.fill('E2E Playwright Mobile Test Adjustment');

      // Click submit
      await submitBtn.click();

      // Verify update in Current Price KPI
      await expect(page.locator(`text=${targetPriceFormatted}`).first()).toBeVisible({ timeout: 10000 });

      // 10. Check Zero Horizontal Overflow on Mobile 430px
      const hasHorizontalOverflow = await page.evaluate(() => {
        const modal = document.querySelector('div[role="dialog"]') || document.querySelector('.overflow-y-auto');
        if (!modal) return false;
        return modal.scrollWidth > modal.clientWidth + 1;
      });
      expect(hasHorizontalOverflow).toBe(false);

      // 11. Capture Visual Audit Screenshot
      await page.screenshot({
        path: 'test-results/price-history-mobile-430px.png',
        fullPage: false
      });
    });
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Desktop Viewport (1280px x 800px)
  // --------------------------------------------------------------------------
  test.describe('Desktop Viewport (1280px)', () => {
    test.use({
      channel: 'chrome',
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 800 }
    });

    test('Desktop: Verify timeline layout, percentage badge, and close modal', async ({ page }) => {
      await page.goto('https://localhost:5001', { waitUntil: 'networkidle' });

      // Open Modal
      const editButton = page.locator(`[data-testid="inventory__action-edit--btn-${TARGET_ID}"]`);
      await editButton.click();

      // Switch to Price History Tab
      const priceTab = page.locator('[data-testid="painting-detail__tab-price-history"]')
        .or(page.locator('button:has-text("Nhật Ký Giá")'));
      await priceTab.click();

      // Verify Diff Badge (+$, +%) or Mốc ban đầu
      const diffBadge = page.locator('span:has-text("%")').or(page.locator('text=Mốc ban đầu')).first();
      await expect(diffBadge).toBeVisible();

      // Capture Desktop Screenshot
      await page.screenshot({
        path: 'test-results/price-history-desktop.png',
        fullPage: false
      });

      // Close modal
      const closeBtn = page.locator('button:has-text("Đóng")')
        .or(page.locator('button:has(svg.lucide-x)'));
      await closeBtn.first().click();

      await expect(page.locator('text=Chi Tiết Hồ Sơ Tác Phẩm')).not.toBeVisible();
    });
  });
});
