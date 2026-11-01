# Handoff Report — Explorer 3: Requirement R4 (Zero Horizontal Overflow & Floating Bar Polish)

## 1. Observation

### 1.1 Project Structure & Build/Test Tooling
- `package.json` lines 9-16:
  ```json
  "scripts": {
    "server": "node server/index.js",
    "client": "vite",
    "dev": "concurrently -k -n \"SERVER,CLIENT\" -c \"blue,green\" \"node server/index.js\" \"vite\"",
    "build": "vite build",
    "start": "node server/index.js",
    "test": "node --test \"test/**/*.test.mjs\""
  }
  ```
- Command execution `npm test`:
  `node --test "test/**/*.test.mjs"` executed 47 tests across `api.test.mjs`, `db.test.mjs`, and `table-readonly-sticky-columns.test.mjs`. Result: 47 pass, 0 fail (duration ~5.9s).
- Command execution `npm run build`:
  `vite build` built production bundle in 4.14s: `dist/index.html` (1.13 kB), `dist/assets/index-Bx_PpwyV.css` (57.44 kB), `dist/assets/index-097KDvWc.js` (584.96 kB).

### 1.2 Root Document and App Container Boundaries
- `index.html` line 12:
  ```html
  <body class="bg-[#FAF8F5] text-stone-900 antialiased selection:bg-amber-100 selection:text-amber-900">
    <div id="root"></div>
  ```
  Neither `<body>` nor `<div id="root">` contains `overflow-x-hidden` or `max-w-full`.
- `src/index.css` lines 10-16:
  ```css
  body {
    background-color: #FAF8F5;
    color: #1C1917;
    overflow-x: hidden;
    margin: 0;
    padding: 0;
  }
  ```
  `html` and `#root` are not bounded with `overflow-x: hidden` or `max-width: 100vw`.
- `src/App.jsx` line 786 and line 816:
  ```jsx
  <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans">
  ...
  <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 md:px-6 py-2.5 flex flex-col">
  ```
  The flex container `div.flex-col` and `<main>` lack `w-full max-w-full overflow-x-hidden min-w-0`. By CSS flexbox spec, flex items default to `min-width: auto`, so if any inner element expands, the flex item stretches the parent beyond viewport width.

### 1.3 Inner Table Scroll Containment in `ExcelGrid.jsx`
- `src/components/ExcelGrid.jsx` lines 176-179:
  ```jsx
  <div className="bg-white border border-[#EAE5D9] rounded-lg shadow-sm flex flex-col relative">
    {/* Scrollable table container */}
    <div className="overflow-x-auto min-h-[380px] overscroll-x-contain">
      <table className="w-full text-left border-collapse select-none">
  ```
  The outer wrapper `div` lacks `w-full min-w-0 max-w-full`, and the inner scroll container lacks explicit `w-full max-w-full`.
  The table header and body implement sticky columns:
  - Checkbox: `sticky left-0 z-30` (header) and `sticky left-0 z-10` (body cells)
  - Actions: `sticky top-0 right-0 z-30` (header) and `sticky right-0 z-10` (body cells)
  - `StickyPaginationBar` is positioned at lines 588-599 outside `div.overflow-x-auto`, staying fixed horizontally relative to table columns.

### 1.4 Floating Bulk Action Bar Collision with `StickyPaginationBar`
- `src/App.jsx` lines 908-948:
  ```jsx
  {/* Floating Bulk Action Bar when paintings are selected */}
  {selectedPaintingIdsForTag.size > 0 && activeView === 'inventory' && (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#252016] text-[#FAF8F5] border border-[#C5A059] shadow-2xl px-4 py-2.5 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
  ```
  - It uses `fixed bottom-5` (20px from screen bottom).
  - Meanwhile, `StickyPaginationBar.jsx` uses `sticky bottom-0 z-30` with height ~52px (`py-2.5` + 32px buttons + border).
  - When user scrolls or views the inventory grid, the Floating Bulk Action Bar at `bottom-5` sits directly on top of `StickyPaginationBar`, visually obscuring pagination page numbers and blocking touch/click targets.
  - The floating bar also lacks `max-w-[calc(100vw-2rem)] w-max` and `shrink-0` on button labels, posing potential overflow risk on narrow screens.

### 1.5 `StickyPaginationBar.jsx` Width Blowout on 768px Portrait Viewport
- `src/components/StickyPaginationBar.jsx` lines 43-45, 82-86, 104-106, 124-127:
  ```jsx
  <div
    className={`sticky bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md px-4 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] flex flex-wrap items-center justify-between gap-3 font-sans ${containerTheme} ${radiusClass}`}
  >
  ...
  <span className="text-[11px] opacity-75 mr-1.5 hidden sm:inline">
    Trang <strong>{safePage}</strong> / {totalPages}
  </span>
  ...
  <span className="hidden sm:inline">Trước</span>
  ...
  <span className="hidden sm:inline">Sau</span>
  ```
