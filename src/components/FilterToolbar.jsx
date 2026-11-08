import React, { useState } from 'react';
import {
  Search,
  X,
  QrCode,
  ArrowRight,
  Package,
  CheckCircle2,
  Clock
} from 'lucide-react';
import SmartArtistDropdown from './SmartArtistDropdown';

export default function FilterToolbar({
  searchTerm,
  setSearchTerm,
  onQuickJumpSearch,
  onOpenQrScanner,
  inventorySubTab = 'chua_ban',
  setInventorySubTab,
  inStockCount = 0,
  soldCount = 0,
  pendingPriceOnly = false,
  setPendingPriceOnly,
  artistFilter = 'all',
  setArtistFilter,
  artists = [],
  mediumFilter,
  setMediumFilter,
  totalTabItems = 0,
  filteredCount = 0
}) {
  const isFiltered =
    searchTerm ||
    artistFilter !== 'all' ||
    mediumFilter !== 'all' ||
    pendingPriceOnly;

  const handleClearFilters = () => {
    setSearchTerm('');
    if (setArtistFilter) setArtistFilter('all');
    if (setPendingPriceOnly) setPendingPriceOnly(false);
    setMediumFilter('all');
  };

  return (
    <div className="sticky top-[75px] sm:top-[82px] z-20 bg-[#FAF8F5]/95 backdrop-blur-xs py-1.5 space-y-1.5 transition-all">
      {/* Row 1: Primary Sub-Tabs (Kho Tranh Hiện Có vs Tranh Đã Bán) */}
      <div className="flex items-center justify-between gap-2 bg-white border border-[#EAE5D9] rounded-lg p-1.5 shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (setInventorySubTab) setInventorySubTab('chua_ban');
            }}
            className={`h-[34px] px-3 sm:px-4 text-[11.5px] sm:text-[12px] font-bold rounded-md transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
              inventorySubTab === 'chua_ban'
                ? 'bg-[#252016] text-[#FAF8F5] shadow-sm border border-[#C5A059]'
                : 'bg-[#FAF8F5] text-stone-700 hover:bg-[#EAE5D9]/70 border border-transparent'
            }`}
          >
            <Package
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                inventorySubTab === 'chua_ban' ? 'text-[#C5A059]' : 'text-emerald-700'
              }`}
            />
            <span>Kho Tranh Hiện Có (Chưa bán)</span>
            <span
              className={`px-1.5 sm:px-2 py-0.5 text-[10.5px] sm:text-[11px] font-mono rounded-full ${
                inventorySubTab === 'chua_ban'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {inStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (setInventorySubTab) setInventorySubTab('da_ban');
              if (setPendingPriceOnly) setPendingPriceOnly(false);
            }}
            className={`h-[34px] px-3 sm:px-4 text-[11.5px] sm:text-[12px] font-bold rounded-md transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
              inventorySubTab === 'da_ban'
                ? 'bg-[#7D1818] text-[#FAF8F5] shadow-sm border border-[#C5A059]'
                : 'bg-[#FAF8F5] text-stone-700 hover:bg-amber-50 border border-transparent'
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                inventorySubTab === 'da_ban' ? 'text-[#F4E5B8]' : 'text-amber-700'
              }`}
            />
            <span>Đã Bán (Hồ Sơ Giao Dịch)</span>
            <span
              className={`px-1.5 sm:px-2 py-0.5 text-[10.5px] sm:text-[11px] font-mono rounded-full ${
                inventorySubTab === 'da_ban'
                  ? 'bg-amber-400 text-[#1C1917] font-bold'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {soldCount}
            </span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-2 text-[11px] text-stone-500 shrink-0">
          {inventorySubTab === 'chua_ban' ? (
            <span>
              💡 Nhấn nút <strong className="text-[#7D1818]">"Đã bán"</strong> ở cột Thao Tác để nhập Giá bán & Mã hoá đơn
            </span>
          ) : (
            <span>
              📋 Bảng lưu trữ các tác phẩm đã giao dịch (kèm Giá bán, Mã hoá đơn, Ngày bán, Khách hàng)
            </span>
          )}
        </div>
      </div>

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
        <div className="flex items-center justify-between gap-1 sm:gap-2 w-full lg:w-auto shrink-0 flex-nowrap overflow-x-auto no-scrollbar">
          {/* Left sub-group of Tier 2: Artist & Medium Filters */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Smart Artist Filter Dropdown (Portal-based, immune to horizontal clipping) */}
            {setArtistFilter && (
              <SmartArtistDropdown
                selectedArtist={artistFilter}
                onSelectArtist={setArtistFilter}
                artists={artists}
                allCount={totalTabItems || artists.reduce((acc, a) => acc + (a.count || 0), 0)}
                allOptionLabel="Tất cả họa sĩ"
                className="w-[140px] sm:w-[170px] lg:w-[190px]"
                dropdownWidth={280}
              />
            )}

            {/* Medium Filter Dropdown */}
            <div className="w-[115px] sm:w-[130px] lg:w-[140px] shrink-0">
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
                className="w-full h-[32px] px-1.5 sm:px-2 text-[10.5px] sm:text-[11.5px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md focus:outline-none focus:border-stone-500 font-medium text-stone-700"
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
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap ml-auto lg:ml-0">
            {inventorySubTab === 'chua_ban' && setPendingPriceOnly && (
              <button
                type="button"
                onClick={() => setPendingPriceOnly(!pendingPriceOnly)}
                className={`h-[30px] px-2 sm:px-2.5 text-[10.5px] sm:text-[11.5px] font-semibold rounded-md transition-colors flex items-center gap-1 shrink-0 ${
                  pendingPriceOnly
                    ? 'bg-stone-800 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span className="hidden sm:inline">Chưa có giá</span>
                <span className="inline sm:hidden">Chưa giá</span>
              </button>
            )}

            {/* Clear filter */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-[30px] px-1.5 sm:px-2 text-[10.5px] sm:text-[11px] font-medium text-stone-500 hover:text-red-600 transition-colors flex items-center gap-1 shrink-0"
              >
                <X className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}

            {/* Counter */}
            <span className="text-[10px] sm:text-[11px] text-stone-500 font-medium pl-1 sm:pl-2 border-l border-stone-200 shrink-0">
              Hiển thị <strong>{filteredCount}</strong>/{totalTabItems} <span className="hidden md:inline">tác phẩm</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
