# Handoff Report — Explorer 2: Responsive Layout Investigation for R2 & R3

- **Target Files**:
  - `src/components/FilterToolbar.jsx` (Requirement R2)
  - `src/components/KpiCards.jsx` (Requirement R3)
- **Role**: Explorer 2 (Bình Minh Art Gallery — iPad Portrait Adaptive Layout)
- **Date**: 2026-10-25T10:48:00Z
- **Working Directory**: `/Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_explorer_2`

---

## 1. Observation

### 1.1 Context & Breakpoint Analysis
- **App Layout Context** (`src/App.jsx`, line 816):
  ```jsx
  <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 md:px-6 py-2.5 flex flex-col">
  ```
  On iPad portrait (768px): `md:px-6` applies 24px left + 24px right padding = 48px padding.
  - Available width on 768px iPad: `768 - 48 = 720px`.
  - Available width on 834px iPad Pro 11": `834 - 48 = 786px`.
- **Tailwind Breakpoints** (`tailwind.config.js`):
  - `sm`: 640px
  - `md`: 768px
  - `lg`: 1024px
  - `xl`: 1280px
  On iPad in portrait orientation (768px – 834px), `md:` (768px) is ACTIVE, while `lg:` (1024px) is INACTIVE.

---

### 1.2 Observations on `FilterToolbar.jsx` (Requirement R2)
- **File**: `src/components/FilterToolbar.jsx`
- **Sub-Tabs Section (Row 1)** (lines 77-148):
  - Two buttons: `Kho Tranh Hiện Có (Chưa bán)` (inStockCount) and `Đã Bán (Hồ Sơ Giao Dịch)` (soldCount).
  - Button height is `h-[34px] px-3 sm:px-4 text-[11.5px] sm:text-[12px] font-bold rounded-md`.
  - Combined width of both buttons: ~500px.
  - Sits inside a container with `overflow-x-auto no-scrollbar`. On 720px available width (768px iPad), ~500px fits comfortably without horizontal scrolling.
  - Desktop helper hint (line 137) is hidden on tablet (`hidden lg:flex`).
- **Filter Controls Section (Row 2)** (lines 150-365):
  - Currently structured as a single forced row:
    ```jsx
    // Line 151:
    <div className="bg-white border border-[#EAE5D9] rounded-lg p-1.5 sm:p-2 flex items-center justify-between gap-2 shadow-xs overflow-x-auto no-scrollbar">
      // Line 152:
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-1 min-w-[500px] lg:min-w-0">
    ```
  - **Left Group** contains:
    1. Search input form + QR button (`onOpenQrScanner`) + "Mở Chi Tiết" jump button: ~400px.
    2. Artist Filter dropdown combobox (`w-[150px] sm:w-[190px]`): 190px.
    3. Medium Filter dropdown (`w-[125px] sm:w-[145px]`): 145px.
    Total left group width: ~735px.
  - **Right Group** (line 332) contains:
    1. "Chưa có giá" toggle chip: ~105px.
    2. "Xóa lọc" button: ~70px.
    3. Counter ("Hiển thị X/Y tác phẩm"): ~135px.
    Total right group width: ~310px.
  - **Total Required Row Width**: 735px + 310px = **~1045px**!
  - **Problem**:
    Because total width (1045px) significantly exceeds 720px (768px iPad) and 786px (834px iPad), line 152 has a forced constraint `min-w-[500px]`, and line 151 has `overflow-x-auto no-scrollbar`. On iPad portrait, the filter controls overflow the viewport, forcing users to swipe horizontally back and forth, clipping the dropdowns or counter.

---

### 1.3 Observations on `KpiCards.jsx` (Requirement R3)
- **File**: `src/components/KpiCards.jsx`
- **Root Grid Container** (line 8):
  ```jsx
  <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 lg:gap-3.5 my-2.5">
  ```
- **Card 5 Container** (line 90):
  ```jsx
  <div className="col-span-2 md:col-span-1 bg-white border border-[#EAE5D9] p-2.5 lg:p-3 rounded-lg shadow-sm">
  ```
