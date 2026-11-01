# SWE Light Execution Plan

## Objective
Implement R1 (Read-only Table, Disable Inline Edit), R2 (Sticky Right Actions Column), and R3 (Column Visibility Manager) with localStorage persistence and full test/build verification.

## Architecture & Workflow Strategy
Strict SWE Light pattern:
1. Dispatch `teamwork_preview_implementer` with verbatim original task to produce working diff and tests.
2. Maintain open-issues ledger tracking any unverified aspects, known issues, or remaining risks.
3. Dispatch `teamwork_preview_reviewer` (Round 1) to break, fix, and re-verify.
4. Dispatch `teamwork_preview_reviewer` (Round 2) to break, fix, and re-verify.
5. Dispatch `teamwork_preview_reviewer` (Round 3) to break, fix, and re-verify.
6. Personally inspect diff and run build & test commands.
7. Dispatch `teamwork_preview_victory_auditor` for blocking independent audit.
8. Report completion back to Sentinel.

## Verification Requirements
- Read-only table (no double click editing)
- Sticky right actions column
- Column visibility modal with localStorage persistence
- npm run build & npm test pass with zero errors
