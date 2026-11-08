// test/adversarial-showlist-table.test.mjs
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = process.env.TEST_URL || 'https://127.0.0.1:5001';

async function getPlaywright() {
  try {
    return await import('playwright');
  } catch {
    return await import('/Users/mac/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs');
  }
}

// Helper to generate N mock paintings across artists
function generateMockPaintings(count) {
  const artists = ['Dương Văn Sen', 'Bùi Xuân Phái', 'Nguyễn Tư Nghiêm', 'Trần Lưu Hậu'];
  const mediums = ['Sơn mài', 'Sơn dầu', 'Lụa', 'Màu nước'];
  const paintings = [];

  for (let i = 1; i <= count; i++) {
    const artist = artists[(i - 1) % artists.length];
    const medium = mediums[(i - 1) % mediums.length];
    const id = `MOCK-${String(i).padStart(3, '0')}`;
    paintings.push({
      id,
      ten_tac_pham: `Tác Phẩm Mẫu Số ${i}`,
      tac_gia: artist,
      chat_lieu: medium,
      tinh_trang: 'chua_ban',
      gia: 1000 + i * 50,
      ngay_cap_nhat_gia_gan_nhat: '08-11-2026',
      kich_thuoc_tranh: '60x80cm',
      kich_thuoc_khung_tranh: '70x90cm',
      nam_sang_tac: String(2010 + (i % 15)),
      khach_hang: '',
      hoa_don: '',
      da_in_tag: false,
      hinh_anh: ['/binhminh_logo.png'],
      thumbnail_url: '/binhminh_logo.png',
      qr_target_url: `https://192.168.0.111:5001/tranh/${id}`
    });
  }
  return paintings;
}