- **Problem**:
  On iPad portrait (768px), `md:` is active (768px >= 768px), triggering `md:grid-cols-5`.
  - Available width inside `<main>`: 720px.
  - Gap width: 4 gaps × 10px (`gap-2.5`) = 40px.
  - Width per card: `(720 - 40) / 5 = 136px`!
  - **Content Squishing**:
    - Card 2 (`Đang Trưng Bày`): `Trị giá: $1,250,000 USD` (requires ~145px text width). Inside a 136px card with 20px padding (116px net width), this text wraps onto 3 broken lines.
    - Card 3 (`Đã Giao Dịch`): `Doanh thu: $320,000 USD` (requires ~155px text width). Squeezed and wrapped awkwardly.
    - Card 5 (`Chất Liệu Tranh`): `Sơn mài: 22 bức` and `Sơn dầu: 16 bức` collide with labels.

---

## 2. Logic Chain

### 2.1 Logic Chain for `FilterToolbar.jsx` (Requirement R2)
1. **Elimination of `min-w-[500px]` and `overflow-x-auto`**:
   - The overflow scroll is caused by placing all 6 controls (Search, QR, Artist, Medium, Status Chips, Counter) on a single horizontal row on screen widths < 1024px.
   - Removing `min-w-[500px]` from the left group and replacing `overflow-x-auto no-scrollbar` on the container with `flex flex-col lg:flex-row lg:items-center justify-between gap-2` allows the container to dynamically adapt:
     - On `< 1024px` (Tablet Portrait & Mobile): Items stack into 2 tiers.
     - On `>= 1024px` (Desktop): Items layout in a single clean row (`lg:flex-row`).
2. **Tier 1 Layout (Search + QR Jump)**:
   - `<div className="flex items-center gap-1.5 sm:gap-2 w-full lg:flex-1 lg:min-w-0">`
   - Spans 100% width of the card on tablet portrait (704px available).
   - Search input gets ~515px to ~610px width, providing a comfortable search and scanning experience.
   - QR Jump button (`onOpenQrScanner`) sits comfortably on the right of the search input (`h-[32px]`).
3. **Tier 2 Layout (Artist + Medium + Status Chips + Counter)**:
   - `<div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full lg:w-auto shrink-0 flex-wrap sm:flex-nowrap">`
   - Divided into two sub-groups:
     - **Left Sub-group**:
       - Artist Dropdown: `w-[150px] sm:w-[180px]` (180px)
       - Medium Select: `w-[125px] sm:w-[140px]` (140px)
       - Gap: 8px.
       - Subtotal: 180 + 140 + 8 = **328px**.
     - **Right Sub-group** (`ml-auto lg:ml-0`):
       - "Chưa có giá" toggle chip: ~100px.
       - "Xóa lọc" button: ~65px.
       - Counter ("Hiển thị X/Y tác phẩm"): ~130px.
       - Gaps: 12px.
       - Subtotal: 100 + 65 + 130 + 12 = **307px**.
   - **Width Verification on 768px iPad Portrait**:
     - Total width needed for Tier 2: 328px + 307px = **635px**.
     - Available card width: 720px - 16px padding = **704px**.
     - Margin / Breathing Room: `704 - 635 = 69px` of spare space!
     - On 834px iPad: `770 - 635 = 135px` of spare space!
     - Result: Both sub-groups fit completely on a single line in Tier 2 with **0 horizontal overflow**, **0 scrollbars**, and **0 button collisions**.
4. **Sub-Tabs Preservation (Row 1)**:
   - Sub-tabs (Kho Tranh Hiện Có vs Đã Bán) remain prominent, 34px height (`h-[34px]`), comfortable font weight (600/bold), touch-friendly, matching Enterprise Compact Mobile UX standards.

---

### 2.2 Logic Chain for `KpiCards.jsx` (Requirement R3)
1. **Breakpoints for Balanced 2-Row Grid**:
   - Replace line 8:
     `className="grid grid-cols-2 md:grid-cols-5 gap-2.5 lg:gap-3.5 my-2.5"`
     with:
     `className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 lg:gap-3.5 my-2.5"`
   - Replace line 90:
     `className="col-span-2 md:col-span-1 ..."`
     with:
     `className="col-span-2 sm:col-span-1 ..."`
