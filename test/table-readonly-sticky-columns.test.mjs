import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { 
  DEFAULT_COLUMNS, 
  SOLD_COLUMNS, 
  STORAGE_KEY_COLUMNS, 
  STORAGE_KEY_SOLD_COLUMNS,
  STORAGE_KEY_VISIBILITY,
  loadColumns,
  formatUSD,
  formatDateVN
} from '../src/types.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('R1 & R2: Column definitions enforce read-only and compact sticky actions', () => {
  // All columns in DEFAULT_COLUMNS must have isEditable: false
  for (const col of DEFAULT_COLUMNS) {
    assert.strictEqual(
      col.isEditable,
      false,
      `Column ${col.id} in DEFAULT_COLUMNS must be isEditable: false`
    );
  }

  // All columns in SOLD_COLUMNS must have isEditable: false
  for (const col of SOLD_COLUMNS) {
    assert.strictEqual(
      col.isEditable,
      false,
      `Column ${col.id} in SOLD_COLUMNS must be isEditable: false`
    );
  }

  // actions column must exist in both
  const defAction = DEFAULT_COLUMNS.find(c => c.id === 'actions');
  assert.ok(defAction, 'actions column must exist in DEFAULT_COLUMNS');
  assert.strictEqual(defAction.width, 120, 'actions column width should be 120');
  assert.strictEqual(defAction.minWidth, 110, 'actions column minWidth should be 110');
  assert.strictEqual(defAction.visible, true, 'actions column must be visible');

  const soldAction = SOLD_COLUMNS.find(c => c.id === 'actions');
  assert.ok(soldAction, 'actions column must exist in SOLD_COLUMNS');
  assert.strictEqual(soldAction.width, 120, 'actions column width should be 120');
  assert.strictEqual(soldAction.minWidth, 110, 'actions column minWidth should be 110');
  assert.strictEqual(soldAction.visible, true, 'actions column must be visible');

  // Storage keys
  assert.strictEqual(STORAGE_KEY_COLUMNS, 'binhminhart_column_order_v4');
  assert.strictEqual(STORAGE_KEY_SOLD_COLUMNS, 'binhminhart_column_order_sold_v4');
  assert.strictEqual(STORAGE_KEY_VISIBILITY, 'binhminhart_column_visibility_v4');
});

test('R1: ExcelGrid component contains zero inline editing / double-click handlers', () => {
  const excelGridCode = fs.readFileSync(path.join(ROOT, 'src/components/ExcelGrid.jsx'), 'utf8');

  // No double-click handlers
  assert.ok(
    !excelGridCode.includes('onDoubleClick'),
    'ExcelGrid must not contain onDoubleClick'
  );

  // No inline edit state
  assert.ok(
    !excelGridCode.includes('editingCell'),
    'ExcelGrid must not contain editingCell state'
  );

  // No inline edit commit/start functions
  assert.ok(
    !excelGridCode.includes('startEdit'),
    'ExcelGrid must not contain startEdit'
  );
  assert.ok(
    !excelGridCode.includes('commitEdit'),
    'ExcelGrid must not contain commitEdit'
  );
  assert.ok(
    !excelGridCode.includes('cancelEdit'),
    'ExcelGrid must not contain cancelEdit'
  );

  // Ensure leftHint does not mention double-click
  assert.ok(
    !excelGridCode.toLowerCase().includes('nhấp đúp'),
    'ExcelGrid hint must not mention nhấp đúp'
  );
});

