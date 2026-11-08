import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('View Pagination Architecture: Continuous Show List vs Paginated Table View', () => {

  test('R1: ExhibitionView (Show List View) contains zero pagination imports, state, or controls', () => {
    const code = fs.readFileSync(path.join(ROOT, 'src/components/ExhibitionView.jsx'), 'utf8');

    // 1. Must not import StickyPaginationBar
    assert.ok(
      !code.includes('StickyPaginationBar'),
      'ExhibitionView must not import or render StickyPaginationBar'
    );

    // 2. Must not maintain currentPage or pageSize states
    assert.ok(
      !code.includes('currentPage') && !code.includes('setCurrentPage'),
      'ExhibitionView must not maintain currentPage state or setters'
    );
    assert.ok(
      !code.includes('pageSize') && !code.includes('setPageSize'),
      'ExhibitionView must not maintain pageSize state or setters'
    );

    // 3. Must not slice paintings for pagination chunking
    assert.ok(
      !code.includes('paginatedPaintings'),
      'ExhibitionView must render all displayedPaintings directly without paginatedPaintings slice'
    );

    // 4. Must not contain page size selector options
    assert.ok(
      !code.includes('pageSizeOptions'),
      'ExhibitionView must not define pageSizeOptions'
    );

    // 5. Must directly map displayedPaintings in artistSections
    assert.ok(
      code.includes('for (const p of displayedPaintings)'),
      'ExhibitionView must iterate over displayedPaintings directly'
    );
  });

  test('R1: CustomerExhibitionView (Guest Show View) renders continuously without pagination slicing', () => {
    const code = fs.readFileSync(path.join(ROOT, 'src/components/CustomerExhibitionView.jsx'), 'utf8');

    // 1. Must not import or render StickyPaginationBar
    assert.ok(
      !code.includes('StickyPaginationBar'),
      'CustomerExhibitionView must not import or render StickyPaginationBar'
    );

    // 2. Must not maintain currentPage or pageSize states
    assert.ok(
      !code.includes('currentPage') && !code.includes('setCurrentPage'),
      'CustomerExhibitionView must not maintain currentPage state or setters'
    );
    assert.ok(
      !code.includes('pageSize') && !code.includes('setPageSize'),
      'CustomerExhibitionView must not maintain pageSize state or setters'
    );

    // 3. Must not slice guest paintings into pagination chunks
    assert.ok(
      !code.includes('paginatedGuestPaintings'),
      'CustomerExhibitionView must not slice guest paintings into pagination chunks'
    );

    // 4. Must directly map guestPaintings in artistSections
    assert.ok(
      code.includes('for (const p of guestPaintings)'),
      'CustomerExhibitionView must iterate over guestPaintings directly'
    );
  });

  test('R1: ExcelGrid (Table View) strictly preserves full pagination controls and state', () => {
    const code = fs.readFileSync(path.join(ROOT, 'src/components/ExcelGrid.jsx'), 'utf8');

    // 1. Must import and render StickyPaginationBar
    assert.ok(
      code.includes("import StickyPaginationBar from './StickyPaginationBar';"),
      'ExcelGrid must import StickyPaginationBar'
    );
    assert.ok(
      code.includes('<StickyPaginationBar'),
      'ExcelGrid must render StickyPaginationBar'
    );

    // 2. Must maintain currentPage and pageSize state
    assert.ok(
      code.includes('const [currentPage, setCurrentPage] = useState(1);'),
      'ExcelGrid must maintain currentPage state initialized to 1'
    );
    assert.ok(
      code.includes('const [pageSize, setPageSize] = useState('),
      'ExcelGrid must maintain pageSize state'
    );

    // 3. Must compute paginatedPaintings using slice
    assert.ok(
      code.includes('sortedPaintings.slice(start, start + size)'),
      'ExcelGrid must slice sortedPaintings for pagination'
    );

    // 4. Must pass page size options and event handlers
    assert.ok(
      code.includes('pageSizeOptions='),
      'ExcelGrid must pass pageSizeOptions to StickyPaginationBar'
    );
    assert.ok(
      code.includes('onPageChange='),
      'ExcelGrid must handle onPageChange'
    );
    assert.ok(
      code.includes('onPageSizeChange='),
      'ExcelGrid must handle onPageSizeChange'
    );
  });

  test('R1: StickyPaginationBar maintains full contract of pagination controls', () => {
    const code = fs.readFileSync(path.join(ROOT, 'src/components/StickyPaginationBar.jsx'), 'utf8');

    assert.ok(code.includes('Hiển thị'), 'Must render items range counter');
    assert.ok(code.includes('Mỗi trang:'), 'Must render page size selector label');
    assert.ok(code.includes('<select'), 'Must render page size select dropdown');
    assert.ok(code.includes('pageNumbers.map'), 'Must render numeric page buttons');
    assert.ok(code.includes('title="Trang đầu"'), 'Must render first page button');
    assert.ok(code.includes('title="Trang trước"'), 'Must render previous page button');
    assert.ok(code.includes('title="Trang sau"'), 'Must render next page button');
    assert.ok(code.includes('title="Trang cuối"'), 'Must render last page button');
  });

  test('R1: Global CSS enforces native smooth scrolling on html', () => {
    const css = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf8');
    assert.ok(
      /html\s*\{[^}]*scroll-behavior:\s*smooth;?[^}]*\}/s.test(css),
      'src/index.css must configure scroll-behavior: smooth on html element'
    );
  });
});
