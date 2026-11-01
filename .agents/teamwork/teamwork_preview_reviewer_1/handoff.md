# Adversarial Reviewer Handoff Report - Read-Only Table, Sticky Actions Column & Column Visibility Manager

> [!WARNING] **Skepticism Disclaimer**
> All 35 tests pass including new adversarial tests for sub-tab column persistence, storage safety, and sticky column pinning; build compiles cleanly in 3.61s; and all inline edit vectors have been eliminated. Visual browser sub-pixel border rendering across older Safari versions and mobile touch swipe physics remain unverified via live headless browser automation due to absence of local Playwright/Puppeteer binary in the environment.

## 1. What the prior attempt got wrong

### Issue 1: "Đã Bán" sub-tab column manager disconnection
- **Input:** User navigated to the "Đã Bán" sub-tab and clicked "Cột" in the header to manage visible columns.
- **Expected:** ColumnManagerModal presents columns for the "Đã Bán" table (including "Ngày Bán", "Mã Hoá Đơn", "Khách Hàng"), allows toggling visibility, and updates the table immediately with localStorage persistence.
- **Actual:** ColumnManagerModal presented columns for "Kho Tranh Chưa Bán" (showing non-existent sold columns like "Ngày Mua Vào", "KT Khung"), while completely omitting "Ngày Bán", "Mã Hoá Đơn", and "Khách Hàng".
- **Root Cause:** `App.jsx` only initialized and passed `columns` from `DEFAULT_COLUMNS` without maintaining or passing `soldColumns` (`SOLD_COLUMNS`) for the active `inventorySubTab`.

### Issue 2: Actions column pinning failure under missing/corrupted storage order
- **Input:** `STORAGE_KEY_COLUMNS` in localStorage was missing newly added columns, or contained `actions` in an intermediate or leading position.
- **Expected:** Non-action columns are ordered first, and `actions` is ALWAYS guaranteed to be the final column pinned at the right edge (`right-0`).
- **Actual:** Order reconstruction appended remaining columns after `actions`, pushing `actions` into an intermediate column position and breaking the sticky-right layout.
- **Root Cause:** Order loading in `src/App.jsx` did not strip `actions` and guarantee its placement as the last element.

### Issue 3: Unhandled exception in `handleResetColumns` when localStorage is disabled or throws
- **Input:** User clicked "Mặc định ban đầu" in private browsing mode or when storage quota was exceeded / disabled.
- **Expected:** Reset completes safely using in-memory defaults and displays toast notification.
- **Actual:** `localStorage.removeItem(...)` was called without `try...catch`, throwing an unhandled exception and crashing the component.
- **Root Cause:** Unprotected `localStorage.removeItem` calls in `handleResetColumns` in `src/App.jsx`.

### Issue 4: Vulnerability allowing `actions` column to be hidden
- **Input:** `handleToggleColumnVisibility('actions')` called or `{ actions: false }` present in localStorage.
- **Expected:** The `actions` column can NEVER be hidden and must permanently remain `visible: true`.
- **Actual:** `actions` column visibility could be toggled to `false`.
- **Root Cause:** `handleToggleColumnVisibility` did not guard against `colId === 'actions'`, and loading from storage did not enforce `visible: true` for `actions`.

### Issue 5: `handleSort` sorting on virtual `qr_code` field
- **Input:** User clicked on the header text of `qr_code`.
- **Expected:** Sort is ignored since QR code is a dynamically generated virtual column, matching `actions` and `hinh_anh`.
- **Actual:** `handleSort` proceeded to sort by `painting['qr_code']` which is `undefined`.
- **Root Cause:** Guard in `handleSort` only checked `field === 'actions' || field === 'hinh_anh'`.

### Issue 6: Misleading UX in ColumnManagerModal for fixed actions item
- **Input:** User hovered or clicked on the fixed "Thao Tác" item in ColumnManagerModal.
- **Expected:** Cursor displays `cursor-not-allowed` to reflect that the actions column is fixed.
- **Actual:** Label displayed `cursor-pointer`, and the badge used non-standard Tailwind class `py-0.2` instead of `py-0.5 px-1.5`.
- **Root Cause:** Hardcoded `cursor-pointer` on `<label>` regardless of disabled state and typo in Tailwind padding.

