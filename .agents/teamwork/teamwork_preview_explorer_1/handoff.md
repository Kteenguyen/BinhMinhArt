# Handoff Report: Requirement R1 - 2-Tier Adaptive Header & Action Toolbar for iPad Portrait (768px - 834px)

## 1. Observation

### Exact File Paths & Code Locations
- Target File: `/Users/mac/Documents/antigravity/BinhMinhArt/src/components/Header.jsx`
- Parent Wrapper: `/Users/mac/Documents/antigravity/BinhMinhArt/src/App.jsx` (lines 786–814)
- Global Styles: `/Users/mac/Documents/antigravity/BinhMinhArt/src/index.css` (lines 10–16)
- Tailwind Config: `/Users/mac/Documents/antigravity/BinhMinhArt/tailwind.config.js` (default breakpoints: `sm`: 640px, `md`: 768px, `lg`: 1024px, `xl`: 1280px)

### Current Implementation in `src/components/Header.jsx`
1. **Header Outer Container** (lines 77–81):
   ```jsx
   <header className="border-b border-[#DFCBAA] bg-[#FAF7F0]/95 backdrop-blur sticky top-0 z-30 shadow-xs">
     <div className="h-1.5 w-full bg-[#C58C00]" />
     <div className="max-w-[1700px] mx-auto px-4 lg:px-6 py-2.5 flex flex-col gap-2.5">
   ```