2. **Behavior Across Viewports**:
   - **Mobile (<640px)**: `grid-cols-2`. Cards 1 & 2 on Row 1, Cards 3 & 4 on Row 2, Card 5 spans 2 columns on Row 3 (`col-span-2`).
   - **Tablet Portrait (768px – 834px, sm: to lg:)**:
     - `sm:grid-cols-3` is active; `lg:grid-cols-5` is inactive.
     - Row 1 renders **3 cards**: Card 1 (Tổng Kho), Card 2 (Đang Trưng Bày), Card 3 (Đã Giao Dịch).
     - Row 2 renders **2 cards**: Card 4 (Chờ Định Giá) in Col 1, Card 5 (Chất Liệu Tranh) in Col 2 (`sm:col-span-1`).
   - **Desktop (>=1024px)**: `lg:grid-cols-5` is active. All 5 cards render in 1 single row of 5 columns.
3. **Card Width Calculations on Tablet Portrait**:
   - **On 768px (iPad 9th/10th gen, Mini)**:
     - Available grid width: 720px.
     - Gap: 2 gaps × 10px (`gap-2.5`) = 20px.
     - Card width: `(720 - 20) / 3 = 233.3px`!
     - `233.3px >= 220px` (exceeds the 220px requirement threshold).
   - **On 834px (iPad Pro 11" portrait)**:
     - Available grid width: 786px.
     - Card width: `(786 - 20) / 3 = 255.3px`!
     - `255.3px >= 220px`.
4. **Breathing Room Verification**:
   - In 233.3px card width with 20px padding (`p-2.5`), net width is 213.3px:
     - Card 2: `Trị giá: $1,250,000 USD` (145px) fits on 1 line with 68px of margin.
     - Card 3: `Doanh thu: $320,000 USD` (155px) fits on 1 line with 58px of margin.
     - Card 1: `HS. 12 Họa Sĩ` and `45 tác phẩm` fit with zero wrapping.
     - Card 4: `Trực tiếp thỏa thuận` fits on 1 line.
     - Card 5: `Sơn mài: 22 bức` / `Sơn dầu: 16 bức` maintain generous column separation.

---

## 3. Caveats & Coordination Notes

1. **Header Sticky Offset Coordination**:
   - Explorer 1 is implementing a 2-tier adaptive layout for `Header.jsx`.
   - In `FilterToolbar.jsx`, line 75 defines:
     `className="sticky top-[75px] sm:top-[82px] z-20 bg-[#FAF8F5]/95 backdrop-blur-xs py-1.5 space-y-1.5 transition-all"`
   - If Header height increases slightly on tablet portrait (e.g. from 82px to ~92px or ~100px), Worker should align the `top-[...]` class (e.g. `top-[75px] sm:top-[82px] md:top-[96px] lg:top-[82px]`) or confirm Header height so FilterToolbar does not overlap Header when scrolling.
2. **Mobile Phones (<640px) Graceful Degradation**:
   - Tier 2 includes `flex-wrap sm:flex-nowrap`. On smartphones (<640px, e.g. iPhone 390px-430px), the Artist and Medium dropdowns sit on line 1 of Tier 2, while status chips and counter wrap to line 2. This prevents mobile clipping.
   - On tablet portrait (>=640px, 768px-834px), `sm:flex-nowrap` guarantees Tier 2 stays on a single line.
3. **No Database or API Side Effects**:
   - These modifications are strictly presentation/CSS layout changes in React JSX. All props, state bindings, and event handlers are 100% preserved.

---

## 4. Conclusion & Concrete Code Changes for Worker

### 4.1 Target 1: `src/components/KpiCards.jsx`

#### Change 1: Line 8 (Root Grid)
```diff
- <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 lg:gap-3.5 my-2.5">
+ <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 lg:gap-3.5 my-2.5">
```

#### Change 2: Line 90 (Card 5 Column Span)
```diff
- <div className="col-span-2 md:col-span-1 bg-white border border-[#EAE5D9] p-2.5 lg:p-3 rounded-lg shadow-sm">
+ <div className="col-span-2 sm:col-span-1 bg-white border border-[#EAE5D9] p-2.5 lg:p-3 rounded-lg shadow-sm">
```

---

### 4.2 Target 2: `src/components/FilterToolbar.jsx`

#### Change: Replace Lines 150–365
Replace the single-row filter container (which had `overflow-x-auto` and `min-w-[500px]`) with the 2-Tier adaptive container:

```jsx
      {/* Row 2: 2-Tier Adaptive Filter Controls (Tier 1: Search & QR on top; Tier 2: Filters, Chips, Counter on bottom for <1024px) */}
      <div className="bg-white border border-[#EAE5D9] rounded-lg p-1.5 sm:p-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2 shadow-xs">
        {/* Tier 1: Search Form + QR Jump Button (Full width on <1024px, expands on desktop) */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full lg:flex-1 lg:min-w-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (onQuickJumpSearch && searchTerm.trim()) {
                onQuickJumpSearch(searchTerm.trim());
              }
            }}
            className="relative flex-1 flex items-center gap-1.5"
          >
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Quét QR / Nhập Mã Tranh hoặc tìm tên tranh, tác giả, hoá đơn..."
                className="w-full h-[32px] pl-8 pr-7 text-[11.5px] sm:text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md focus:outline-none focus:border-stone-500 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchTerm.trim() && onQuickJumpSearch && (
              <button
                type="submit"
                title="Mở thẳng Trang Chi Tiết Tác Phẩm khớp kết quả tìm kiếm"
                className="h-[32px] px-2.5 bg-[#252016] hover:bg-stone-800 text-[#FAF8F5] text-[11px] font-bold rounded-md flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <span>Mở Chi Tiết</span>
                <ArrowRight className="w-3 h-3 text-[#C5A059]" />
              </button>
            )}

            {onOpenQrScanner && (
              <button
                type="button"
                onClick={onOpenQrScanner}
                title="Quét Mã QR hoặc Tìm Nhanh Mã Tranh để mở Trang Chi Tiết Tác Phẩm"
                className="h-[32px] px-2.5 bg-[#FAF8F5] hover:bg-[#F4E5B8] text-stone-800 border border-[#C5A059] text-[11px] sm:text-[11.5px] font-bold rounded-md flex items-center gap-1 shrink-0 transition-colors whitespace-nowrap"
              >
                <QrCode className="w-3.5 h-3.5 text-[#7D1818]" />
                <span className="hidden sm:inline">Quét QR</span>
              </button>
            )}
          </form>
        </div>

        {/* Tier 2: Artist Filter + Medium Filter + Status Toggle Chips ("Chưa có giá", "Xóa lọc") + Counter */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full lg:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          {/* Left sub-group of Tier 2: Artist & Medium Filters */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Artist Filter Dropdown with Searchable Combobox */}
            {setArtistFilter && (
              <div className="w-[150px] sm:w-[180px] shrink-0 relative" ref={artistDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setArtistDropdownOpen(prev => !prev);
                    setArtistSearchKey('');
                  }}
                  title="Chọn hoặc tìm kiếm theo danh mục Họa sĩ"
                  className="w-full h-[32px] pl-7 pr-7 text-[11px] sm:text-[11.5px] bg-[#FAF8F5] hover:bg-[#F5EFE6] border border-[#EAE5D9] rounded-md focus:outline-none focus:border-stone-500 font-semibold text-stone-800 flex items-center justify-between text-left transition-colors truncate"
                >
                  <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9E7A36] shrink-0" />
                  <span className="truncate">
                    {artistFilter === 'all'
                      ? `Tất cả họa sĩ (${artists.length})`
                      : `HS. ${artistFilter} (${currentArtistObj?.count || 0})`}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-stone-500 absolute right-2 top-1/2 -translate-y-1/2 transition-transform ${artistDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu Popup */}
                {artistDropdownOpen && (
                  <div className="absolute left-0 top-[36px] w-[260px] bg-white border border-[#DFCBAA] rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
                    {/* Search Input Box */}
                    <div className="p-2 border-b border-[#EAE5D9] bg-[#FAF8F5]">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          ref={artistSearchInputRef}
                          type="text"
                          value={artistSearchKey}
                          onChange={(e) => setArtistSearchKey(e.target.value)}
                          placeholder="Gõ tên họa sĩ để tìm..."
                          className="w-full h-[30px] pl-8 pr-7 text-[11.5px] bg-white border border-[#DDD5C4] rounded focus:outline-none focus:border-[#9E7A36]"
                        />
                        {artistSearchKey && (
                          <button
                            type="button"
                            onClick={() => setArtistSearchKey('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-[220px] overflow-y-auto p-1 divide-y divide-stone-50 text-[11.5px]">
                      {/* All Artists Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setArtistFilter('all');
                          setArtistDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 text-left rounded flex items-center justify-between font-semibold transition-colors ${
                          artistFilter === 'all'
                            ? 'bg-[#7D1818] text-white'
                            : 'text-stone-700 hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <span>Tất cả họa sĩ</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          artistFilter === 'all' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {artists.reduce((acc, a) => acc + (a.count || 0), 0)}
                        </span>
                      </button>

                      {filteredArtists.length === 0 ? (
                        <div className="py-4 text-center text-stone-400 italic text-[11px]">
                          Không tìm thấy họa sĩ "{artistSearchKey}"
                        </div>
                      ) : (
                        filteredArtists.map((artist) => {
                          const isSelected = artistFilter === artist.name;
                          return (
                            <button
                              key={artist.name}
                              type="button"
                              onClick={() => {
                                setArtistFilter(artist.name);
                                setArtistDropdownOpen(false);
                              }}
                              className={`w-full px-2.5 py-1.5 text-left rounded flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-[#7D1818] text-white font-bold'
                                  : 'text-stone-800 hover:bg-[#FAF8F5]'
                              }`}
                            >
                              <span className="truncate">HS. {artist.name}</span>
                              <span className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-mono ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                              }`}>
                                {artist.count}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Medium Filter Dropdown */}
            <div className="w-[125px] sm:w-[140px] shrink-0">
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
                className="w-full h-[32px] px-2 text-[11px] sm:text-[11.5px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md focus:outline-none focus:border-stone-500 font-medium text-stone-700"
              >
                <option value="all">Tất cả chất liệu</option>
                <option value="Sơn mài">Sơn mài</option>
                <option value="Sơn dầu">Sơn dầu</option>
                <option value="Lụa">Lụa</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          {/* Right sub-group of Tier 2: Status Toggle Chips & Counter */}
          <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap ml-auto lg:ml-0">
            {inventorySubTab === 'chua_ban' && setPendingPriceOnly && (
              <button
                type="button"
                onClick={() => setPendingPriceOnly(!pendingPriceOnly)}
                className={`h-[30px] px-2 sm:px-2.5 text-[11px] sm:text-[11.5px] font-semibold rounded-md transition-colors flex items-center gap-1 shrink-0 ${
                  pendingPriceOnly
                    ? 'bg-stone-800 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Chưa có giá</span>
              </button>
            )}

            {/* Clear filter */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-[30px] px-2 text-[11px] font-medium text-stone-500 hover:text-red-600 transition-colors flex items-center gap-1 shrink-0"
              >
                <X className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}

            {/* Counter */}
            <span className="text-[10.5px] sm:text-[11px] text-stone-500 font-medium pl-1.5 sm:pl-2 border-l border-stone-200 shrink-0">
              Hiển thị <strong>{filteredCount}</strong>/{totalTabItems} <span className="hidden sm:inline">tác phẩm</span>
            </span>
          </div>
        </div>
      </div>
```

---

## 5. Verification Method

1. **Build Integrity Check**:
   ```bash
   npm run build
   ```
   - Must exit with code 0 and build without warnings/errors.
2. **Automated Unit & Regression Suite**:
   ```bash
   npm test
   ```
   - Must execute all 47 test cases and pass with 0 failures.
3. **Viewport Measurement Checks**:
   - At **768px × 1024px** (iPad 9th/10th gen, Mini):
     - FilterToolbar outer container must have `scrollWidth === clientWidth` (0 horizontal scrollbar).
     - Search form occupies 100% of Tier 1 (~704px).
     - Tier 2 renders Artist + Medium on left and Chips + Counter on right on a single line (total width 635px <= 704px).
     - KpiCards renders exactly 3 cards on Row 1 and 2 cards on Row 2.
     - Each card width measures >= 220px (specifically ~233.3px).
     - Financial text (`$1,250,000 USD` and `$320,000 USD`) displays on 1 single line with no text wrap or truncation.
   - At **834px × 1194px** (iPad Pro 11" portrait):
     - FilterToolbar has 0 horizontal scrollbar.
     - KpiCards renders 3 cards on Row 1 and 2 cards on Row 2 with width ~255.3px each.
   - At **1280px × 800px** (Desktop):
     - KpiCards renders all 5 cards on 1 single row.
     - FilterToolbar renders Tier 1 on left and Tier 2 on right in 1 single row (`lg:flex-row`).