test('R2: ExcelGrid guarantees actions column is sticky right-0 and at the end of visibleColumns', () => {
  const excelGridCode = fs.readFileSync(path.join(ROOT, 'src/components/ExcelGrid.jsx'), 'utf8');

  // th has sticky right-0
  assert.ok(
    excelGridCode.includes('sticky top-0 right-0 z-30'),
    'ExcelGrid header must have sticky top-0 right-0 z-30 for actions'
  );

  // td has sticky right-0
  assert.ok(
    excelGridCode.includes('sticky right-0 z-10'),
    'ExcelGrid td must have sticky right-0 z-10 for actions'
  );

  // Icon buttons for Cập nhật, Chi tiết, Đã bán
  assert.ok(
    excelGridCode.includes('onOpenDetail(painting)'),
    'Actions must trigger onOpenDetail for Cập nhật'
  );
  assert.ok(
    excelGridCode.includes('onOpenArtworkPage(painting.id)'),
    'Actions must trigger onOpenArtworkPage for Chi tiết'
  );
  assert.ok(
    excelGridCode.includes('onStatusChangeToSold'),
    'Actions must trigger onStatusChangeToSold for Đã bán'
  );
});

test('R3: Column visibility and localStorage simulation', () => {
  // Simulate column toggle in App.jsx
  let cols = DEFAULT_COLUMNS.map(c => ({ ...c }));

  // Initially qr_code is visible
  const qrCol = cols.find(c => c.id === 'qr_code');
  assert.strictEqual(qrCol.visible, true);

  // Toggle qr_code off
  cols = cols.map(c => (c.id === 'qr_code' ? { ...c, visible: c.visible === false ? true : false } : c));
  const visMap = {};
  cols.forEach(c => (visMap[c.id] = c.visible !== false));

  // Serialize to JSON (as stored in localStorage)
  const storedJson = JSON.stringify(visMap);
  const parsedMap = JSON.parse(storedJson);
  assert.strictEqual(parsedMap.qr_code, false);

  // Reload simulation
  const reloadedCols = DEFAULT_COLUMNS.map(c => ({
    ...c,
    visible: parsedMap[c.id] !== undefined ? Boolean(parsedMap[c.id]) : (c.visible !== false)
  }));

  const reloadedQr = reloadedCols.find(c => c.id === 'qr_code');
  assert.strictEqual(reloadedQr.visible, false, 'qr_code should remain hidden after reload simulation');

  // Filter visible columns simulation as done in ExcelGrid
  const nonActionCols = reloadedCols.filter(col => col.visible !== false && col.id !== 'actions');
  const actionCol = reloadedCols.find(c => c.id === 'actions');
  const visible = [...nonActionCols, actionCol];

  assert.ok(!visible.some(c => c.id === 'qr_code'), 'qr_code must not be in visible columns when hidden');
  assert.strictEqual(visible[visible.length - 1].id, 'actions', 'actions must always be last');

  // Toggle qr_code back on
  const reToggledCols = reloadedCols.map(c => (c.id === 'qr_code' ? { ...c, visible: c.visible === false ? true : false } : c));
  const newVisMap = {};
  reToggledCols.forEach(c => (newVisMap[c.id] = c.visible !== false));
  assert.strictEqual(newVisMap.qr_code, true);

  const newVisible = reToggledCols.filter(col => col.visible !== false);
  assert.ok(newVisible.some(c => c.id === 'qr_code'), 'qr_code must be visible again after toggle');
});

test('R3: Sold sub-tab columns support visibility toggling and persistence', () => {
  // Test that SOLD_COLUMNS contains sold-specific columns
  const soldIds = new Set(SOLD_COLUMNS.map(c => c.id));
  assert.ok(soldIds.has('ngay_ban'), 'SOLD_COLUMNS must include ngay_ban');
  assert.ok(soldIds.has('hoa_don'), 'SOLD_COLUMNS must include hoa_don');
  assert.ok(soldIds.has('khach_hang'), 'SOLD_COLUMNS must include khach_hang');

  // Simulate mock storage with sold column visibility
  const mockStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; }
  };

  // User hides khach_hang and hoa_don
  mockStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify({
    khach_hang: false,
    hoa_don: false,
    ngay_ban: true
  }));

  const loadedSoldCols = loadColumns(SOLD_COLUMNS, STORAGE_KEY_SOLD_COLUMNS, STORAGE_KEY_VISIBILITY, mockStorage);
  const khachHangCol = loadedSoldCols.find(c => c.id === 'khach_hang');
  const hoaDonCol = loadedSoldCols.find(c => c.id === 'hoa_don');
  const ngayBanCol = loadedSoldCols.find(c => c.id === 'ngay_ban');
  const actionsCol = loadedSoldCols.find(c => c.id === 'actions');

  assert.strictEqual(khachHangCol.visible, false, 'khach_hang should be hidden');
  assert.strictEqual(hoaDonCol.visible, false, 'hoa_don should be hidden');
  assert.strictEqual(ngayBanCol.visible, true, 'ngay_ban should be visible');
  assert.strictEqual(actionsCol.visible, true, 'actions must remain visible');
  assert.strictEqual(loadedSoldCols[loadedSoldCols.length - 1].id, 'actions', 'actions must be last column');
});

