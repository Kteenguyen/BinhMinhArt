# Dispatch to Worker 1

## Mission
Implement the 2-Tier Adaptive responsive layout for iPad in portrait orientation (viewport width 768px – 834px) across Bình Minh Art Gallery system, eliminating button overlapping, squished controls, and horizontal container overflow.

## Reference Inputs
- ORIGINAL_REQUEST: /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/ORIGINAL_REQUEST.md
- Explorer 1 Report (Header.jsx): /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_explorer_1/handoff.md
- Explorer 2 Report (FilterToolbar.jsx & KpiCards.jsx): /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_explorer_2/handoff.md
- Explorer 3 Report (Container boundaries, ExcelGrid, Floating Bar, StickyPaginationBar): /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_explorer_3/handoff.md

## Exclusive File Ownership
You have exclusive write ownership of:
1. `src/components/Header.jsx`
2. `src/components/FilterToolbar.jsx`
3. `src/components/KpiCards.jsx`
4. `index.html`
5. `src/index.css`
6. `src/App.jsx`
7. `src/components/ExcelGrid.jsx`
8. `src/components/StickyPaginationBar.jsx`
9. `test/table-readonly-sticky-columns.test.mjs`

## Detailed Implementation Tasks
1. **R1 (`src/components/Header.jsx`)**:
   - Implement 2-Tier Adaptive layout for iPad portrait (768px - 834px).
   - Row 1: Gallery branding + SQLite badge on left, View Switcher dropdown on right, with `shrink-0` and `min-w-0` to prevent awkward wrapping.
   - Row 2: Replace `overflow-x-auto no-scrollbar` with `flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 pt-1.5 border-t border-[#EAE5D9]`.
     - Sub-row 1 (Tier 2A): Primary action buttons (Nạp loạt, Quét QR, Thêm tranh, Xuất Excel).
     - Sub-row 2 (Tier 2B): Secondary utility buttons (IP WiFi, Quản lý Cột, Phục hồi gốc) with visible labels on iPad portrait (`hidden sm:inline` instead of `hidden lg:inline`).
   - On Desktop (`lg:` >= 1024px), automatically collapses to a clean 1-line toolbar.
2. **R2 (`src/components/FilterToolbar.jsx`)**:
   - Eliminate fixed `min-w-[500px]` overflow constraint and remove `overflow-x-auto no-scrollbar`.
   - Preserve prominent sub-tabs (Kho Tranh vs Đã Bán) in Row 1.
   - Refactor filter controls into 2-Tier adaptive container:
     - Tier 1: Search Form + QR Jump button (spans 100% on tablet portrait).
     - Tier 2: Left sub-group (Artist combobox + Medium select) and Right sub-group ("Chưa có giá" chip + "Xóa lọc" + Counter).
     - Both sub-groups fit on a single line on 768px–834px tablet portrait with zero overflow.
     - On desktop (`lg:`), cleanly preserves 1-row layout (`lg:flex-row`).
3. **R3 (`src/components/KpiCards.jsx`)**:
   - Replace `md:grid-cols-5` with `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`.
   - Replace `col-span-2 md:col-span-1` with `col-span-2 sm:col-span-1` on Card 5.
   - Result: 3 cards on Row 1, 2 cards on Row 2 on 768px–834px iPad portrait (width >= 220px each), eliminating text truncation and awkward wrapping.
4. **R4 (`index.html`, `src/index.css`, `src/App.jsx`, `src/components/ExcelGrid.jsx`, `src/components/StickyPaginationBar.jsx`)**:
   - Add `overflow-x-hidden` on `<body>` and `<div id="root">` in `index.html`.
   - Declare `html, body, #root { overflow-x: hidden; max-width: 100vw; width: 100%; }` in `src/index.css`.
   - Add `w-full max-w-full overflow-x-hidden min-w-0` to root flex container and `<main>` in `src/App.jsx`.
   - Add `w-full min-w-0 max-w-full` to outer wrapper and `w-full max-w-full` to inner scroll container in `src/components/ExcelGrid.jsx`.
   - Elevate Floating Bulk Action Bar in `src/App.jsx` to `fixed bottom-16 sm:bottom-16` with `max-w-[calc(100vw-2rem)] w-max` so it clears `StickyPaginationBar` with 14px breathing room.
   - Switch labels in `src/components/StickyPaginationBar.jsx` ("Trang X / Y", "Trước", "Sau") from `hidden sm:inline` to `hidden lg:inline` so pagination bar fits on a single row at 768px portrait width without wrapping.
   - Add regression test assertion to `test/table-readonly-sticky-columns.test.mjs`.

## Verification Requirements
- Run `npm test` and ensure all tests pass (0 failures).
- Run `npm run build` and ensure production build completes with 0 errors.
- Document verification commands and output in your handoff report.
- Write your complete handoff report to: `/Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_worker_1/handoff.md`.


## 2026-10-25T10:49:14Z
You are Worker 1 for Bình Minh Art Gallery.
Task:
Implement the 2-Tier Adaptive responsive layout for iPad portrait (768px – 834px) across Bình Minh Art Gallery system per requirements R1, R2, R3, R4.
1. Update `src/components/Header.jsx` (R1).
2. Update `src/components/FilterToolbar.jsx` (R2).
3. Update `src/components/KpiCards.jsx` (R3).
4. Update `index.html`, `src/index.css`, `src/App.jsx`, `src/components/ExcelGrid.jsx`, `src/components/StickyPaginationBar.jsx`, and `test/table-readonly-sticky-columns.test.mjs` (R4).
5. Run `npm test` and `npm run build` to verify that all tests pass and production build succeeds with 0 errors.
6. Write your complete handoff report to: /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_worker_1/handoff.md
7. When finished, send a message to the orchestrator with your status, test output, and summary.
