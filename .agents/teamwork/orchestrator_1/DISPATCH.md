# Dispatch Log

## 2026-10-25T10:38:35Z
From: 24effa1f-8ba4-4c56-aa02-6504ab70bed0 (Sentinel)
To: orchestrator_1 (Project Orchestrator)

Task:
Audit and implement a 2-Tier Adaptive responsive layout for iPad in portrait orientation (viewport width 768px – 834px) across Bình Minh Art Gallery system, eliminating button overlapping, squished controls, and horizontal container overflow.

Requirements:
- R1. 2-Tier Adaptive Header & Action Toolbar for iPad Portrait (768px - 834px) in Header.jsx
  - Row 1: Gallery Branding + System View Switcher Dropdown with clean spacing.
  - Row 2: Primary action buttons (Nạp loạt, Quét QR, Thêm tranh, Xuất Excel) on top sub-row, secondary utility buttons (IP WiFi, Quản lý Cột, Phục hồi gốc) on bottom sub-row or grouped logically with zero button overlapping, no clipped text, and no forced horizontal container scrollbar.
- R2. 2-Tier Adaptive FilterToolbar Layout in FilterToolbar.jsx
  - Sub-tabs (Kho Tranh vs Đã Bán) remain prominent and comfortable to tap.
  - Search form + QR jump button placed on Tier 1; Artist Filter dropdown + Medium Filter + status toggle chips ("Chưa có giá", "Xóa lọc") + Counter placed on Tier 2 on screen widths < 1024px, fitting 100% of 768px–834px iPad portrait screens with no horizontal overflow.
- R3. Balanced 2-Row KpiCards Grid on iPad Portrait in KpiCards.jsx
  - Replace md:grid-cols-5 with grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 so iPad portrait (768px–834px) renders 3 cards on Row 1 and 2 cards on Row 2 (width ≥ 220px each), providing ample breathing room for financial values, counts, and artist metrics without text truncation or overlap.
- R4. Zero Horizontal Overflow & Floating Bar Polish
  - Ensure page body and main containers maintain overflow-x: hidden. Confine horizontal scroll strictly to the inner table container of ExcelGrid.jsx. Ensure Floating Bulk Action Bar and StickyPaginationBar.jsx fit comfortably within 768px portrait viewports.
- Acceptance Criteria & Tablet Portrait Viewport Verification (768px × 1024px & 834px × 1194px).
- Production build passes with 0 errors (`npm run build`).