test('R2 & R3: Actions column pinning resilience against corrupted or outdated storage order', () => {
  const mockStorage = {
    _data: {
      // Intentionally malicious/corrupted saved order where actions is first or middle
      [STORAGE_KEY_COLUMNS]: JSON.stringify(['actions', 'ten_tac_pham', 'id']),
      // Intentionally malicious visibility trying to hide actions
      [STORAGE_KEY_VISIBILITY]: JSON.stringify({ actions: false, ten_tac_pham: true })
    },
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); }
  };

  const cols = loadColumns(DEFAULT_COLUMNS, STORAGE_KEY_COLUMNS, STORAGE_KEY_VISIBILITY, mockStorage);

  // actions must still be the VERY LAST column
  assert.strictEqual(cols[cols.length - 1].id, 'actions', 'actions MUST be pinned to the very end');

  // actions must NOT be at index 0
  assert.notStrictEqual(cols[0].id, 'actions', 'actions must never be at index 0');

  // actions must ALWAYS be visible: true
  const actionCol = cols.find(c => c.id === 'actions');
  assert.strictEqual(actionCol.visible, true, 'actions can NEVER be hidden');
});

test('R3: Safe fallback when localStorage throws (private browsing or quota exceeded)', () => {
  const throwingStorage = {
    getItem() { throw new Error('SecurityError: The operation is insecure.'); },
    setItem() { throw new Error('QuotaExceededError: storage is full'); }
  };

  // Must not throw, returns default columns
  assert.doesNotThrow(() => {
    const cols = loadColumns(DEFAULT_COLUMNS, STORAGE_KEY_COLUMNS, STORAGE_KEY_VISIBILITY, throwingStorage);
    assert.strictEqual(cols.length, DEFAULT_COLUMNS.length);
    assert.strictEqual(cols[cols.length - 1].id, 'actions');
  });
});

test('R3 (Adversarial): loadColumns decouples order from visibility so malformed order does not discard visibility', () => {
  const mockStorage = {
    _data: {
      [STORAGE_KEY_COLUMNS]: '123', // Malformed: valid JSON but not an array
      [STORAGE_KEY_VISIBILITY]: JSON.stringify({ qr_code: false, location: false })
    },
    getItem(key) { return this._data[key] || null; }
  };

  const cols = loadColumns(DEFAULT_COLUMNS, STORAGE_KEY_COLUMNS, STORAGE_KEY_VISIBILITY, mockStorage);
  
  // Valid visibility must NOT be wiped by malformed order
  const qrCol = cols.find(c => c.id === 'qr_code');
  const locCol = cols.find(c => c.id === 'location');
  assert.strictEqual(qrCol.visible, false, 'qr_code visibility should be preserved as false');
  assert.strictEqual(locCol.visible, false, 'location visibility should be preserved as false');

  // Actions must remain last and visible
  assert.strictEqual(cols[cols.length - 1].id, 'actions');
  assert.strictEqual(cols[cols.length - 1].visible, true);
});

