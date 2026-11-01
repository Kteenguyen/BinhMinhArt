# Dispatch: Worker 2 (Iteration 2 — Floating Bulk Action Bar Clearance Remediation)

## Mission
Remediate the Floating Bulk Action Bar vertical clearance defect identified by Challenger 1, ensuring zero physical overlap with `StickyPaginationBar` across all tablet viewports (768px, 800px, 820px, 834px) and across all table lengths (e.g. 6 items or page size 6, 10 items, or filtered states).

## Defect Evidence from Challenger 1
- Report: /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_challenger_ipad_1/handoff.md
- Defect summary:
  1. On 800px × 1280px tablet viewport: Floating Bulk Action Bar at `fixed bottom-16` overlaps `StickyPaginationBar` by 23.75px, occluding the page size dropdown and page numbers.
  2. On 768px × 1024px with short content (e.g. 6 items): Overlaps `StickyPaginationBar` by 11.75px.
  3. On 768px with 10 items: Clearance is only 0.25px.
- Reproduction scripts:
  - `node scratch/test_overlap.mjs`
  - `node scratch/test_short_table.mjs`

## Root Cause
`StickyPaginationBar` sits in normal document flow at the end of `ExcelGrid` inside `<main>`. When the table content is short or the viewport height is tall (1280px), `StickyPaginationBar` sits higher than `window.innerHeight - 64px`. Because the Floating Bulk Action Bar is `fixed bottom-16` without dynamic bottom clearance on `<main>`, the floating bar sits directly on top of the pagination bar.

## Remediation Tasks
1. In `src/App.jsx`:
   - Add dynamic bottom clearance on `<main>` when `selectedPaintingIdsForTag.size > 0`:
     `${selectedPaintingIdsForTag.size > 0 ? 'pb-24 sm:pb-28' : ''}`
   - Position the Floating Bulk Action Bar cleanly (e.g., `fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] w-max`) so that when the user scrolls down to the end of the page, the pagination bar has ample guaranteed clearance (≥ 16px) above/below the floating bar.
2. In `test/table-readonly-sticky-columns.test.mjs`:
   - Update any static assertions for the Floating Bulk Action Bar position and `<main>` padding.
3. Verification:
   - Run `node scratch/test_overlap.mjs` and `node scratch/test_short_table.mjs` to verify `collides === false` and positive clearance.
   - Run `npm test` and `npm run build` to verify 100% pass and 0 errors.
4. Output your handoff to `/Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_worker_2/handoff.md` and message the orchestrator.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-10-25T11:10:46Z
You are Worker 2 for Bình Minh Art Gallery.
Your working directory: /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_worker_2
Read your dispatch assignment: /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_worker_2/DISPATCH.md
Read the user request: /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/ORIGINAL_REQUEST.md
Read Challenger 1's defect report: /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_challenger_ipad_1/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Remediate the Floating Bulk Action Bar vertical clearance defect identified by Challenger 1:
1. Update `src/App.jsx` so that `<main>` includes dynamic bottom padding when `selectedPaintingIdsForTag.size > 0` (`pb-24 sm:pb-28`), and position the Floating Bulk Action Bar cleanly (e.g. `fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)] w-max`) with guaranteed clearance (>= 16px) over StickyPaginationBar across all viewports (768px, 800px, 820px, 834px) and across short table scenarios.
2. Update `test/table-readonly-sticky-columns.test.mjs` to reflect the updated classes and verify R4.
3. Test using `node scratch/test_overlap.mjs` and `node scratch/test_short_table.mjs` (if server is running on 3000) or write verification checks.
4. Run `npm test` and `npm run build` and ensure all tests pass with 0 errors.
5. Write your complete handoff report to: /Users/mac/Documents/antigravity/BinhMinhArt/.agents/teamwork/teamwork_preview_worker_2/handoff.md
6. Send a message to orchestrator when finished.
