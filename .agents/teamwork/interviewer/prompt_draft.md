Upgrade BinhMinhArt painting inventory management by purging dummy/fallback test records, implementing automatic thousand-separator comma formatting for monetary inputs, and developing a 2-tier location hierarchy across data models, UI forms, filters, grid view, and location history.

Working directory: /Users/mac/Documents/antigravity/BinhMinhArt
Integrity mode: development

## Requirements

### R1. Data and Fallback Cleanup
Audit and purge all mock, test, and fallback records across the system, specifically removing test price logs containing "Stress concurrent update #..." and synthetic fallback data structures in storage and UI states, while strictly preserving genuine artwork data and authentic history logs.

### R2. Thousand-Separator Formatting for Monetary Inputs
Support automatic thousand-separator comma formatting (e.g. displaying 2,109 instead of 2109) on price and monetary input fields (such as USD price, listed price, valuation) during and after typing, ensuring that inputs handle commas smoothly and parse to valid numeric values without losing commas or corrupting backend persistence and calculations.

### R3. Two-Tier Location System
Implement a 2-tier location hierarchy where Level 1 represents the primary warehouse or area (e.g. "Kho tầng hầm", "Phòng trưng bày Tầng 1", "Kho Gò Vấp") and Level 2 represents an optional detailed placement (e.g. "khay 1", "kệ A3", "giá số 2", or left blank). Store Level 1 and Level 2 as distinct fields (location_level1 and location_level2) while maintaining full backward compatibility with the existing compound location field (e.g. composite format "location_level1 - location_level2" or Level 1 alone when Level 2 is omitted). Integrate 2-tier location selection and display across:
- Painting creation and edit forms (AddPaintingModal, PaintingDetailModal)
- Location filter controls
- The ExcelGrid table view
- The artwork "Nhật Ký Vị Trí" (Location History) tab and logging API.

## Verification Resources
Run existing project test suites (npm test, npm run test:api, npm run test:e2e) and implement automated unit/API/E2E tests specifically validating data cleanup, monetary comma formatting, and 2-tier location operations.

## Acceptance Criteria

### Data Cleanup
- [ ] No price history entries or database records contain "Stress concurrent update #..." or mock fallback data.
- [ ] All authentic artwork records, prices, and valid transaction logs remain intact without data loss or schema corruption.

### Monetary Input Formatting
- [ ] Entering numeric digits into monetary and price fields (e.g. price USD) automatically displays numbers with thousand-separator commas (e.g. 2,109, 10,500,000).
- [ ] Numeric inputs handle typing, deleting, pasting, and backspacing cleanly without cursor jumping or dropping commas.
- [ ] Form submission, calculations, and backend persistence receive and store clean numeric values without formatting syntax errors.

### Two-Tier Location Management
- [ ] Painting add and edit forms provide inputs for Level 1 (mandatory or primary area) and Level 2 (optional tray/shelf/rack).
- [ ] Database and state models store location_level1 and location_level2 while preserving backward compatibility with the single location field for existing components and queries.
- [ ] Location filter supports filtering artworks by Level 1 area and Level 2 sub-location.
- [ ] ExcelGrid displays the 2-tier location clearly (showing Level 1 and Level 2 when present).
- [ ] The "Nhật Ký Vị Trí" tab records and renders location movements displaying Level 1 and Level 2 details.

### Verification
- [ ] Existing automated test suites (npm test, npm run test:api, npm run test:e2e) pass with zero regressions.
- [ ] New automated tests verify:
  1. Purging of "Stress concurrent update" test logs.
  2. Input formatting with thousand commas and numeric extraction.
  3. 2-tier location CRUD, filtering, backward compatibility, and history logging.