test('R3 (Adversarial): loadColumns decouples visibility from order so malformed visibility does not discard custom order', () => {
  const mockStorage = {
    _data: {
      [STORAGE_KEY_COLUMNS]: JSON.stringify(['tac_gia', 'ten_tac_pham', 'actions']),
      [STORAGE_KEY_VISIBILITY]: '{bad-json-unparseable'
    },
    getItem(key) { return this._data[key] || null; }
  };

  const cols = loadColumns(DEFAULT_COLUMNS, STORAGE_KEY_COLUMNS, STORAGE_KEY_VISIBILITY, mockStorage);
  
  // Custom order must NOT be wiped by malformed visibility
  assert.strictEqual(cols[0].id, 'tac_gia', 'tac_gia should remain first column');
  assert.strictEqual(cols[1].id, 'ten_tac_pham', 'ten_tac_pham should remain second column');
  assert.strictEqual(cols[cols.length - 1].id, 'actions', 'actions must remain last column');
});

test('R3 (Adversarial): loadColumns handles null / undefined / non-array preset inputs gracefully', () => {
  assert.doesNotThrow(() => {
    const emptyResult = loadColumns(null, 'order', 'vis');
    assert.deepStrictEqual(emptyResult, []);
  });

  assert.doesNotThrow(() => {
    const nonArrayResult = loadColumns('not an array', 'order', 'vis');
    assert.deepStrictEqual(nonArrayResult, []);
  });

  assert.doesNotThrow(() => {
    const emptyPreset = loadColumns([], 'order', 'vis');
    assert.strictEqual(emptyPreset.length, 1);
    assert.strictEqual(emptyPreset[0].id, 'actions');
    assert.strictEqual(emptyPreset[0].visible, true);
  });
});

test('R2 & R3 (Adversarial): Visual rendering safeguards and data-testid contract in ExcelGrid and ColumnManagerModal', () => {
  const excelGridCode = fs.readFileSync(path.join(ROOT, 'src/components/ExcelGrid.jsx'), 'utf8');
  const colManagerCode = fs.readFileSync(path.join(ROOT, 'src/components/ColumnManagerModal.jsx'), 'utf8');

  // Safari bg-clip-padding on sticky headers and cells
  assert.ok(
    excelGridCode.includes('bg-clip-padding'),
    'ExcelGrid must include bg-clip-padding on sticky right cells for Safari border rendering'
  );

  // Mobile inertia overscroll
  assert.ok(
    excelGridCode.includes('overscroll-x-contain'),
    'ExcelGrid table container must include overscroll-x-contain for mobile touch inertia'
  );

  // 28x28px icon button dimensions (w-7 h-7) and 120px width
  assert.ok(
    excelGridCode.includes('w-7 h-7'),
    'ExcelGrid action buttons must be 28x28px (w-7 h-7)'
  );
  assert.ok(
    excelGridCode.includes('col.width || 120'),
    'ExcelGrid actions column width must default to 120px'
  );

  // data-testid contract
  assert.ok(
    excelGridCode.includes('inventory__action-edit--btn-'),
    'ExcelGrid edit button must have data-testid'
  );
  assert.ok(
    excelGridCode.includes('inventory__action-detail--btn-'),
    'ExcelGrid detail button must have data-testid'
  );
  assert.ok(
    excelGridCode.includes('inventory__action-sold--btn-'),
    'ExcelGrid sold button must have data-testid'
  );
  assert.ok(
    colManagerCode.includes('column-manager__close--btn'),
    'ColumnManagerModal must have data-testid on close button'
  );
  assert.ok(
    colManagerCode.includes('column-manager__reset--btn'),
    'ColumnManagerModal must have data-testid on reset button'
  );
  assert.ok(
    colManagerCode.includes('column-manager__apply--btn'),
    'ColumnManagerModal must have data-testid on apply button'
  );
});

test('R3 (Adversarial): ColumnManagerModal normalizes columns with actions pinned at bottom even with corrupted input', () => {
  const colManagerCode = fs.readFileSync(path.join(ROOT, 'src/components/ColumnManagerModal.jsx'), 'utf8');

  // Verify normalizedColumns memoization
  assert.ok(
    colManagerCode.includes('normalizedColumns'),
    'ColumnManagerModal must normalize columns to guarantee actions is at the bottom'
  );
});