describe('Adversarial Verification: Show List Continuous Scrolling vs Table View Pagination', async () => {
  let browser;
  let context;

  before(async () => {
    const { chromium } = await getPlaywright();
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true
    });
    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      ignoreHTTPSErrors: true
    });
  });

  after(async () => {
    if (context) await context.close();
    if (browser) await browser.close();
  });

  // --------------------------------------------------------------------------
  // TEST 1: Table View (ExcelGrid) - Complete Pagination Controls Functional
  // --------------------------------------------------------------------------
  await test('TC-TABLE-01: Table View (ExcelGrid) preserves 100% functional pagination controls', async () => {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });

      // Verify table is visible
      const table = page.locator('table');
      await table.waitFor({ state: 'visible', timeout: 10000 });

      // Verify StickyPaginationBar exists
      const paginationBar = page.locator('div.sticky.bottom-0');
      await paginationBar.waitFor({ state: 'visible', timeout: 5000 });

      // Parse current total items dynamically
      const counterText = await paginationBar.innerText();
      const match = counterText.match(/tổng\s+(\d+)\s+tác phẩm/);
      assert.ok(match, `Pagination counter must include total count, got: "${counterText}"`);
      const totalItems = Number(match[1]);
      assert.ok(totalItems > 0, `Total items must be greater than 0, got ${totalItems}`);

      // Locate page size selector dropdown
      const pageSizeSelect = paginationBar.locator('select');
      await pageSizeSelect.waitFor({ state: 'visible', timeout: 3000 });

      // Verify pageSizeOptions [6, 10, 14, 25, 'all']
      const options = await pageSizeSelect.locator('option').allInnerTexts();
      assert.ok(options.some(o => o.includes('6')), 'Page size selector must include 6');
      assert.ok(options.some(o => o.includes('10')), 'Page size selector must include 10');
      assert.ok(options.some(o => o.includes('14')), 'Page size selector must include 14');
      assert.ok(options.some(o => o.includes('Tất cả')), 'Page size selector must include "Tất cả" (all)');

      // 1. Change page size to 6 -> test multi-page navigation
      await pageSizeSelect.selectOption('6');
      await page.waitForTimeout(300);

      const counterAfter6 = await paginationBar.innerText();
      assert.ok(
        counterAfter6.includes('1–6') || counterAfter6.includes('1-6'),
        `Counter after selecting 6 must show 1-6, got: "${counterAfter6}"`
      );

      // Verify exactly 6 rows rendered in tbody
      const rowsPage1 = await page.locator('table tbody tr[id^="row-"]').count();
      assert.equal(rowsPage1, 6, `Page 1 with pageSize=6 must render exactly 6 rows, got ${rowsPage1}`);

      // Check navigation buttons state on Page 1
      const btnFirst = paginationBar.locator('button[title="Trang đầu"]');
      const btnPrev = paginationBar.locator('button[title="Trang trước"]');
      const btnNext = paginationBar.locator('button[title="Trang sau"]');
      const btnLast = paginationBar.locator('button[title="Trang cuối"]');

      assert.equal(await btnFirst.isDisabled(), true, 'First button must be disabled on page 1');
      assert.equal(await btnPrev.isDisabled(), true, 'Prev button must be disabled on page 1');
      assert.equal(await btnNext.isDisabled(), false, 'Next button must be enabled on page 1');
      assert.equal(await btnLast.isDisabled(), false, 'Last button must be enabled on page 1');

      // 2. Click 'Next' (Trang sau) -> Page 2
      await btnNext.click();
      await page.waitForTimeout(300);

      const counterPage2 = await paginationBar.innerText();
      assert.ok(
        counterPage2.includes('7–12') || counterPage2.includes('7-12'),
        `Counter on page 2 must show 7-12, got: "${counterPage2}"`
      );
      const rowsPage2 = await page.locator('table tbody tr[id^="row-"]').count();
      assert.equal(rowsPage2, 6, `Page 2 must render 6 rows, got ${rowsPage2}`);
      assert.equal(await btnFirst.isDisabled(), false, 'First button enabled on page 2');
      assert.equal(await btnPrev.isDisabled(), false, 'Prev button enabled on page 2');
      assert.equal(await btnNext.isDisabled(), false, 'Next button enabled on page 2');
      assert.equal(await btnLast.isDisabled(), false, 'Last button enabled on page 2');

      // 3. Click 'Last' (Trang cuối)
      await btnLast.click();
      await page.waitForTimeout(300);

      const totalPages = Math.ceil(totalItems / 6);
      const lastPageStart = (totalPages - 1) * 6 + 1;
      const expectedLastRows = totalItems - (totalPages - 1) * 6;

      const counterLast = await paginationBar.innerText();
      assert.ok(
        counterLast.includes(`${lastPageStart}–${totalItems}`) || counterLast.includes(`${lastPageStart}-${totalItems}`),
        `Counter on last page must show ${lastPageStart}-${totalItems}, got: "${counterLast}"`
      );
      const rowsLast = await page.locator('table tbody tr[id^="row-"]').count();
      assert.equal(rowsLast, expectedLastRows, `Last page must render ${expectedLastRows} rows, got ${rowsLast}`);
      assert.equal(await btnNext.isDisabled(), true, 'Next button must be disabled on last page');
      assert.equal(await btnLast.isDisabled(), true, 'Last button must be disabled on last page');

      // 4. Click 'Prev' (Trang trước) -> Back one page
      await btnPrev.click();
      await page.waitForTimeout(300);
      assert.equal(await btnNext.isDisabled(), false, 'Next button enabled after navigating back');

      // 5. Click 'First' (Trang đầu) -> Back to Page 1
      await btnFirst.click();
      await page.waitForTimeout(300);
      assert.ok((await paginationBar.innerText()).includes('1–6'), 'First button returns to page 1');
      assert.equal(await btnFirst.isDisabled(), true, 'First button disabled on page 1');

      // 6. Test direct numeric button clicking: click page '2'
      const numBtn2 = paginationBar.locator('button', { hasText: /^2$/ });
      if (await numBtn2.count() > 0) {
        await numBtn2.click();
        await page.waitForTimeout(300);
        assert.ok((await paginationBar.innerText()).includes('7–12'), 'Clicking page 2 button navigates to page 2');
      }

      // 7. Change page size to 'all' -> all rows rendered
      await pageSizeSelect.selectOption('all');
      await page.waitForTimeout(300);
      const rowsAll = await page.locator('table tbody tr[id^="row-"]').count();
      assert.equal(rowsAll, totalItems, `Selecting "all" must render all ${totalItems} rows, got ${rowsAll}`);
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // TEST 2: Show List View (ExhibitionView) - Continuous Scrolling (No Pagination)
  // --------------------------------------------------------------------------
  await test('TC-SHOWLIST-01: ExhibitionView renders all items continuously with ZERO pagination controls', async () => {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });

      // Open view switcher dropdown in Header
      const viewDropdownBtn = page.locator('header button:has-text("Quản Lý Kho (Excel)")')
        .or(page.locator('header button:has(svg.lucide-table-2)'));
      await viewDropdownBtn.click();

      // Click "Bảng Giá & Xuất PDF"
      const exhibitionOption = page.locator('button:has-text("Bảng Giá & Xuất PDF")');
      await exhibitionOption.waitFor({ state: 'visible', timeout: 5000 });
      await exhibitionOption.click();

      // Verify Exhibition View loaded
      const exportPdfBtn = page.locator('button:has-text("Xuất PDF Bảng Giá")');
      await exportPdfBtn.waitFor({ state: 'visible', timeout: 10000 });

      // 1. Assert ZERO pagination controls exist in the entire DOM
      const paginationSelect = await page.locator('select:has-text("tranh")').count();
      assert.equal(paginationSelect, 0, 'ExhibitionView must have ZERO page size select dropdowns');

      const btnFirst = await page.locator('button[title="Trang đầu"]').count();
      assert.equal(btnFirst, 0, 'ExhibitionView must have ZERO "Trang đầu" buttons');

      const btnPrev = await page.locator('button[title="Trang trước"]').count();
      assert.equal(btnPrev, 0, 'ExhibitionView must have ZERO "Trang trước" buttons');

      const btnNext = await page.locator('button[title="Trang sau"]').count();
      assert.equal(btnNext, 0, 'ExhibitionView must have ZERO "Trang sau" buttons');

      const btnLast = await page.locator('button[title="Trang cuối"]').count();
      assert.equal(btnLast, 0, 'ExhibitionView must have ZERO "Trang cuối" buttons');

      const stickyPaginationBar = await page.locator('.sticky.bottom-0:has-text("Hiển thị")').count();
      assert.equal(stickyPaginationBar, 0, 'ExhibitionView must have ZERO StickyPaginationBar components');

      // 2. Count rendered painting cards in Exhibition View
      const artistHeader = page.locator('h1:has-text("BẢNG GIÁ TRANH CỦA HS.")').first();
      await artistHeader.waitFor({ state: 'visible', timeout: 5000 });

      // 3. Verify native smooth scrolling is configured on html
      const scrollBehavior = await page.evaluate(() => {
        return window.getComputedStyle(document.documentElement).scrollBehavior;
      });
      assert.equal(scrollBehavior, 'smooth', 'html element must have scroll-behavior: smooth');
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // TEST 3: Customer Exhibition View (CustomerExhibitionView) - Continuous Scrolling
  // --------------------------------------------------------------------------
  await test('TC-GUEST-01: CustomerExhibitionView renders all items continuously with ZERO pagination controls', async () => {
    const page = await context.newPage();
    try {
      await page.goto(`${BASE_URL}/?view=guest`, { waitUntil: 'networkidle', timeout: 30000 });

      // Verify guest exhibition hall is loaded
      const guestHeader = page.locator('text=BỘ SƯU TẬP TÁC PHẨM CHỌN LỌC').first();
      await guestHeader.waitFor({ state: 'visible', timeout: 10000 });

      // 1. Assert ZERO pagination controls exist in the guest DOM
      const paginationSelect = await page.locator('select:has-text("tranh")').count();
      assert.equal(paginationSelect, 0, 'CustomerExhibitionView must have ZERO page size select dropdowns');

      const btnNext = await page.locator('button[title="Trang sau"]').count();
      assert.equal(btnNext, 0, 'CustomerExhibitionView must have ZERO "Trang sau" buttons');

      const btnPrev = await page.locator('button[title="Trang trước"]').count();
      assert.equal(btnPrev, 0, 'CustomerExhibitionView must have ZERO "Trang trước" buttons');

      const stickyPaginationBar = await page.locator('.sticky.bottom-0:has-text("Hiển thị")').count();
      assert.equal(stickyPaginationBar, 0, 'CustomerExhibitionView must have ZERO StickyPaginationBar components');

      // 2. Verify artist sections are rendered
      const artistTitle = page.locator('h2:has-text("BẢNG GIÁ TRANH CỦA HS.")').first();
      await artistTitle.waitFor({ state: 'visible', timeout: 5000 });
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // TEST 4: ADVERSARIAL STRESS TEST WITH 55 PAINTINGS ACROSS ARTISTS
  // --------------------------------------------------------------------------
  await test('TC-STRESS-55: Under 55 paintings, Show List views render ALL 55 continuously while Table View paginates cleanly', async () => {
    const mock55 = generateMockPaintings(55);
    const page = await context.newPage();

    // Intercept /api/paintings to return exactly 55 synthetic artworks
    await page.route('**/api/paintings', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count: 55, data: mock55 })
      });
    });

    try {
      // 4A. Test ExhibitionView with 55 paintings
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });

      const viewDropdownBtn = page.locator('header button:has-text("Quản Lý Kho (Excel)")')
        .or(page.locator('header button:has(svg.lucide-table-2)'));
      await viewDropdownBtn.click();
      const exhibitionOption = page.locator('button:has-text("Bảng Giá & Xuất PDF")');
      await exhibitionOption.click();

      await page.locator('button:has-text("Xuất PDF Bảng Giá")').waitFor({ state: 'visible', timeout: 10000 });

      // In the old broken implementation with pageSize=6, this only rendered 6!
      // In the new unbounded continuous scrolling implementation, this must render ALL 55 artworks!
      const exhibitionArtworkCells = await page.locator('div.font-serif.tracking-tight').count();
      assert.equal(
        exhibitionArtworkCells,
        55,
        `CRITICAL REGRESSION TEST: ExhibitionView must render ALL 55 items continuously in DOM without slicing, got ${exhibitionArtworkCells}`
      );

      // Verify ZERO pagination bars exist
      const exhibitionBars = await page.locator('.sticky.bottom-0:has-text("Hiển thị")').count();
      assert.equal(exhibitionBars, 0, 'ExhibitionView with 55 items must have ZERO pagination bars');

      // 4B. Test CustomerExhibitionView with 55 paintings
      await page.goto(`${BASE_URL}/?view=guest`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.locator('text=BỘ SƯU TẬP TÁC PHẨM CHỌN LỌC').first().waitFor({ state: 'visible', timeout: 10000 });

      const guestArtworkCells = await page.locator('div.font-serif.tracking-tight').count();
      assert.equal(
        guestArtworkCells,
        55,
        `CRITICAL REGRESSION TEST: CustomerExhibitionView must render ALL 55 items continuously, got ${guestArtworkCells}`
      );

      const guestBars = await page.locator('.sticky.bottom-0:has-text("Hiển thị")').count();
      assert.equal(guestBars, 0, 'CustomerExhibitionView with 55 items must have ZERO pagination bars');

      // 4C. Test ExcelGrid (Table View) with 55 paintings: PAGINATION MUST FUNCTION PRECISELY
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.locator('table').waitFor({ state: 'visible', timeout: 10000 });

      const paginationBar = page.locator('div.sticky.bottom-0');
      await paginationBar.waitFor({ state: 'visible', timeout: 5000 });

      const counter55 = await paginationBar.innerText();
      assert.ok(
        counter55.includes('55'),
        `ExcelGrid with 55 items must reflect total 55 items, got: "${counter55}"`
      );

      // Select pageSize = 10
      const selectBox = paginationBar.locator('select');
      await selectBox.selectOption('10');
      await page.waitForTimeout(300);

      // With 55 items and pageSize 10: total pages = ceil(55/10) = 6
      const rangeText = await paginationBar.innerText();
      assert.ok(
        rangeText.includes('1–10') || rangeText.includes('1-10'),
        `Counter must show 1-10, got: "${rangeText}"`
      );

      // Page 1 has 10 rows
      const rowsP1 = await page.locator('table tbody tr[id^="row-"]').count();
      assert.equal(rowsP1, 10, `Page 1 of 55 items must render 10 rows, got ${rowsP1}`);

      // Navigate to last page
      const btnLast = paginationBar.locator('button[title="Trang cuối"]');
      await btnLast.click();
      await page.waitForTimeout(300);

      const lastRangeText = await paginationBar.innerText();
      assert.ok(
        lastRangeText.includes('51–55') || lastRangeText.includes('51-55'),
        `Last page counter must show 51-55, got: "${lastRangeText}"`
      );
      const rowsLastPage = await page.locator('table tbody tr[id^="row-"]').count();
      assert.equal(rowsLastPage, 5, `Last page of 55 items (pageSize=10) must render remaining 5 rows, got ${rowsLastPage}`);

      // Change to 'all' -> all 55 rows rendered in table
      await selectBox.selectOption('all');
      await page.waitForTimeout(400);
      const rowsAll55 = await page.locator('table tbody tr[id^="row-"]').count();
      assert.equal(rowsAll55, 55, `Selecting "all" must render all 55 rows in table, got ${rowsAll55}`);
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // TEST 5: BOUNDARY CASE WITH 1 PAINTING
  // --------------------------------------------------------------------------
  await test('TC-BOUNDARY-01: Under 1 single painting, all views handle single item without crashing or chunking', async () => {
    const mock1 = generateMockPaintings(1);
    const page = await context.newPage();

    await page.route('**/api/paintings', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count: 1, data: mock1 })
      });
    });

    try {
      // 5A. ExhibitionView with 1 item
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
      const viewDropdownBtn = page.locator('header button:has-text("Quản Lý Kho (Excel)")')
        .or(page.locator('header button:has(svg.lucide-table-2)'));
      await viewDropdownBtn.click();
      await page.locator('button:has-text("Bảng Giá & Xuất PDF")').click();

      await page.locator('button:has-text("Xuất PDF Bảng Giá")').waitFor({ state: 'visible', timeout: 10000 });
      const cellCount1 = await page.locator('div.font-serif.tracking-tight').count();
      assert.equal(cellCount1, 1, 'ExhibitionView with 1 item must render exactly 1 item');
      const barCount1 = await page.locator('.sticky.bottom-0:has-text("Hiển thị")').count();
      assert.equal(barCount1, 0, 'ExhibitionView must have ZERO pagination bars');

      // 5B. CustomerExhibitionView with 1 item
      await page.goto(`${BASE_URL}/?view=guest`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.locator('text=BỘ SƯU TẬP TÁC PHẨM CHỌN LỌC').first().waitFor({ state: 'visible', timeout: 10000 });
      const guestCell1 = await page.locator('div.font-serif.tracking-tight').count();
      assert.equal(guestCell1, 1, 'CustomerExhibitionView with 1 item must render exactly 1 item');
      const guestBar1 = await page.locator('.sticky.bottom-0:has-text("Hiển thị")').count();
      assert.equal(guestBar1, 0, 'CustomerExhibitionView must have ZERO pagination bars');

      // 5C. ExcelGrid with 1 item
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.locator('table').waitFor({ state: 'visible', timeout: 10000 });
      const paginationBar = page.locator('div.sticky.bottom-0');
      const counter1 = await paginationBar.innerText();
      assert.ok(counter1.includes('1–1') || counter1.includes('1-1'), `Counter must show 1-1 / tổng 1, got: "${counter1}"`);

      // All nav buttons must be disabled
      assert.equal(await paginationBar.locator('button[title="Trang đầu"]').isDisabled(), true);
      assert.equal(await paginationBar.locator('button[title="Trang trước"]').isDisabled(), true);
      assert.equal(await paginationBar.locator('button[title="Trang sau"]').isDisabled(), true);
      assert.equal(await paginationBar.locator('button[title="Trang cuối"]').isDisabled(), true);
    } finally {
      await page.close();
    }
  });

  // --------------------------------------------------------------------------
  // TEST 6: BOUNDARY CASE WITH 0 PAINTINGS (EMPTY DATASET)
  // --------------------------------------------------------------------------
  await test('TC-BOUNDARY-00: Under 0 paintings, all views render clean empty states without crashes', async () => {
    const page = await context.newPage();

    await page.route('**/api/paintings', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, count: 0, data: [] })
      });
    });

    try {
      // 6A. ExhibitionView with 0 items
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
      const viewDropdownBtn = page.locator('header button:has-text("Quản Lý Kho (Excel)")')
        .or(page.locator('header button:has(svg.lucide-table-2)'));
      await viewDropdownBtn.click();
      await page.locator('button:has-text("Bảng Giá & Xuất PDF")').click();

      // Verify empty state is displayed gracefully
      const emptyMsgEx = page.locator('text=Không có tác phẩm nào trong danh mục triển lãm hiện tại');
      await emptyMsgEx.waitFor({ state: 'visible', timeout: 10000 });
      const barCount0 = await page.locator('.sticky.bottom-0:has-text("Hiển thị")').count();
      assert.equal(barCount0, 0, 'ExhibitionView must have ZERO pagination bars on empty dataset');

      // 6B. CustomerExhibitionView with 0 items
      await page.goto(`${BASE_URL}/?view=guest`, { waitUntil: 'networkidle', timeout: 30000 });
      const emptyMsgGuest = page.locator('text=Không tìm thấy tác phẩm nào phù hợp với bộ lọc đang chọn');
      await emptyMsgGuest.waitFor({ state: 'visible', timeout: 10000 });
      const guestBar0 = await page.locator('.sticky.bottom-0:has-text("Hiển thị")').count();
      assert.equal(guestBar0, 0, 'CustomerExhibitionView must have ZERO pagination bars on empty dataset');

      // 6C. ExcelGrid with 0 items
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
      const emptyMsgTable = page.locator('text=Không tìm thấy tác phẩm');
      await emptyMsgTable.waitFor({ state: 'visible', timeout: 10000 });
      const paginationBar = page.locator('div.sticky.bottom-0');
      const counter0 = await paginationBar.innerText();
      assert.ok(counter0.includes('0–0') || counter0.includes('0-0'), `Counter must show 0-0 / tổng 0, got: "${counter0}"`);
    } finally {
      await page.close();
    }
  });
});