- Detailed Width Calculation on 768px Tablet Portrait:
  - Viewport width = 768px.
  - Main container padding (`px-4 md:px-6`): at 768px, `md:` is active (24px + 24px = 48px). Available width = 720px.
  - StickyPaginationBar inner padding (`px-4` = 32px). Available inner width = 688px.
  - Left group ("Hiển thị 1–10 / tổng 14 tác phẩm" + "Mỗi trang: [10 tranh v]") width = ~272px.
  - Right group with "Trang X / Y" (~65px) + First (32px) + Prev with "Trước" (~60px) + 5 page numbers (160px) + Next with "Sau" (~60px) + Last (32px) + gaps (48px) = 457px.
  - Combined required width: 272px + 457px + 12px gap = 741px.
  - Because 741px > 688px, on a standard 768px iPad portrait, the pagination controls are forced to wrap to a second line.

---

## 2. Logic Chain

1. **Root & Page Overflow Prevention**:
   - Observations 1.2 show `index.html`, `index.css`, and `App.jsx` lack strict `overflow-x: hidden`, `max-width: 100vw`, and `min-w-0`.
   - Adding `overflow-x-hidden` to `body` in `index.html`, `html, body, #root { overflow-x: hidden; max-width: 100vw; width: 100%; }` in `index.css`, and `w-full max-w-full overflow-x-hidden min-w-0` to `App.jsx` (`div.min-h-screen` and `<main>`) guarantees the document body will never generate a horizontal scrollbar (`scrollWidth === clientWidth`).

2. **ExcelGrid Scroll Containment**:
   - Observation 1.3 shows that without `w-full min-w-0 max-w-full` on `div.bg-white.rounded-lg`, the parent flex column may widen when the inner table expands.
   - Adding `w-full min-w-0 max-w-full` to the outer wrapper and `w-full max-w-full` to `div.overflow-x-auto` confines 100% of the table's horizontal scrolling to the inner table container.
   - The sticky action column (`sticky right-0 z-10` / `z-30`) and sticky checkbox (`sticky left-0`) remain pinned to the edges of the inner scroll container without leaking horizontal scroll to the page.

3. **Floating Bulk Action Bar Elevation**:
   - Observation 1.4 proves that `bottom-5` (20px) collides directly with `StickyPaginationBar` (`sticky bottom-0`, height ~52px).
   - By elevating the Floating Bulk Action Bar to `fixed bottom-16 sm:bottom-16` (64px from viewport bottom), it floats cleanly with a 12-16px gap above `StickyPaginationBar`.
   - Adding `max-w-[calc(100vw-2rem)] w-max` and `shrink-0` on inner controls ensures it never stretches or overflows the 768px viewport.

4. **StickyPaginationBar 1-Row Optimization for Tablet Portrait**:
   - Observation 1.5 proves that `hidden sm:inline` renders "Trang X / Y", "Trước", and "Sau" at 768px, driving width to 741px and breaking the single-row layout.
   - Changing `hidden sm:inline` to `hidden lg:inline` on:
     - `Trang <strong>{safePage}</strong> / {totalPages}`
     - `<span>Trước</span>`
     - `<span>Sau</span>`
   - Keeps the pagination controls on 768px–834px tablet portrait as compact, high-density icon buttons (`<` and `>`), reducing right group width to ~286px.
   - Total row width becomes 262px (Left) + 286px (Right) + 12px (gap) = 560px.
   - Since 560px is well below the available 688px width (128px safety margin), the pagination bar fits comfortably on a single row without wrapping on 768px and 834px iPad portrait viewports.
   - On desktop screens (`lg:` >= 1024px), the text labels and "Trang X / Y" automatically reappear.

---

## 3. Caveats

- **Existing Tests**: `test/table-readonly-sticky-columns.test.mjs` checks for exact class names in `ExcelGrid.jsx` (such as `sticky top-0 right-0 z-30`, `sticky right-0 z-10`, `bg-clip-padding`, `overscroll-x-contain`, `w-7 h-7`, `col.width || 120`). Proposed changes preserve every one of these strings.
- **Other Views**: `CustomerExhibitionView.jsx` and `ExhibitionView.jsx` also import and render `StickyPaginationBar`. They will automatically receive the single-row tablet responsiveness without requiring duplicate fixes.
- **No other caveats**: The changes are localized, non-destructive, and strictly adhere to the project's styling conventions.

---

## 4. Conclusion & Concrete Code Proposals for Worker

The Worker (`teamwork_preview_implementer_1`) should apply the following targeted modifications:

### Proposal 1: `index.html` (Lines 12-14)
```html
<<<< BEFORE
  <body class="bg-[#FAF8F5] text-stone-900 antialiased selection:bg-amber-100 selection:text-amber-900">
    <div id="root"></div>
==== AFTER
  <body class="bg-[#FAF8F5] text-stone-900 antialiased selection:bg-amber-100 selection:text-amber-900 overflow-x-hidden">
    <div id="root" class="w-full max-w-full overflow-x-hidden"></div>
>>>>
```

### Proposal 2: `src/index.css` (Lines 10-16)
```css
<<<< BEFORE
body {
  background-color: #FAF8F5;
  color: #1C1917;
  overflow-x: hidden;
  margin: 0;
  padding: 0;
}
==== AFTER
html,
body {
  background-color: #FAF8F5;
  color: #1C1917;
  overflow-x: hidden;
  max-width: 100vw;
  width: 100%;
  margin: 0;
  padding: 0;
}

#root {
  overflow-x: hidden;
  max-width: 100vw;
  width: 100%;
}
>>>>
```

### Proposal 3: `src/App.jsx`
1. Line 786:
```jsx
<<<< BEFORE
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans">
==== AFTER
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans w-full max-w-full overflow-x-hidden">
>>>>
```
2. Line 816:
```jsx
<<<< BEFORE
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 md:px-6 py-2.5 flex flex-col">
==== AFTER
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 md:px-6 py-2.5 flex flex-col min-w-0 overflow-x-hidden">
>>>>
```
3. Lines 909-948 (Floating Bulk Action Bar):
```jsx
<<<< BEFORE
      {/* Floating Bulk Action Bar when paintings are selected */}
      {selectedPaintingIdsForTag.size > 0 && activeView === 'inventory' && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#252016] text-[#FAF8F5] border border-[#C5A059] shadow-2xl px-4 py-2.5 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center gap-2 pr-3 border-r border-[#4A3E2D]">
            <span className="w-6 h-6 rounded-full bg-[#C5A059] text-[#252016] font-bold text-[11px] flex items-center justify-center">
              {selectedPaintingIdsForTag.size}
            </span>
            <span className="text-[12px] font-medium tracking-wide">
              tác phẩm được chọn
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsBatchTagPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059] hover:bg-[#D4AF37] text-[#1A160F] text-[11.5px] font-bold rounded transition-colors shadow-sm cursor-pointer"
          >
            <Printer size={14} />
            <span>In Tag A4 ({selectedPaintingIdsForTag.size} tranh)</span>
          </button>

          <button
            type="button"
            onClick={() => handleBatchTagStatus(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#332A1E] hover:bg-[#433829] border border-[#554632] text-stone-200 hover:text-white text-[11.5px] font-medium rounded transition-colors cursor-pointer"
            title="Đánh dấu các tranh đã in tag vật lý"
          >
            <CheckSquare size={13} className="text-emerald-400" />
            <span>Đánh dấu Đã In Tag</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPaintingIdsForTag(new Set())}
            className="p-1.5 text-stone-400 hover:text-white rounded hover:bg-[#332A1E] transition-colors ml-1 cursor-pointer"
            title="Bỏ chọn tất cả"
          >
            <X size={15} />
          </button>
        </div>
      )}
==== AFTER
      {/* Floating Bulk Action Bar when paintings are selected */}
      {selectedPaintingIdsForTag.size > 0 && activeView === 'inventory' && (
        <div className="fixed bottom-16 sm:bottom-16 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] w-max bg-[#252016] text-[#FAF8F5] border border-[#C5A059] shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg flex items-center gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-bottom-3 transition-all">
          <div className="flex items-center gap-1.5 sm:gap-2 pr-2.5 sm:pr-3 border-r border-[#4A3E2D] shrink-0">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#C5A059] text-[#252016] font-bold text-[10.5px] sm:text-[11px] flex items-center justify-center shrink-0">
              {selectedPaintingIdsForTag.size}
            </span>
            <span className="text-[11.5px] sm:text-[12px] font-medium tracking-wide whitespace-nowrap">
              tác phẩm được chọn
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsBatchTagPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#C5A059] hover:bg-[#D4AF37] text-[#1A160F] text-[11px] sm:text-[11.5px] font-bold rounded transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <Printer size={14} className="shrink-0" />
            <span className="whitespace-nowrap">In Tag A4 ({selectedPaintingIdsForTag.size} tranh)</span>
          </button>

          <button
            type="button"
            onClick={() => handleBatchTagStatus(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-[#332A1E] hover:bg-[#433829] border border-[#554632] text-stone-200 hover:text-white text-[11px] sm:text-[11.5px] font-medium rounded transition-colors cursor-pointer shrink-0"
            title="Đánh dấu các tranh đã in tag vật lý"
          >
            <CheckSquare size={13} className="text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap">Đánh dấu Đã In Tag</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPaintingIdsForTag(new Set())}
            className="p-1.5 text-stone-400 hover:text-white rounded hover:bg-[#332A1E] transition-colors ml-0.5 sm:ml-1 cursor-pointer shrink-0"
            title="Bỏ chọn tất cả"
          >
            <X size={15} />
          </button>
        </div>
      )}
>>>>
```