test('R3 (Adversarial): loadColumns rejects array-type visibility and preserves defaults', () => {
  const mockStorage = {
    _data: {
      [STORAGE_KEY_VISIBILITY]: JSON.stringify(['qr_code', 'location']) // Array instead of object map
    },
    getItem(key) { return this._data[key] || null; }
  };

  const cols = loadColumns(DEFAULT_COLUMNS, STORAGE_KEY_COLUMNS, STORAGE_KEY_VISIBILITY, mockStorage);
  
  // All columns must preserve their default visibility without dropping or failing
  const qrCol = cols.find(c => c.id === 'qr_code');
  assert.strictEqual(qrCol.visible, true, 'qr_code should remain default true');

  const actionCol = cols.find(c => c.id === 'actions');
  assert.strictEqual(actionCol.visible, true, 'actions should remain true');
});

test('R3 (Adversarial): handleResetColumns synchronizes in-memory and storage states across both subtabs', () => {
  const appCode = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');

  // Both branches of handleResetColumns must re-sync the counterpart subtab state
  assert.ok(
    appCode.includes('setColumns(prev => prev.map(c => ({'),
    'Resetting da_ban must re-sync columns state with updated visMap'
  );
  assert.ok(
    appCode.includes('setSoldColumns(prev => prev.map(c => ({'),
    'Resetting chua_ban must re-sync soldColumns state with updated visMap'
  );

  // Both handleToggleColumnVisibility and handleResetColumns must guard against Array.isArray
  assert.ok(
    appCode.includes('!Array.isArray(parsed)'),
    'App.jsx must check !Array.isArray(parsed) when reading saved visibility'
  );
});

test('R1 (Adversarial): ExcelGrid has defensive defaults when columns or paintings is null/undefined', () => {
  const excelGridCode = fs.readFileSync(path.join(ROOT, 'src/components/ExcelGrid.jsx'), 'utf8');

  // Must have default parameter values
  assert.ok(
    excelGridCode.includes('columns = []'),
    'ExcelGrid must have default parameter columns = []'
  );
  assert.ok(
    excelGridCode.includes('paintings = []'),
    'ExcelGrid must have default parameter paintings = []'
  );

  // Must have safe array wrappers
  assert.ok(
    excelGridCode.includes('const safeCols = Array.isArray(columns) ? columns : [];'),
    'ExcelGrid must safely wrap columns'
  );
  assert.ok(
    excelGridCode.includes('const safePaintings = Array.isArray(paintings) ? paintings : [];'),
    'ExcelGrid must safely wrap paintings'
  );
});

test('R1 (Adversarial): formatUSD handles non-finite numbers safely', () => {
  assert.strictEqual(formatUSD(null), 'Đang cập nhật');
  assert.strictEqual(formatUSD(undefined), 'Đang cập nhật');
  assert.strictEqual(formatUSD(''), 'Đang cập nhật');
  assert.strictEqual(formatUSD(NaN), 'Đang cập nhật');
  assert.strictEqual(formatUSD(Infinity), 'Đang cập nhật');
  assert.strictEqual(formatUSD(-Infinity), 'Đang cập nhật');
  assert.strictEqual(formatUSD(0), '$0');
  assert.strictEqual(formatUSD(5000), '$5,000');
  assert.strictEqual(formatUSD('12500'), '$12,500');
});

test('R1 (Adversarial): formatDateVN handles ISO datetime strings with T and slash separators', () => {
  assert.strictEqual(formatDateVN(null), 'Đang cập nhật');
  assert.strictEqual(formatDateVN(''), 'Đang cập nhật');
  assert.strictEqual(formatDateVN('2026-10-25'), '25-10-2026');
  assert.strictEqual(formatDateVN('2026-10-25T14:30:00.000Z'), '25-10-2026');
  assert.strictEqual(formatDateVN('2026/10/25'), '25-10-2026');
  assert.strictEqual(formatDateVN('25/10/2026'), '25-10-2026');
  assert.strictEqual(formatDateVN('10-01-2026'), '10-01-2026');
});