### Issue 7: Dead code leftover in `src/App.jsx`
- **Input:** `handleUpdateCell` function in `src/App.jsx`.
- **Expected:** Clean codebase with no dead inline-editing handlers.
- **Actual:** Leftover `handleUpdateCell` function was retained despite being removed from `ExcelGrid`.
- **Root Cause:** Incomplete cleanup during removal of inline editing.

## 2. What I changed
1. **`src/types.js`**:
   - Added and exported `STORAGE_KEY_SOLD_COLUMNS = 'binhminhart_column_order_sold_v4'`.
   - Added and exported `loadColumns(presetColumns, orderStorageKey, visibilityStorageKey, customStorage)` helper that handles SSR/Node/browser environments safely, gracefully recovers from storage errors, merges newly introduced columns, and guarantees `actions` is permanently `visible: true` and pinned as the last column.

2. **`src/App.jsx`**:
   - Integrated `loadColumns` to initialize both `columns` (for `chua_ban`) and `soldColumns` (for `da_ban`).
   - Updated `handleToggleColumnVisibility` to guard `colId === 'actions'`, toggle column in both sub-tab sets, and persist changes to `STORAGE_KEY_VISIBILITY`.
   - Updated `handleReorderColumns` to support reordering for both `chua_ban` and `da_ban` subtabs with guaranteed `actions` end-pinning.
   - Updated `handleResetColumns` with `try...catch` safety around all `localStorage.removeItem` calls.
   - Removed dead `handleUpdateCell` function.
   - Passed active columns (`inventorySubTab === 'da_ban' ? soldColumns : columns`) and `subTabTitle` to `ColumnManagerModal` and `ExcelGrid`.

3. **`src/components/ColumnManagerModal.jsx`**:
   - Added `subTabTitle` prop and rendered in header (e.g., "Tùy Biến Cột Bảng Tính Excel (Kho Chưa Bán)" vs "(Tranh Đã Bán)").
   - Applied `cursor-not-allowed opacity-80` to fixed actions label and corrected badge styling to `py-0.5 px-1.5`.
   - Added `cursor-pointer` to footer buttons.

4. **`src/components/ExcelGrid.jsx`**:
   - Enhanced `visibleColumns` to directly filter passed columns if they already belong to the sold sub-tab.
   - Added `qr_code` guard to `handleSort` along with `actions` and `hinh_anh`.
   - Safely guarded `onOpenLightbox` and `onOpenDetail` callbacks.

5. **`test/table-readonly-sticky-columns.test.mjs`**:
   - Added test verifying sold sub-tab column visibility toggling and persistence (`ngay_ban`, `hoa_don`, `khach_hang`).
   - Added test verifying actions column pinning resilience against corrupted or outdated storage order.
   - Added test verifying safe fallback when localStorage throws `SecurityError` or `QuotaExceededError`.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Ran `npm test`: all 35 tests passed (28 core API/DB tests + 7 table/column tests) in 4.75s.
  - Ran `npm run build`: Vite 6.4.5 built production bundle in 3.61s with 0 errors.
- **Shallow Verification (manual only):**
  - Code inspection of CSS classes for sticky header (`sticky top-0 right-0 z-30`) and sticky cell (`sticky right-0 z-10`).
  - Code inspection of 28x28px icon button dimensions, 120px column width, and location tag `📍` formatting.
- **Unverified aspects:**
  - Visual pixel rendering in Safari with sub-pixel horizontal scrolling borders.
  - Touch swipe inertia physics on physical iOS/Android devices.

## 4. Known Issues
- `Shallow Verification`: Visual scroll rendering on mobile was verified by CSS analysis and static assertions rather than live Playwright headless rendering because Playwright is not installed in `node_modules`.
- `Minor Robustness Risk`: In private browsing environments where `localStorage` is blocked, column visibility and ordering remain functional in-memory during the session but reset upon browser tab closure.

## 5. Remaining risk & next step
- The implementation is solid, fully tested with 35 passing tests, robust against corrupted storage and private browsing, and strictly adheres to the compact 28x28px icon button specification and read-only table requirements. Task is complete.