2. **Row 1 (Gallery Branding + System View Switcher Dropdown)** (lines 83–123):
   ```jsx
   <div className="flex flex-wrap items-center justify-between gap-3">
     <div className="flex items-center gap-3">
       <img src="/binhminh_logo.png" alt="Bình Minh Art Gallery" className="h-10 object-contain drop-shadow-xs" />
       <div className="border-l border-[#DFCBAA] pl-3">
         <div className="flex items-center gap-2">
           <span className="font-serif text-xs md:text-sm font-bold text-[#7D1818] uppercase tracking-wider">
             Bình Minh Art Gallery
           </span>
           <button type="button" onClick={onOpenNetworkModal} title="Trạng thái cơ sở dữ liệu & Cấu hình IP WiFi nội bộ" className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-800 text-white flex items-center gap-1 hover:bg-emerald-900 transition-colors">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
             <span>Cơ sở dữ liệu SQLite</span>
           </button>
         </div>
         <p className="text-[10.5px] text-stone-600 font-sans hidden sm:block">
           29A Ngô Thời Nhiệm, Q.3, TP.HCM | ĐT: 0916554329 - 02836361808
         </p>
       </div>
     </div>

     <div className="relative" ref={viewDropdownRef}>
       <button type="button" onClick={() => setViewDropdownOpen(prev => !prev)} className="h-[38px] px-3.5 bg-white hover:bg-[#FAF8F5] border-2 border-[#7D1818] rounded-md shadow-xs flex items-center gap-2 text-[12px] font-bold text-stone-900 transition-colors">
         <CurrentIcon className="w-4 h-4 text-[#7D1818]" />
         <span>{currentViewObj.label}</span>
         <ChevronDown className={`w-3.5 h-3.5 text-stone-500 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
       </button>
   ```
3. **Row 2 (Action Toolbar)** (lines 164–249):
   ```jsx
   <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#EAE5D9] overflow-x-auto no-scrollbar">
     <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
       {/* Nạp Loạt Dữ Liệu */}
       <button ...><Layers className="w-3.5 h-3.5 text-[#F4E5B8]" /><span className="hidden xl:inline">Nạp Loạt Dữ Liệu (Word + Folder Ảnh)</span><span className="inline xl:hidden">Nạp Loạt (Word/Ảnh)</span></button>
       {/* Quét QR */}
       {onOpenQrScanner && (<button ...><QrCode className="w-3.5 h-3.5 text-[#7D1818]" /><span className="hidden lg:inline">Quét QR / Tìm Nhanh</span><span className="inline lg:hidden">Quét QR</span></button>)}
       {/* Thêm Tranh */}
       <button ...><Plus className="w-3.5 h-3.5 text-[#F4E5B8]" /><span>Thêm Tranh</span></button>
       {/* Xuất Excel */}
       <button ...><Download className="w-3.5 h-3.5" /><span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span></button>
     </div>

     <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
       {/* IP WiFi */}
       <button ...><Wifi className="w-3.5 h-3.5 text-[#7D1818]" /><span className="hidden sm:inline">IP WiFi / DB</span></button>
       {/* Quản lý Cột */}
       {activeView === 'inventory' && (<button ... data-testid="header__column-manager--button"><Columns className="w-3.5 h-3.5 text-stone-600" /><span>Cột</span></button>)}
       {/* Phục Hồi Gốc */}
       <button ...><RotateCcw className="w-3.5 h-3.5 text-stone-500" /><span className="hidden lg:inline">Phục Hồi Gốc</span></button>
     </div>
   </div>
   ```

### Exact Observed Deficiencies on iPad Portrait (768px – 834px)
1. **Forced Horizontal Scrollbar & Squishing in Row 2**:
   - Row 2 wraps all 7 action buttons onto a single horizontal line using `overflow-x-auto no-scrollbar`.
   - On 768px viewport: Available width is `768px - 32px (px-4) = 736px`.
   - Left CTA group requires ~494px width.
   - Right utility group requires ~218px width (even with "Phục Hồi Gốc" text hidden).
   - Total width = `494px + 218px + 8px gap = 720px`, which is critically tight (leaves only 16px tolerance).
   - If "Phục Hồi Gốc" displays its full text (~110px), total width becomes ~803px > 736px, causing horizontal overflow or cut-off controls.
2. **Hidden Text Label on iPad Portrait**:
   - "Phục Hồi Gốc" was set to `<span className="hidden lg:inline">Phục Hồi Gốc</span>`, meaning on iPad portrait (768px – 834px, which is `< lg`), the text is completely invisible, leaving an unlabeled 32px icon.
   - "Quản lý Cột" is abbreviated to just `<span>Cột</span>` rather than a descriptive label.
3. **Row 1 Fragility**:
   - Row 1 uses `flex-wrap items-center justify-between gap-3`.
   - Logo lacks `shrink-0`.
   - Address paragraph lacks `truncate`.
   - Dropdown button container lacks `shrink-0`.

---

## 2. Logic Chain

1. **Step 1 (Viewport & Layout Analysis)**:
   - Target viewport: iPad Portrait (`768px × 1024px` and `834px × 1194px`).
   - Tailwind breakpoint mapping: At 768px–834px, `md:` (≥768px) is ACTIVE, while `lg:` (≥1024px) is INACTIVE.
   - Header container padding is `px-4` (16px left + 16px right = 32px padding), leaving exactly `736px` available width at 768px and `802px` at 834px.

2. **Step 2 (Row 1 Stabilization)**:
   - Left branding block width: Logo (40px) + gap (12px) + border/padding (13px) + Title & Badge & Address (~380px) = ~445px.
   - Right View Switcher dropdown width: ~210px.
   - Combined width: `445px + 210px + 12px gap = 667px` <= 736px.
   - By removing `flex-wrap` and setting `flex items-center justify-between gap-3 min-w-0`, with `shrink-0` on logo and dropdown, and `truncate` on address text, Row 1 is guaranteed to stay clean, balanced, and unclipped on 1 line across tablet portrait and desktop.

3. **Step 3 (Row 2 2-Tier Adaptive Sub-row Architecture)**:
   - On screens `< lg` (including iPad portrait 768px–834px and mobile):
     - Change Row 2 container from `flex items-center justify-between overflow-x-auto` to `flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 pt-1.5 border-t border-[#EAE5D9]`.
     - **Top Sub-row (Tier 2A - Primary CTAs)**: Contains Nạp loạt, Quét QR, Thêm tranh, Xuất Excel.
       - Width calculation: 160px (Nạp Loạt) + 95px (Quét QR) + 110px (Thêm Tranh) + 105px (Xuất Excel) + 24px (gaps) = **494px**.
       - 494px comfortably fits within 736px (with **242px breathing room**). Zero wrapping, zero squishing.
     - **Bottom Sub-row (Tier 2B - Secondary Utility Buttons)**: Contains IP WiFi, Quản lý Cột, Phục hồi gốc.
       - Width calculation: 105px (IP WiFi / DB) + 110px (Quản Lý Cột) + 115px (Phục Hồi Gốc) + 16px (gaps) = **346px**.
       - 346px comfortably fits within 736px (with **390px breathing room**). Zero wrapping, zero squishing.
     - Because each sub-row fits well within 736px, **`overflow-x-auto` is completely removed**. This eliminates forced container horizontal scrollbars and scroll traps.
   - On Desktop (`lg:` ≥ 1024px):
     - `lg:flex-row lg:items-center lg:justify-between` activates automatically.
     - Top sub-row (Tier 2A) stays on the left.
     - Bottom sub-row (Tier 2B) stays on the right.
     - Total combined width: ~850px <= 976px available width.
     - Sits cleanly on a single horizontal row on desktop without wasting vertical space.

4. **Step 4 (Typography & Compact Mobile UX Compliance)**:
   - Button heights: `h-[32px] sm:h-[34px]` for primary CTAs; `h-[30px] sm:h-[32px]` for secondary utilities.
   - Font sizes: `text-[11px] sm:text-[11.5px] font-bold` / `font-semibold`.
   - Border radius: `rounded` (matching 6px compact enterprise standard).
   - "Phục Hồi Gốc": Label changes from `hidden lg:inline` to `hidden sm:inline`. On iPad portrait (768px ≥ 640px), the full text is clearly visible instead of an unlabeled mystery icon.
   - "Quản Lý Cột": `<span className="hidden sm:inline">Quản Lý Cột</span><span className="inline sm:hidden">Cột</span>`, giving full clarity on tablet portrait.

---

## 3. Caveats

- **CRM View Specific Actions**: `onOpenQuickAddCustomer` is accepted as a prop in `Header.jsx` but not currently invoked in Header; CRM quick actions are handled inside `CustomerManagementView`. This proposal preserves all existing props and callbacks without disturbance.
- **Strict Negative Boundaries**: No database reset, no migration tampering, and no modifying test definitions. All existing `data-testid` attributes (notably `header__column-manager--button`) are preserved verbatim.
- **No other files require CSS hacks**: Parent container in `App.jsx` and `index.css` already maintain `overflow-x: hidden`. The fix is isolated to `src/components/Header.jsx`.

---

## 4. Conclusion & Concrete Code Specification

### Summary of Solution
Implement the 2-Tier Adaptive layout in `src/components/Header.jsx`:
- **Row 1**: Gallery branding + SQLite status badge on left, View Switcher dropdown on right, with `shrink-0` safeguards and zero wrap.
- **Row 2**: Split into two sub-rows on `< lg` (tablet portrait & mobile) and collapse to 1 line on `lg:` (desktop).
  - Sub-row 1: 4 Primary action buttons (Nạp loạt, Quét QR, Thêm tranh, Xuất Excel).
  - Sub-row 2: 3 Secondary utility buttons (IP WiFi, Quản lý Cột, Phục hồi gốc) with visible labels.
- Remove `overflow-x-auto no-scrollbar` from Row 2.

### Concrete Code Replacement for `src/components/Header.jsx`

Replace lines 77 to 251 of `src/components/Header.jsx` with:

```jsx
    <header className="border-b border-[#DFCBAA] bg-[#FAF7F0]/95 backdrop-blur sticky top-0 z-30 shadow-xs">
      {/* Top Mustard Gold Band matching envelope flap */}
      <div className="h-1.5 w-full bg-[#C58C00]" />

      <div className="max-w-[1700px] w-full mx-auto px-4 lg:px-6 py-2.5 flex flex-col gap-2.5">
        {/* Row 1: Gallery Branding + System View Switcher Dropdown (Clean Spacing) */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          {/* Gallery Logo & Official Branding */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="/binhminh_logo.png"
              alt="Bình Minh Art Gallery"
              className="h-9 sm:h-10 object-contain drop-shadow-xs shrink-0"
            />
            <div className="border-l border-[#DFCBAA] pl-2.5 sm:pl-3 min-w-0">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <span className="font-serif text-xs md:text-sm font-bold text-[#7D1818] uppercase tracking-wider whitespace-nowrap">
                  Bình Minh Art Gallery
                </span>
                <button
                  type="button"
                  onClick={onOpenNetworkModal}
                  title="Trạng thái cơ sở dữ liệu & Cấu hình IP WiFi nội bộ"
                  className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-800 text-white rounded flex items-center gap-1 hover:bg-emerald-900 transition-colors shrink-0 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Cơ sở dữ liệu SQLite</span>
                </button>
              </div>
              <p className="text-[10.5px] text-stone-600 font-sans hidden sm:block truncate">
                29A Ngô Thời Nhiệm, Q.3, TP.HCM | ĐT: 0916554329 - 02836361808
              </p>
            </div>
          </div>

          {/* Center/Right: Dropdown Button 4 Chế Độ Xem (Gọn gàng, tinh tế) */}
          <div className="relative shrink-0" ref={viewDropdownRef}>
            <button
              type="button"
              onClick={() => setViewDropdownOpen(prev => !prev)}
              className="h-[36px] sm:h-[38px] px-3 sm:px-3.5 bg-white hover:bg-[#FAF8F5] border-2 border-[#7D1818] rounded-md shadow-xs flex items-center gap-2 text-[11.5px] sm:text-[12px] font-bold text-stone-900 transition-colors shrink-0 cursor-pointer"
            >
              <CurrentIcon className="w-4 h-4 text-[#7D1818] shrink-0" />
              <span className="whitespace-nowrap">{currentViewObj.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-stone-500 transition-transform shrink-0 ${viewDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {viewDropdownOpen && (
              <div className="absolute right-0 top-[42px] sm:top-[44px] w-[270px] bg-white border border-[#DFCBAA] rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-stone-100 animate-in fade-in-50 zoom-in-95">
                <div className="p-2 bg-[#FAF8F5] text-[10.5px] font-bold uppercase tracking-wider text-[#7D1818]">
                  Chọn Chế Độ Xem Hệ Thống
                </div>
                <div className="p-1 space-y-0.5">
                  {viewOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = activeView === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onChangeView(opt.id);
                          setViewDropdownOpen(false);
                        }}
                        className={`w-full p-2 text-left rounded-md flex items-start gap-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#7D1818] text-white'
                            : 'hover:bg-[#FAF8F5] text-stone-800'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-[#F4E5B8]' : 'text-[#7D1818]'}`} />
                        <div>
                          <span className="text-[12px] font-bold block">{opt.label}</span>
                          <span className={`text-[10px] block ${isSelected ? 'text-white/80' : 'text-stone-400'}`}>
                            {opt.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Action Toolbar (2-Tier Adaptive layout for iPad Portrait & Mobile, 1-Line on Desktop) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 pt-1.5 border-t border-[#EAE5D9]">
          {/* Top Sub-row (Tier 2A): Primary Action Buttons (Nạp loạt, Quét QR, Thêm tranh, Xuất Excel) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Primary Bulk Ingest CTA: Word + Folder */}
            <button
              type="button"
              onClick={onOpenBulkIngestModal}
              className="h-[32px] sm:h-[34px] px-2.5 sm:px-3.5 text-[11px] sm:text-[11.5px] font-bold text-white bg-[#252016] hover:bg-stone-800 border border-[#C58C00] rounded transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer shrink-0"
            >
              <Layers className="w-3.5 h-3.5 text-[#F4E5B8]" />
              <span className="hidden xl:inline">Nạp Loạt Dữ Liệu (Word + Folder Ảnh)</span>
              <span className="inline xl:hidden">Nạp Loạt (Word/Ảnh)</span>
            </button>

            {/* Quét Mã QR & Tìm Nhanh Tác Phẩm */}
            {onOpenQrScanner && (
              <button
                type="button"
                onClick={onOpenQrScanner}
                className="h-[32px] sm:h-[34px] px-2.5 sm:px-3 text-[11px] sm:text-[11.5px] font-bold text-[#1C1917] bg-[#F4E5B8] hover:bg-[#e8d499] border border-[#C58C00] rounded transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer shrink-0"
              >
                <QrCode className="w-3.5 h-3.5 text-[#7D1818]" />
                <span className="hidden lg:inline">Quét QR / Tìm Nhanh</span>
                <span className="inline lg:hidden">Quét QR</span>
              </button>
            )}

            {/* Add Single Painting */}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="h-[32px] sm:h-[34px] px-2.5 sm:px-3.5 text-[11px] sm:text-[11.5px] font-bold text-white bg-[#7D1818] hover:bg-[#691212] rounded transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-[#F4E5B8]" />
              <span>Thêm Tranh</span>
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={onExportExcel}
              disabled={isExporting}
              className="h-[32px] sm:h-[34px] px-2.5 sm:px-3 text-[11px] sm:text-[11.5px] font-semibold text-white bg-[#C58C00] hover:bg-[#A97500] rounded transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
          </div>

          {/* Bottom Sub-row (Tier 2B): Secondary Utility Buttons (IP WiFi, Quản lý Cột, Phục hồi gốc) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Network / WiFi Config */}
            <button
              type="button"
              onClick={onOpenNetworkModal}
              className="h-[30px] sm:h-[32px] px-2 sm:px-2.5 text-[11px] sm:text-[11.5px] font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-[#DFCBAA] rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Wifi className="w-3.5 h-3.5 text-[#7D1818]" />
              <span className="hidden sm:inline">IP WiFi / DB</span>
            </button>

            {/* Column Config Button (only relevant in Inventory Grid view) */}
            {activeView === 'inventory' && (
              <button
                type="button"
                onClick={onOpenColumnModal}
                title="Tùy biến ẩn / hiện và sắp xếp các cột trong bảng"
                data-testid="header__column-manager--button"
                className="h-[30px] sm:h-[32px] px-2 sm:px-2.5 text-[11px] sm:text-[11.5px] font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-[#DFCBAA] rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              >
                <Columns className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden sm:inline">Quản Lý Cột</span>
                <span className="inline sm:hidden">Cột</span>
              </button>
            )}

            {/* Reset Seed Button */}
            <button
              type="button"
              onClick={onResetSeed}
              title="Khôi phục lại 14 tác phẩm gốc ban đầu từ hồ sơ"
              className="h-[30px] sm:h-[32px] px-2 sm:px-2.5 text-[11px] sm:text-[11.5px] font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-[#DFCBAA] rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Phục Hồi Gốc</span>
            </button>
          </div>
        </div>
      </div>
    </header>
```

---

## 5. Verification Method

1. **Build Verification**:
   ```bash
   npm run build
   ```
   *Expected*: Passes with 0 errors (`✓ built in ...`).

2. **Automated Test Suite**:
   ```bash
   npm test
   ```
   *Expected*: All 47 tests pass (`ℹ pass 47`, `ℹ fail 0`).

3. **Responsive Visual & Geometry Check**:
   - Inspect viewport at `768px × 1024px` (iPad Portrait) and `834px × 1194px` (iPad Pro 11" Portrait).
   - Check that Row 1 renders Logo + Title + SQLite Badge on left, and Dropdown on right without wrapping.
   - Check that Row 2 splits into two clean sub-rows:
     - Sub-row 1: `[Nạp Loạt (Word/Ảnh)] [Quét QR] [Thêm Tranh] [Xuất Excel]` (width ~494px < 736px, fits on 1 sub-row).
     - Sub-row 2: `[IP WiFi / DB] [Quản Lý Cột] [Phục Hồi Gốc]` (width ~346px < 736px, fits on 1 sub-row).
   - Confirm neither sub-row wraps awkwardly or triggers horizontal scrollbars.
   - Confirm `document.body.scrollWidth === document.body.clientWidth` (zero horizontal overflow).
   - At `1024px` (Desktop / iPad Landscape): Confirm Row 2 collapses back to a single line (`lg:flex-row lg:items-center lg:justify-between`).

4. **Invalidation Conditions**:
   - If buttons overlap, text truncates with ellipsis unexpectedly on iPad portrait, or horizontal scrollbar appears on the header element, the change is invalid.
