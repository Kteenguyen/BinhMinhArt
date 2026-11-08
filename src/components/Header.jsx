import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Download,
  Upload,
  Columns,
  RotateCcw,
  Layers,
  LayoutGrid,
  Table2,
  Wifi,
  Sparkles,
  QrCode,
  Users,
  ChevronDown,
  UserPlus
} from 'lucide-react';

export default function Header({
  activeView,
  onChangeView,
  onOpenAddModal,
  onOpenBulkIngestModal,
  onOpenQrScanner,
  onExportExcel,
  onOpenColumnModal,
  onOpenNetworkModal,
  onResetSeed,
  isExporting,
  onOpenQuickAddCustomer
}) {
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const viewDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target)) {
        setViewDropdownOpen(false);
      }
    }
    if (viewDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [viewDropdownOpen]);

  const viewOptions = [
    {
      id: 'inventory',
      label: 'Quản Lý Kho (Excel)',
      icon: Table2,
      desc: 'Bảng dữ liệu kho tranh & cập nhật hồ sơ'
    },
    {
      id: 'crm',
      label: 'Quản Lý Khách Hàng (CRM)',
      icon: Users,
      desc: 'Khách ghé thăm, lịch hẹn & tranh quan tâm deal giá'
    },
    {
      id: 'exhibition',
      label: 'Bảng Giá & Xuất PDF',
      icon: LayoutGrid,
      desc: 'Catalogue trưng bày & xuất file PDF gửi khách'
    },
    {
      id: 'guest',
      label: 'Triển Lãm Cho Khách',
      icon: Sparkles,
      desc: 'Giao diện thưởng lãm nghệ thuật không lộ giá vốn'
    }
  ];

  const currentViewObj = viewOptions.find(v => v.id === activeView) || viewOptions[0];
  const CurrentIcon = currentViewObj.icon;
  return (
    <header className="border-b border-[#DFCBAA] bg-[#FAF7F0]/95 backdrop-blur sticky top-0 z-30 shadow-xs">
      {/* Top Mustard Gold Band matching envelope flap */}
      <div className="h-1.5 w-full bg-[#C58C00]" />

      <div className="max-w-[1700px] w-full mx-auto px-4 lg:px-6 py-2.5 flex flex-col gap-2.5">
        {/* Row 1: Gallery Branding + System View Switcher Dropdown (Clean Spacing) */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          {/* Gallery Logo & Official Branding */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="/binhminh_logo.png"
              alt="Bình Minh Art Gallery"
              className="h-9 sm:h-10 object-contain drop-shadow-xs shrink-0"
            />
            <div className="border-l border-[#DFCBAA] pl-2.5 sm:pl-3 min-w-0">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <span className="font-serif text-xs md:text-sm font-bold text-[#7D1818] uppercase tracking-wider whitespace-nowrap">
                  Bình Minh Art Gallery
                </span>
                <button
                  type="button"
                  onClick={onOpenNetworkModal}
                  title="Trạng thái cơ sở dữ liệu & Cấu hình IP WiFi nội bộ"
                  className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-800 text-white rounded flex items-center gap-1 hover:bg-emerald-900 transition-colors shrink-0 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Cơ sở dữ liệu SQLite</span>
                </button>
              </div>
              <p className="text-[10.5px] text-stone-600 font-sans hidden sm:block truncate">
                29A Ngô Thời Nhiệm, Q.3, TP.HCM | ĐT: 0916554329 - 02836361808
              </p>
            </div>
          </div>

          {/* Center/Right: Dropdown Button 4 Chế Độ Xem (Gọn gàng, tinh tế) */}
          <div className="relative shrink-0" ref={viewDropdownRef}>
            <button
              type="button"
              onClick={() => setViewDropdownOpen(prev => !prev)}
              className="h-[36px] sm:h-[38px] px-3 sm:px-3.5 bg-white hover:bg-[#FAF8F5] border-2 border-[#7D1818] rounded-md shadow-xs flex items-center gap-2 text-[11.5px] sm:text-[12px] font-bold text-stone-900 transition-colors shrink-0 cursor-pointer"
            >
              <CurrentIcon className="w-4 h-4 text-[#7D1818] shrink-0" />
              <span className="whitespace-nowrap">{currentViewObj.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-stone-500 transition-transform shrink-0 ${viewDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {viewDropdownOpen && (
              <div className="absolute right-0 top-[42px] sm:top-[44px] w-[270px] bg-white border border-[#DFCBAA] rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-stone-100 animate-in fade-in-50 zoom-in-95">
                <div className="p-2 bg-[#FAF8F5] text-[10.5px] font-bold uppercase tracking-wider text-[#7D1818]">
                  Chọn Chế Độ Xem Hệ Thống
                </div>
                <div className="p-1 space-y-0.5">
                  {viewOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = activeView === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onChangeView(opt.id);
                          setViewDropdownOpen(false);
                        }}
                        className={`w-full p-2 text-left rounded-md flex items-start gap-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#7D1818] text-white'
                            : 'hover:bg-[#FAF8F5] text-stone-800'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-[#F4E5B8]' : 'text-[#7D1818]'}`} />
                        <div>
                          <span className="text-[12px] font-bold block">{opt.label}</span>
                          <span className={`text-[10px] block ${isSelected ? 'text-white/80' : 'text-stone-400'}`}>
                            {opt.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Action Toolbar (2-Tier Adaptive layout for iPad Portrait & Mobile, 1-Line on Desktop) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 pt-1.5 border-t border-[#EAE5D9]">
          {/* Top Sub-row (Tier 2A): Primary Action Buttons (Nạp loạt, Quét QR, Thêm tranh, Xuất Excel) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Primary Bulk Ingest CTA: Word + Folder */}
            <button
              type="button"
              onClick={onOpenBulkIngestModal}
              className="h-[32px] sm:h-[34px] px-2.5 sm:px-3.5 text-[11px] sm:text-[11.5px] font-bold text-white bg-[#252016] hover:bg-stone-800 border border-[#C58C00] rounded transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer shrink-0"
            >
              <Layers className="w-3.5 h-3.5 text-[#F4E5B8]" />
              <span className="hidden xl:inline">Nạp Loạt Dữ Liệu (Word + Folder Ảnh)</span>
              <span className="inline xl:hidden">Nạp Loạt (Word/Ảnh)</span>
            </button>

            {/* Quét Mã QR & Tìm Nhanh Tác Phẩm */}
            {onOpenQrScanner && (
              <button
                type="button"
                onClick={onOpenQrScanner}
                className="h-[32px] sm:h-[34px] px-2.5 sm:px-3 text-[11px] sm:text-[11.5px] font-bold text-[#1C1917] bg-[#F4E5B8] hover:bg-[#e8d499] border border-[#C58C00] rounded transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer shrink-0"
              >
                <QrCode className="w-3.5 h-3.5 text-[#7D1818]" />
                <span className="hidden lg:inline">Quét QR / Tìm Nhanh</span>
                <span className="inline lg:hidden">Quét QR</span>
              </button>
            )}

            {/* Add Single Painting */}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="h-[32px] sm:h-[34px] px-2.5 sm:px-3.5 text-[11px] sm:text-[11.5px] font-bold text-white bg-[#7D1818] hover:bg-[#691212] rounded transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-[#F4E5B8]" />
              <span>Thêm Tranh</span>
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={onExportExcel}
              disabled={isExporting}
              className="h-[32px] sm:h-[34px] px-2.5 sm:px-3 text-[11px] sm:text-[11.5px] font-semibold text-white bg-[#C58C00] hover:bg-[#A97500] rounded transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
          </div>

          {/* Bottom Sub-row (Tier 2B): Secondary Utility Buttons (IP WiFi, Quản lý Cột, Phục hồi gốc) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Network / WiFi Config */}
            <button
              type="button"
              onClick={onOpenNetworkModal}
              className="h-[30px] sm:h-[32px] px-2 sm:px-2.5 text-[11px] sm:text-[11.5px] font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-[#DFCBAA] rounded transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Wifi className="w-3.5 h-3.5 text-[#7D1818]" />
              <span className="hidden sm:inline">IP WiFi / DB</span>
            </button>

            {/* Column Config Button (only relevant in Inventory Grid view) */}
            {activeView === 'inventory' && (
              <button
                type="button"
                onClick={onOpenColumnModal}
                title="Tùy biến ẩn / hiện và sắp xếp các cột trong bảng"
                data-testid="header__column-manager--button"
                className="h-[30px] sm:h-[32px] px-2 sm:px-2.5 text-[11px] sm:text-[11.5px] font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-[#DFCBAA] rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              >
                <Columns className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden sm:inline">Quản Lý Cột</span>
                <span className="inline sm:hidden">Cột</span>
              </button>
            )}

            {/* Reset Seed Button - Safeguarded to protect 335 authentic artworks */}
            <button
              type="button"
              onClick={onResetSeed}
              disabled
              aria-disabled="true"
              title="Tính năng Phục Hồi Gốc đã được khóa an toàn để bảo vệ 335 tác phẩm gốc"
              className="h-[30px] sm:h-[32px] px-2 sm:px-2.5 text-[11px] sm:text-[11.5px] font-semibold text-stone-400 bg-stone-100 border border-stone-200 rounded flex items-center gap-1.5 whitespace-nowrap cursor-not-allowed shrink-0 opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline">Phục Hồi Gốc</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
