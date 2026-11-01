# Plan: 2-Tier Adaptive Responsive Layout for iPad Portrait (768px – 834px)

## Objective
Implement an adaptive, high-density, clean responsive layout for iPad in portrait orientation (viewport width 768px – 834px) across Bình Minh Art Gallery system, eliminating button overlapping, squished controls, and horizontal container overflow.

## Scope of Changes
1. **Header.jsx (R1)**:
   - Row 1: Gallery Branding + System View Switcher Dropdown.
   - Row 2: Primary action buttons (Nạp loạt, Quét QR, Thêm tranh, Xuất Excel) on top sub-row; secondary utility buttons (IP WiFi, Quản lý Cột, Phục hồi gốc) on bottom sub-row or grouped logically with zero overlap and no forced horizontal scrollbar.
2. **FilterToolbar.jsx (R2)**:
   - Eliminate fixed `min-w-[500px]` overflow constraint.
   - Sub-tabs (Kho Tranh vs Đã Bán) prominent and touch-friendly.
   - 2-Tier adaptive layout on `< 1024px` / iPad portrait (768px - 834px):
     - Tier 1: Search form + QR jump button.
     - Tier 2: Artist filter dropdown + Medium filter + status chips ("Chưa có giá", "Xóa lọc") + Counter.
     - 100% width fitting without horizontal overflow.
3. **KpiCards.jsx (R3)**:
   - Replace `md:grid-cols-5` with `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` so iPad portrait (768px–834px) renders 3 cards on Row 1 and 2 cards on Row 2 (width ≥ 220px each).
   - Generous breathing room, no text truncation or overlap.
4. **Zero Horizontal Overflow & Polish (R4)**:
   - Check `App.jsx`, page wrappers, container CSS for `overflow-x: hidden`.
   - Confine horizontal scroll strictly to inner table container of `ExcelGrid.jsx`.
   - Ensure Floating Bulk Action Bar and `StickyPaginationBar.jsx` fit comfortably in 768px portrait viewports.
5. **Quality & Acceptance**:
   - Tablet portrait viewports verification (768px × 1024px & 834px × 1194px).
   - `npm run build` passes with 0 errors.

## Phase Execution
- Phase 1: Survey & Technical Exploration (3 Explorers in parallel)
- Phase 2: Synthesis & Worker Execution (Worker implements and runs build)
- Phase 3: Review & Verification (2 Reviewers)
- Phase 4: Adversarial Challenge (2 Challengers)
- Phase 5: Forensic Integrity Audit (1 Auditor)
- Phase 6: Gate Verdict & Sentinel Handoff
