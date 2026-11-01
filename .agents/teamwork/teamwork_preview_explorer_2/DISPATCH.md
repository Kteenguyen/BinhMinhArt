# Dispatch to Explorer 2

## Mission
Investigate FilterToolbar.jsx and KpiCards.jsx responsive layout in Bình Minh Art Gallery.

## Inputs
- ORIGINAL_REQUEST: /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/ORIGINAL_REQUEST.md
- Plan: /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/orchestrator_1/plan.md

## Focus Area
1. Requirement R2: 2-Tier Adaptive FilterToolbar Layout in FilterToolbar.jsx
   - Eliminate fixed `min-w-[500px]` overflow constraint.
   - Sub-tabs (Kho Tranh vs Đã Bán) remain prominent and comfortable to tap.
   - 2-Tier layout on `< 1024px` (768px - 834px):
     - Tier 1: Search form + QR jump button.
     - Tier 2: Artist Filter dropdown + Medium Filter + status toggle chips ("Chưa có giá", "Xóa lọc") + Counter.
     - Fitting 100% of 768px–834px iPad portrait screens with no horizontal overflow.
2. Requirement R3: Balanced 2-Row KpiCards Grid on iPad Portrait in KpiCards.jsx
   - Replace `md:grid-cols-5` with `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` so iPad portrait (768px–834px) renders 3 cards on Row 1 and 2 cards on Row 2 (width ≥ 220px each).
   - Check breathing room for financial values, counts, and artist metrics without text truncation or overlap.
- Provide concrete lines of code, class changes, and strategy for Worker.
- Write findings to /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_explorer_2/handoff.md