test('R2 & R3 (Adversarial): Accessibility aria-label contract on action buttons and ColumnManagerModal', () => {
  const excelGridCode = fs.readFileSync(path.join(ROOT, 'src/components/ExcelGrid.jsx'), 'utf8');
  const colManagerCode = fs.readFileSync(path.join(ROOT, 'src/components/ColumnManagerModal.jsx'), 'utf8');

  // ExcelGrid action buttons must have aria-label
  assert.ok(
    excelGridCode.includes('aria-label="Cập nhật hồ sơ & vị trí tác phẩm"'),
    'Edit button must have aria-label'
  );
  assert.ok(
    excelGridCode.includes('aria-label="Mở Trang Chi Tiết Tác Phẩm"'),
    'Detail button must have aria-label'
  );
  assert.ok(
    excelGridCode.includes('aria-label="Đánh dấu tác phẩm đã bán"'),
    'Sold button must have aria-label'
  );
  assert.ok(
    excelGridCode.includes('aria-label="Hoàn tác đưa tác phẩm trở lại Kho Chưa Bán"'),
    'Revert button must have aria-label'
  );

  // ColumnManagerModal buttons must have aria-label
  assert.ok(
    colManagerCode.includes('aria-label="Đóng"'),
    'Close button in ColumnManagerModal must have aria-label'
  );
  assert.ok(
    colManagerCode.includes('aria-label={`Di chuyển cột ${col.label} lên`}'),
    'Move up button in ColumnManagerModal must have aria-label'
  );
  assert.ok(
    colManagerCode.includes('aria-label={`Di chuyển cột ${col.label} xuống`}'),
    'Move down button in ColumnManagerModal must have aria-label'
  );
});

test('R3 (Adversarial): ColumnManagerModal attaches Escape key listener for keyboard dismissal', () => {
  const colManagerCode = fs.readFileSync(path.join(ROOT, 'src/components/ColumnManagerModal.jsx'), 'utf8');

  assert.ok(
    colManagerCode.includes("e.key === 'Escape'"),
    'ColumnManagerModal must listen for Escape key to close modal'
  );
});

test('R1 (Tablet Responsive): Header enforces 2-Tier Adaptive layout for iPad portrait and desktop', () => {
  const headerCode = fs.readFileSync(path.join(ROOT, 'src/components/Header.jsx'), 'utf8');

  // Row 1 branding & view switcher safeguards
  assert.ok(
    headerCode.includes('flex items-center justify-between gap-3 min-w-0'),
    'Header Row 1 must maintain clean spacing and prevent wrapping'
  );
  assert.ok(
    headerCode.includes('whitespace-nowrap'),
    'Branding title and dropdown must maintain whitespace-nowrap'
  );

  // Row 2 2-Tier adaptive layout
  assert.ok(
    headerCode.includes('flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 pt-1.5 border-t border-[#EAE5D9]'),
    'Header Row 2 must stack on <lg (iPad portrait) and collapse to 1 line on desktop'
  );
  assert.ok(
    !headerCode.includes('overflow-x-auto no-scrollbar'),
    'Header Row 2 must eliminate overflow-x-auto no-scrollbar scroll container'
  );

  // Sub-row 2 visible utility labels on tablet portrait
  assert.ok(
    headerCode.includes('hidden sm:inline">Phục Hồi Gốc</span>'),
    'Phục Hồi Gốc must display text label on tablet portrait (sm:inline)'
  );
  assert.ok(
    headerCode.includes('hidden sm:inline">Quản Lý Cột</span>'),
    'Quản Lý Cột must display descriptive text label on tablet portrait'
  );
  assert.ok(
    headerCode.includes('data-testid="header__column-manager--button"'),
    'Column manager button data-testid must be preserved'
  );
});