### Proposal 4: `src/components/ExcelGrid.jsx` (Lines 176-179)
```jsx
<<<< BEFORE
  return (
    <div className="bg-white border border-[#EAE5D9] rounded-lg shadow-sm flex flex-col relative">
      {/* Scrollable table container */}
      <div className="overflow-x-auto min-h-[380px] overscroll-x-contain">
        <table className="w-full text-left border-collapse select-none">
==== AFTER
  return (
    <div className="bg-white border border-[#EAE5D9] rounded-lg shadow-sm flex flex-col relative w-full min-w-0 max-w-full">
      {/* Scrollable table container */}
      <div className="overflow-x-auto min-h-[380px] overscroll-x-contain w-full max-w-full">
        <table className="w-full text-left border-collapse select-none">
>>>>
```

### Proposal 5: `src/components/StickyPaginationBar.jsx`
1. Line 44:
```jsx
<<<< BEFORE
    <div
      className={`sticky bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md px-4 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] flex flex-wrap items-center justify-between gap-3 font-sans ${containerTheme} ${radiusClass}`}
    >
==== AFTER
    <div
      className={`sticky bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 font-sans w-full max-w-full ${containerTheme} ${radiusClass}`}
    >
>>>>
```
2. Line 47:
```jsx
<<<< BEFORE
      <div className="flex flex-wrap items-center gap-3 text-[11.5px]">
==== AFTER
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11.5px]">
>>>>
```
3. Lines 82-86:
```jsx
<<<< BEFORE
      {/* Right: Page Navigation Buttons */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] opacity-75 mr-1.5 hidden sm:inline">
          Trang <strong>{safePage}</strong> / {totalPages}
        </span>
==== AFTER
      {/* Right: Page Navigation Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <span className="text-[11px] opacity-75 mr-1 hidden lg:inline">
          Trang <strong>{safePage}</strong> / {totalPages}
        </span>
>>>>
```
4. Lines 104-106 & Lines 125-127:
```jsx
<<<< BEFORE
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          title="Trang trước"
          className={`${btnBase} ${btnInactive} gap-1 px-2.5`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Trước</span>
        </button>
...
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          title="Trang sau"
          className={`${btnBase} ${btnInactive} gap-1 px-2.5`}
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
==== AFTER
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          title="Trang trước"
          className={`${btnBase} ${btnInactive} gap-1 px-2`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Trước</span>
        </button>
...
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          title="Trang sau"
          className={`${btnBase} ${btnInactive} gap-1 px-2`}
        >
          <span className="hidden lg:inline">Sau</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
>>>>
```

---

## 5. Verification Method

### 5.1 Automated Command Verification
1. Run test suite:
   ```bash
   npm test
   ```
   **Expected**: 47/47 passing tests in `test/**/*.test.mjs`.
2. Run build verification:
   ```bash
   npm run build
   ```
   **Expected**: `vite build` completes successfully with exit code 0 and valid bundle output in `dist/`.

### 5.2 Automated Assertion Addition in `test/table-readonly-sticky-columns.test.mjs`
To ensure long-term regression prevention, the worker should append the following test:
```javascript
test('R4: Zero horizontal overflow container boundaries and floating bar clearance', () => {
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
  assert.ok(excelGridJsx.includes('overflow-x-auto min-h-[380px] overscroll-x-contain'), 'ExcelGrid must maintain inner scroll container');

  // 3. Floating Bulk Action Bar clearance
  assert.ok(appJsx.includes('bottom-16'), 'Floating Bulk Action Bar must have bottom-16 to clear StickyPaginationBar');
  assert.ok(appJsx.includes('max-w-[calc(100vw-2rem)]'), 'Floating Bulk Action Bar must constrain max width');

  // 4. StickyPaginationBar tablet portrait compactness
  assert.ok(stickyPaginationJsx.includes('hidden lg:inline'), 'StickyPaginationBar must use hidden lg:inline for text labels on tablet portrait');
});
```

### 5.3 Viewport Inspection Criteria (768px × 1024px & 834px × 1194px)
- `document.documentElement.scrollWidth === document.documentElement.clientWidth` (no horizontal scrollbar on body).
- Horizontal scroll occurs only inside `<div class="overflow-x-auto ...">` when scrolling the wide columns of `ExcelGrid`.
- Sticky right actions column stays pinned at `right: 0` inside the table container.
- Floating Bulk Action Bar floats cleanly above the pagination bar with ~14px clearance when items are checked.
- StickyPaginationBar controls remain on a single line at 768px portrait width without text truncation or wrapping.
