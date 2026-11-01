import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function StickyPaginationBar({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [6, 9, 12, 24, 'all'],
  square = false,
  dark = false,
  leftHint = null
}) {
  const effectivePageSize = pageSize === 'all' ? Math.max(totalItems, 1) : Number(pageSize) || 9;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * effectivePageSize + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(totalItems, safePage * effectivePageSize);

  // Build visible page numbers
  const pageNumbers = [];
  const startPage = Math.max(1, safePage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  for (let p = startPage; p <= endPage; p++) {
    pageNumbers.push(p);
  }

  const radiusClass = square ? 'rounded-none' : 'rounded-md';

  const containerTheme = dark
    ? 'bg-[#1A1714]/95 border-[#383024] text-[#FAF7F0]'
    : 'bg-[#FAF7F0]/95 border-[#DFCBAA] text-stone-800';

  const btnBase = `h-[32px] min-w-[32px] px-2 text-[11.5px] font-semibold border transition-colors inline-flex items-center justify-center ${radiusClass}`;
  const btnInactive = dark
    ? 'bg-[#24201C] border-[#383024] text-[#C9BFA9] hover:bg-[#302A24] disabled:opacity-35'
    : 'bg-white border-[#DFCBAA] text-stone-700 hover:bg-stone-100 disabled:opacity-40';
  const btnActive = 'bg-[#7D1818] border-[#7D1818] text-[#FAF7F0] font-bold shadow-xs';

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 z-30 border-t backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 font-sans w-full max-w-full ${containerTheme} ${radiusClass}`}
    >
      {/* Left: Range counter & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11.5px]">
        <span>
          Hiển thị <strong>{startItem}–{endItem}</strong> / tổng <strong>{totalItems}</strong> tác phẩm
        </span>

        <div className="flex items-center gap-1.5">
          <span className="opacity-75">Mỗi trang:</span>
          <select
            value={pageSize}
            onChange={e => {
              const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
              onPageSizeChange(val);
            }}
            className={`h-[30px] px-2 text-[11.5px] font-semibold border focus:outline-none ${radiusClass} ${
              dark
                ? 'bg-[#24201C] border-[#383024] text-[#FAF7F0]'
                : 'bg-white border-[#DFCBAA] text-stone-800'
            }`}
          >
            {pageSizeOptions.map(opt => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'Tất cả' : `${opt} tranh`}
              </option>
            ))}
          </select>
        </div>

        {leftHint && (
          <span className="hidden lg:inline text-[11px] opacity-65 border-l border-[#DFCBAA] pl-3">
            {leftHint}
          </span>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <span className="text-[11px] opacity-75 mr-1 hidden lg:inline">
          Trang <strong>{safePage}</strong> / {totalPages}
        </span>

        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(1)}
          title="Trang đầu"
          className={`${btnBase} ${btnInactive}`}
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          title="Trang trước"
          className={`${btnBase} ${btnInactive} gap-1 px-2`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Trước</span>
        </button>

        {pageNumbers.map(num => (
          <button
            key={num}
            type="button"
            onClick={() => onPageChange(num)}
            className={`${btnBase} ${num === safePage ? btnActive : btnInactive}`}
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          title="Trang sau"
          className={`${btnBase} ${btnInactive} gap-1 px-2`}
        >
          <span className="hidden lg:inline">Sau</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Trang cuối"
          className={`${btnBase} ${btnInactive}`}
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