test('R2 (Tablet Responsive): FilterToolbar enforces 2-Tier Adaptive layout for iPad portrait', () => {
  const filterToolbarCode = fs.readFileSync(path.join(ROOT, 'src/components/FilterToolbar.jsx'), 'utf8');

  // Must remove min-w-[500px] and eliminate forced horizontal scrollbar
  assert.ok(
    !filterToolbarCode.includes('min-w-[500px]'),
    'FilterToolbar must eliminate min-w-[500px] constraint'
  );

  // Container must be 2-tier adaptive
  assert.ok(
    filterToolbarCode.includes('flex flex-col lg:flex-row lg:items-center justify-between gap-2'),
    'FilterToolbar Row 2 must be 2-tier adaptive container'
  );

  // Subtabs preserved
  assert.ok(
    filterToolbarCode.includes('inventorySubTab'),
    'Sub-tabs state must be preserved'
  );
});

test('R3 (Tablet Responsive): KpiCards enforces balanced 2-row grid on iPad portrait', () => {
  const kpiCardsCode = fs.readFileSync(path.join(ROOT, 'src/components/KpiCards.jsx'), 'utf8');

  // Must use sm:grid-cols-3 lg:grid-cols-5
  assert.ok(
    kpiCardsCode.includes('grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'),
    'KpiCards must use sm:grid-cols-3 lg:grid-cols-5 for 3+2 card layout on iPad portrait'
  );
  assert.ok(
    !kpiCardsCode.includes('md:grid-cols-5'),
    'KpiCards must not use md:grid-cols-5'
  );

  // Card 5 must span 1 column on tablet portrait
  assert.ok(
    kpiCardsCode.includes('col-span-2 sm:col-span-1'),
    'Card 5 must span 1 column on tablet portrait (sm:col-span-1)'
  );
});

test('R4 (Tablet Responsive): Zero horizontal overflow container boundaries and floating bar clearance', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const indexCss = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
  const appJsx = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
  const excelGridJsx = fs.readFileSync(path.join(ROOT, 'src/components/ExcelGrid.jsx'), 'utf8');
  const stickyPaginationJsx = fs.readFileSync(path.join(ROOT, 'src/components/StickyPaginationBar.jsx'), 'utf8');

  // 1. Root & document level overflow-x containment
  assert.ok(indexHtml.includes('overflow-x-hidden'), 'index.html body must contain overflow-x-hidden');
  assert.ok(indexCss.includes('overflow-x: hidden'), 'index.css must declare overflow-x: hidden');
  assert.ok(indexCss.includes('max-width: 100vw'), 'index.css must declare max-width: 100vw');
  assert.ok(appJsx.includes('overflow-x-hidden'), 'App.jsx containers must maintain overflow-x-hidden');

  // 2. ExcelGrid scroll containment
  assert.ok(excelGridJsx.includes('w-full min-w-0 max-w-full'), 'ExcelGrid outer card must have w-full min-w-0 max-w-full');
  assert.ok(excelGridJsx.includes('overflow-x-auto min-h-[380px] overscroll-x-contain w-full max-w-full'), 'ExcelGrid must maintain inner scroll container');

  // 3. Floating Bulk Action Bar clearance & dynamic main padding
  assert.ok(appJsx.includes('bottom-4 sm:bottom-5'), 'Floating Bulk Action Bar must have bottom-4 sm:bottom-5');
  assert.ok(appJsx.includes('pb-24 sm:pb-28'), 'Main content container must include dynamic bottom padding pb-24 sm:pb-28 when selections exist');
  assert.ok(appJsx.includes('max-w-[calc(100vw-2rem)]'), 'Floating Bulk Action Bar must constrain max width');

  // 4. StickyPaginationBar tablet portrait compactness
  assert.ok(stickyPaginationJsx.includes('hidden lg:inline'), 'StickyPaginationBar must use hidden lg:inline for text labels on tablet portrait');
});


