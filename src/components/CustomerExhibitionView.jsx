import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Maximize2,
  Printer,
  Grid,
  Columns,
  Square,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  CheckCircle2,
  X,
  Users,
  ChevronDown,
  Table2,
  LayoutGrid
} from 'lucide-react';
import StickyPaginationBar from './StickyPaginationBar';

function formatGuestPrice(gia) {
  if (gia === null || gia === undefined || gia === '') {
    return 'Giá: Liên hệ phòng tranh';
  }
  const num = Number(gia);
  if (isNaN(num)) return 'Giá: Liên hệ phòng tranh';
  return `Giá: $${num.toLocaleString('en-US')}`;
}

export default function CustomerExhibitionView({
  paintings,
  onOpenLightbox,
  onExitGuestMode,
  onChangeView
}) {
  const [selectedArtist, setSelectedArtist] = useState('all');
  const [selectedMedium, setSelectedMedium] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('chua_ban');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridCols, setGridCols] = useState(2); // 1 | 2 | 3
  const [theme, setTheme] = useState('cream'); // 'cream' | 'dark' | 'white'
  const [showPrice, setShowPrice] = useState(true);
  const [selectedArtworkModal, setSelectedArtworkModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
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

  // Extract unique artists with counts
  const artistStats = useMemo(() => {
    const map = new Map();
    for (const p of paintings) {
      if (availabilityFilter === 'chua_ban' && p.tinh_trang === 'da_ban') continue;
      const name = (p.tac_gia || 'Dương Văn Sen').trim();
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [paintings, availabilityFilter]);

  // Filter paintings for guest exhibition
  const guestPaintings = useMemo(() => {
    return paintings.filter(p => {
      if (availabilityFilter === 'chua_ban' && p.tinh_trang === 'da_ban') {
        return false;
      }
      if (selectedArtist !== 'all' && (p.tac_gia || '').trim() !== selectedArtist) {
        return false;
      }
      if (selectedMedium !== 'all') {
        const med = (p.chat_lieu || '').toLowerCase();
        if (!med.includes(selectedMedium.toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (p.ten_tac_pham || '').toLowerCase().includes(q);
        const matchArtist = (p.tac_gia || '').toLowerCase().includes(q);
        const matchSize = (p.kich_thuoc_tranh || '').toLowerCase().includes(q);
        if (!matchTitle && !matchArtist && !matchSize) return false;
      }
      return true;
    });
  }, [paintings, availabilityFilter, selectedArtist, selectedMedium, searchQuery]);

  // Paginate guest paintings
  const paginatedGuestPaintings = useMemo(() => {
    if (pageSize === 'all') return guestPaintings;
    const size = Number(pageSize) || 6;
    const start = (currentPage - 1) * size;
    return guestPaintings.slice(start, start + size);
  }, [guestPaintings, currentPage, pageSize]);

  // Group paginated paintings into distinct Artist Sections so each Artist gets their own Header & Table!
  const artistSections = useMemo(() => {
    const groups = new Map();
    for (const p of paginatedGuestPaintings) {
      const artistName = (p.tac_gia || 'Dương Văn Sen').trim();
      if (!groups.has(artistName)) {
        groups.set(artistName, []);
      }
      groups.get(artistName).push(p);
    }

    return Array.from(groups.entries()).map(([artistName, items]) => {
      const rows = [];
      for (let i = 0; i < items.length; i += gridCols) {
        const slice = items.slice(i, i + gridCols);
        while (slice.length < gridCols) slice.push(null);
        rows.push(slice);
      }
      // Total count of this artist across all pages (for accurate section subtitle)
      const totalForArtist = guestPaintings.filter(
        gp => (gp.tac_gia || 'Dương Văn Sen').trim() === artistName
      ).length;

      return {
        artistName,
        totalForArtist,
        itemsCount: items.length,
        rows
      };
    });
  }, [paginatedGuestPaintings, guestPaintings, gridCols]);

  // Print / Export Guest PDF Catalogue (Grouped cleanly by Artist Section!)
  const handlePrintCatalogue = () => {
    const printWin = window.open('', '_blank', 'width=1100,height=900');
    if (!printWin) {
      window.print();
      return;
    }

    const origin = window.location.origin;
    const cols = 3;

    // Group ALL filtered paintings by Artist for full PDF export
    const pdfGroups = new Map();
    for (const p of guestPaintings) {
      const artistName = (p.tac_gia || 'Dương Văn Sen').trim();
      if (!pdfGroups.has(artistName)) pdfGroups.set(artistName, []);
      pdfGroups.get(artistName).push(p);
    }

    const sectionsHtml = Array.from(pdfGroups.entries())
      .map(([artistName, items], sIdx) => {
        const pdfRows = [];
        for (let i = 0; i < items.length; i += cols) {
          const slice = items.slice(i, i + cols);
          while (slice.length < cols) slice.push(null);
          pdfRows.push(slice);
        }

        const rowsHtml = pdfRows
          .map(row => {
            const imgCells = row
              .map(p => {
                if (!p) return `<td class="img-cell empty"></td>`;
                const src = (p.hinh_anh && p.hinh_anh[0]) || p.thumbnail_url || '';
                const fullUrl = src.startsWith('http') ? src : `${origin}${src}`;
                return `
                  <td class="img-cell">
                    <div class="img-box">
                      ${src ? `<img src="${fullUrl}" alt="${p.ten_tac_pham || ''}" />` : ''}
                    </div>
                  </td>
                `;
              })
              .join('');

            const captionCells = row
              .map(p => {
                if (!p) return `<td class="cap-cell empty"></td>`;
                const specs = [p.chat_lieu, p.kich_thuoc_tranh, p.nam_sang_tac]
                  .filter(Boolean)
                  .join(', ');
                const priceStr =
                  p.gia !== null && p.gia !== undefined && p.gia !== ''
                    ? `Giá: $${Number(p.gia).toLocaleString('en-US')}`
                    : 'Giá: Liên hệ';
                return `
                  <td class="cap-cell">
                    <div class="t-name">${p.ten_tac_pham || ''}</div>
                    <div class="t-specs">${specs}</div>
                    ${showPrice ? `<div class="t-price">${priceStr}</div>` : ''}
                  </td>
                `;
              })
              .join('');

            return `
              <tbody class="pair-group">
                <tr>${imgCells}</tr>
                <tr>${captionCells}</tr>
              </tbody>
            `;
          })
          .join('');

        return `
          <div class="artist-section ${sIdx > 0 ? 'page-break' : ''}">
            <div class="header">
              <div class="sub-brand">BÌNH MINH ART GALLERY • 29A Ngô Thời Nhiệm, Q.3, TP.HCM</div>
              <div class="title">BẢNG GIÁ TRANH CỦA HS. ${artistName.toUpperCase()}</div>
              <div class="period">(01/2026) — ${items.length} tác phẩm</div>
            </div>
            <table>${rowsHtml}</table>
          </div>
        `;
      })
      .join('');

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>CATALOGUE & BẢNG GIÁ — BÌNH MINH ART GALLERY</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; border-radius: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; font-family: "Times New Roman", Georgia, serif; color: #1C1917; background: #FFF; }
          .page-break { page-break-before: always; break-before: page; margin-top: 16px; }
          .header { text-align: center; border-bottom: 2px solid #7D1818; padding-bottom: 10px; margin-bottom: 14px; }
          .sub-brand { font-size: 10pt; color: #7D1818; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }
          .title { font-size: 16pt; font-weight: bold; margin: 4px 0 2px; text-transform: uppercase; }
          .period { font-size: 11.5pt; color: #444; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          tbody.pair-group { page-break-inside: avoid; break-inside: avoid; }
          td.img-cell { width: 33.33%; height: 215px; border: 1px solid #D6CFC2; border-bottom: none; padding: 8px; background: #FAF8F5; text-align: center; vertical-align: middle; }
          td.cap-cell { border: 1px solid #D6CFC2; padding: 8px 6px 14px; text-align: center; vertical-align: top; background: #FFF; }
          td.empty { border: none; background: transparent; }
          .img-box { width: 100%; height: 198px; display: flex; align-items: center; justify-content: center; }
          .img-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .t-name { font-size: 12pt; font-weight: bold; margin-bottom: 2px; }
          .t-specs { font-size: 10.5pt; color: #333; margin-bottom: 2px; }
          .t-price { font-size: 11pt; font-weight: bold; color: #7D1818; }
        </style>
      </head>
      <body>
        ${sectionsHtml}
        <script>window.onload = () => setTimeout(() => window.print(), 350);</script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const palette = {
    cream: {
      pageBg: 'bg-[#F7F3EB] text-stone-900',
      headerBg: 'bg-[#FAF7F0] border-[#D6C7B2]',
      sheetBg: 'bg-[#FAF7F0] border-[#D6C7B2]',
      imgCell: 'bg-[#EFE9DC] border-[#D6C7B2]',
      captionCell: 'bg-white border-[#D6C7B2] text-stone-900',
      specsText: 'text-stone-700',
      priceText: 'text-[#7D1818]'
    },
    dark: {
      pageBg: 'bg-[#12100E] text-[#FAF7F0]',
      headerBg: 'bg-[#1A1714] border-[#383024]',
      sheetBg: 'bg-[#181512] border-[#383024]',
      imgCell: 'bg-[#211D19] border-[#383024]',
      captionCell: 'bg-[#161310] border-[#383024] text-[#FAF7F0]',
      specsText: 'text-[#C9BFA9]',
      priceText: 'text-[#E5B84B]'
    },
    white: {
      pageBg: 'bg-stone-100 text-stone-900',
      headerBg: 'bg-white border-stone-300',
      sheetBg: 'bg-white border-stone-300',
      imgCell: 'bg-stone-50 border-stone-300',
      captionCell: 'bg-white border-stone-300 text-stone-900',
      specsText: 'text-stone-600',
      priceText: 'text-[#7D1818]'
    }
  }[theme];

  const artworkFrameHeight =
    gridCols === 1
      ? 'h-[460px] md:h-[580px] lg:h-[680px]'
      : gridCols === 2
      ? 'h-[320px] md:h-[420px] lg:h-[490px]'
      : 'h-[250px] md:h-[320px] lg:h-[370px]';

  return (
    <div className={`min-h-screen flex flex-col font-serif rounded-none ${palette.pageBg}`}>
      <div className="h-2 w-full bg-gradient-to-r from-[#7D1818] via-[#C58C00] to-[#7D1818]" />

      {/* Customer-Facing Luxury Gallery Header */}
      <header className={`border-b px-4 md:px-8 py-3.5 sticky top-0 z-30 shadow-sm ${palette.headerBg}`}>
        <div className="max-w-[1750px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/binhminh_logo.png"
              alt="Bình Minh Art Gallery"
              className="h-12 object-contain"
            />
            <div className="border-l border-[#C58C00] pl-4">
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-base md:text-lg font-bold tracking-wider uppercase text-[#7D1818]">
                  Bình Minh Art Gallery
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-sans font-bold uppercase tracking-widest bg-[#C58C00] text-white rounded-none">
                  Không Gian Triển Lãm
                </span>
              </div>
              <p className="font-sans text-[11.5px] opacity-75">
                29A Ngô Thời Nhiệm, Phường 6, Quận 3, TP.HCM • ĐT: 0916554329 - 02836361808
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 font-sans">
            <div className="flex items-center border border-[#C58C00]">
              {[
                { id: 'cream', label: 'Nền Kem' },
                { id: 'dark', label: 'Nền Đen Sơn Mài' },
                { id: 'white', label: 'Nền Trắng' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`h-[36px] px-3 text-[11.5px] font-semibold transition-colors rounded-none ${
                    theme === t.id ? 'bg-[#C58C00] text-white' : 'hover:bg-[#C58C00]/15'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handlePrintCatalogue}
              className="h-[36px] px-4 bg-[#7D1818] hover:bg-[#5E1010] text-white text-[12px] font-bold flex items-center gap-2 rounded-none shadow-xs"
            >
              <Printer className="w-4 h-4 text-[#F4E5B8]" />
              <span>In / Xuất PDF Bảng Giá</span>
            </button>

            {/* Dropdown Chế Độ Xem (Thay thế hoặc đi kèm nút Quản Trị Kho) */}
            <div className="relative" ref={viewDropdownRef}>
              <button
                type="button"
                onClick={() => setViewDropdownOpen(prev => !prev)}
                className="h-[36px] px-3.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-[11.5px] font-bold flex items-center gap-2 rounded-none shadow-xs cursor-pointer"
                title="Chuyển chế độ xem"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C58C00]" />
                <span>Triển Lãm Cho Khách</span>
                <ChevronDown className={`w-3.5 h-3.5 text-stone-500 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu Popup */}
              {viewDropdownOpen && (
                <div className="absolute right-0 top-[40px] w-[270px] bg-white border border-[#DFCBAA] rounded-none shadow-xl z-50 overflow-hidden divide-y divide-stone-100 animate-in fade-in-50">
                  <div className="p-2 bg-[#FAF8F5] text-[10.5px] font-bold uppercase tracking-wider text-[#7D1818]">
                    Chọn Chế Độ Xem Hệ Thống
                  </div>
                  <div className="p-1 space-y-0.5">
                    {viewOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = opt.id === 'guest';
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setViewDropdownOpen(false);
                            if (opt.id === 'guest') return;
                            if (onChangeView) {
                              onChangeView(opt.id);
                            } else if (onExitGuestMode) {
                              onExitGuestMode();
                            }
                          }}
                          className={`w-full p-2 text-left rounded-none flex items-start gap-2.5 transition-colors cursor-pointer ${
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

            {onExitGuestMode && (
              <button
                type="button"
                onClick={onExitGuestMode}
                title="Quay về màn hình Quản lý kho nội bộ"
                className="h-[36px] px-3 border border-stone-400/60 hover:bg-stone-500/10 text-[11.5px] font-semibold flex items-center gap-1.5 rounded-none cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#C58C00]" />
                <span>Quản Trị Kho</span>
              </button>
            )}
          </div>
        </div>

        {/* PROMINENT ARTIST TABS BAR (Tablet-First Multi-Artist Navigation) */}
        <div className="max-w-[1750px] mx-auto mt-3 pt-2.5 border-t border-[#DFCBAA]/60 flex items-center gap-2 overflow-x-auto font-sans">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7D1818] flex items-center gap-1 shrink-0 mr-1">
            <Users className="w-3.5 h-3.5 text-[#C58C00]" />
            <span>Họa Sĩ:</span>
          </span>

          <button
            type="button"
            onClick={() => {
              setSelectedArtist('all');
              setCurrentPage(1);
            }}
            className={`h-[34px] px-3.5 text-[12px] font-bold shrink-0 border transition-colors rounded-none ${
              selectedArtist === 'all'
                ? 'bg-[#7D1818] text-[#FAF7F0] border-[#7D1818]'
                : 'border-[#C58C00]/60 hover:bg-[#7D1818]/10'
            }`}
          >
            Tất Cả Họa Sĩ ({artistStats.reduce((s, a) => s + a.count, 0)})
          </button>

          {artistStats.map(artist => (
            <button
              key={artist.name}
              type="button"
              onClick={() => {
                setSelectedArtist(artist.name);
                setCurrentPage(1);
              }}
              className={`h-[34px] px-3.5 text-[12px] font-bold shrink-0 border transition-colors rounded-none ${
                selectedArtist === artist.name
                  ? 'bg-[#7D1818] text-[#FAF7F0] border-[#7D1818]'
                  : 'border-[#C58C00]/60 hover:bg-[#7D1818]/10'
              }`}
            >
              HS. {artist.name} ({artist.count})
            </button>
          ))}
        </div>

        {/* Secondary Filter Bar: Medium, Availability, Search & Columns */}
        <div className="max-w-[1750px] mx-auto mt-2.5 pt-2 border-t border-[#DFCBAA]/40 flex flex-wrap items-center justify-between gap-3 font-sans">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center border border-[#C58C00]/60">
              {[
                { id: 'all', label: 'Tất Cả Chất Liệu' },
                { id: 'Sơn mài', label: 'Tranh Sơn Mài' },
                { id: 'Sơn dầu', label: 'Tranh Sơn Dầu' },
                { id: 'Lụa', label: 'Tranh Lụa' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedMedium(m.id);
                    setCurrentPage(1);
                  }}
                  className={`h-[32px] px-3 text-[11.5px] font-semibold transition-colors rounded-none ${
                    selectedMedium === m.id
                      ? 'bg-[#252016] text-[#F4E5B8]'
                      : 'hover:bg-[#7D1818]/10'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <select
              value={availabilityFilter}
              onChange={e => {
                setAvailabilityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-[32px] px-3 text-[11.5px] font-semibold border border-[#C58C00]/60 bg-transparent rounded-none"
            >
              <option value="chua_ban">
                Đang trưng bày ({paintings.filter(p => p.tinh_trang !== 'da_ban').length})
              </option>
              <option value="all">Toàn bộ bộ sưu tập ({paintings.length})</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-[210px] md:w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm tên tác phẩm, kích thước..."
                className="w-full h-[32px] pl-8 pr-6 text-[12px] border border-[#C58C00]/60 bg-transparent focus:outline-none rounded-none"
              />
            </div>

            <div className="flex items-center border border-[#C58C00]/60">
              <button
                type="button"
                onClick={() => setGridCols(1)}
                className={`h-[32px] px-2.5 text-[11.5px] font-semibold flex items-center gap-1 rounded-none ${
                  gridCols === 1 ? 'bg-[#252016] text-[#F4E5B8]' : ''
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>1 Cột Cực Đại</span>
              </button>
              <button
                type="button"
                onClick={() => setGridCols(2)}
                className={`h-[32px] px-2.5 text-[11.5px] font-semibold flex items-center gap-1 border-l border-[#C58C00]/60 rounded-none ${
                  gridCols === 2 ? 'bg-[#252016] text-[#F4E5B8]' : ''
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>2 Cột Lớn</span>
              </button>
              <button
                type="button"
                onClick={() => setGridCols(3)}
                className={`h-[32px] px-2.5 text-[11.5px] font-semibold flex items-center gap-1 border-l border-[#C58C00]/60 rounded-none ${
                  gridCols === 3 ? 'bg-[#252016] text-[#F4E5B8]' : ''
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>3 Cột Bảng Word</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPrice(!showPrice)}
              className="h-[32px] px-2.5 text-[11.5px] font-semibold border border-[#C58C00]/60 flex items-center gap-1 rounded-none"
            >
              {showPrice ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showPrice ? 'Hiện Giá' : 'Ẩn Giá'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN EXHIBITION HALL: DEDICATED SECTION BLOCK PER ARTIST */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-3 md:px-8 py-6 space-y-8">
        {artistSections.length === 0 ? (
          <div className={`border p-16 text-center text-base opacity-70 rounded-none ${palette.sheetBg}`}>
            Không tìm thấy tác phẩm nào phù hợp với bộ lọc đang chọn.
          </div>
        ) : (
          artistSections.map(section => (
            <div
              key={section.artistName}
              className={`border p-4 md:p-8 shadow-md rounded-none ${palette.sheetBg}`}
            >
              {/* Artist-Specific Exhibition Title Block (Matches BẢNG GIÁ.docx Header) */}
              <div className="text-center pb-6 mb-6 border-b-2 border-[#7D1818]">
                <div className="inline-flex items-center gap-2 text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-[#C58C00] mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>BỘ SƯU TẬP TÁC PHẨM CHỌN LỌC</span>
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold uppercase tracking-wide">
                  BẢNG GIÁ TRANH CỦA HS. {section.artistName.toUpperCase()}
                </h2>
                <p className="font-serif text-base md:text-lg font-bold mt-1 opacity-80">
                  (01/2026) — Hiển thị {section.totalForArtist} tác phẩm
                </p>
              </div>

              {/* Artist's Dedicated Table Grid */}
              <table className="w-full border-collapse table-fixed rounded-none">
                {section.rows.map((rowItems, rIdx) => (
                  <tbody key={rIdx} className="break-inside-avoid">
                    <tr>
                      {rowItems.map((painting, cIdx) => {
                        if (!painting) {
                          return <td key={`empty-img-${cIdx}`} className="p-2" />;
                        }
                        const fullImg =
                          (painting.hinh_anh && painting.hinh_anh[0]) ||
                          painting.thumbnail_url;
                        const isSold = painting.tinh_trang === 'da_ban';

                        return (
                          <td
                            key={`img-${painting.id}`}
                            className={`border border-b-0 p-3 md:p-5 align-middle text-center relative group rounded-none ${palette.imgCell}`}
                          >
                            {isSold && (
                              <div className="absolute top-3 right-3 z-10 px-3 py-1 bg-[#7D1818] text-white font-sans text-[10.5px] font-bold uppercase tracking-widest rounded-none shadow-xs">
                                ĐÃ THUỘC SƯU TẬP
                              </div>
                            )}

                            <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <span className="px-2.5 py-1 bg-black/75 text-[#F4E5B8] font-sans text-[11px] font-semibold flex items-center gap-1.5 rounded-none">
                                <Maximize2 className="w-3.5 h-3.5" />
                                Chạm để ngắm cận cảnh HD
                              </span>
                            </div>

                            <div
                              onClick={() => setSelectedArtworkModal(painting)}
                              className={`w-full ${artworkFrameHeight} flex items-center justify-center cursor-pointer overflow-hidden rounded-none`}
                            >
                              {fullImg ? (
                                <img
                                  src={fullImg}
                                  alt={painting.ten_tac_pham}
                                  className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-[1.025] shadow-lg rounded-none"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full border border-dashed border-stone-400 flex items-center justify-center text-xs opacity-50 rounded-none">
                                  Đang cập nhật hình ảnh
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    <tr>
                      {rowItems.map((painting, cIdx) => {
                        if (!painting) {
                          return <td key={`empty-cap-${cIdx}`} className="p-2" />;
                        }
                        const specsLine = [
                          painting.chat_lieu,
                          painting.kich_thuoc_tranh,
                          painting.nam_sang_tac
                        ]
                          .filter(Boolean)
                          .join(', ');

                        return (
                          <td
                            key={`cap-${painting.id}`}
                            onClick={() => setSelectedArtworkModal(painting)}
                            className={`border px-4 py-4 pb-6 text-center align-top cursor-pointer transition-colors rounded-none ${palette.captionCell}`}
                          >
                            <div className="font-serif text-lg md:text-xl font-bold tracking-tight">
                              {painting.ten_tac_pham}
                            </div>

                            <div className={`font-serif text-[14px] md:text-[15.5px] mt-1 ${palette.specsText}`}>
                              {specsLine}
                            </div>

                            {showPrice && (
                              <div className={`font-serif text-[15px] md:text-[16.5px] font-bold mt-1.5 ${palette.priceText}`}>
                                {formatGuestPrice(painting.gia)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                ))}
              </table>
            </div>
          ))
        )}
      </main>

      {/* Sticky Bottom Pagination Bar */}
      <StickyPaginationBar
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={guestPaintings.length}
        pageSizeOptions={[4, 6, 9, 12, 'all']}
        square={true}
        dark={theme === 'dark'}
        onPageChange={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        leftHint="Chạm vào tác phẩm để xem Hồ sơ chứng nhận & phóng to HD"
      />

      {/* GUEST ARTWORK CERTIFICATE & DETAIL PLAQUE MODAL */}
      {selectedArtworkModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 md:p-8 animate-in fade-in"
          onClick={() => setSelectedArtworkModal(null)}
        >
          <div
            className="bg-[#FAF7F0] text-stone-900 border-2 border-[#C58C00] max-w-5xl w-full max-h-[92vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-12 shadow-2xl rounded-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="lg:col-span-7 bg-[#1A1714] p-6 flex flex-col items-center justify-center relative min-h-[360px] md:min-h-[480px]">
              {selectedArtworkModal.hinh_anh && selectedArtworkModal.hinh_anh[0] && (
                <>
                  <img
                    src={selectedArtworkModal.hinh_anh[0]}
                    alt={selectedArtworkModal.ten_tac_pham}
                    onClick={() =>
                      onOpenLightbox(
                        selectedArtworkModal.hinh_anh[0],
                        selectedArtworkModal.ten_tac_pham,
                        `${selectedArtworkModal.tac_gia} — ${selectedArtworkModal.chat_lieu}, ${selectedArtworkModal.kich_thuoc_tranh}`
                      )
                    }
                    className="max-h-[440px] w-auto object-contain cursor-zoom-in shadow-2xl rounded-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onOpenLightbox(
                        selectedArtworkModal.hinh_anh[0],
                        selectedArtworkModal.ten_tac_pham,
                        `${selectedArtworkModal.tac_gia} — ${selectedArtworkModal.chat_lieu}, ${selectedArtworkModal.kich_thuoc_tranh}`
                      )
                    }
                    className="mt-4 h-[36px] px-4 bg-[#C58C00] hover:bg-[#A97500] text-white font-sans text-[12px] font-bold flex items-center gap-2 rounded-none"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Phóng To Soi Chi Tiết Bề Mặt Tranh (Zoom 300%)</span>
                  </button>
                </>
              )}
            </div>

            <div className="lg:col-span-5 p-6 md:p-8 flex flex-col justify-between bg-[#FAF7F0]">
              <div>
                <div className="flex items-center justify-between border-b border-[#DFCBAA] pb-3 mb-4">
                  <span className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#7D1818]">
                    HỒ SƠ TÁC PHẨM NGHỆ THUẬT
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedArtworkModal(null)}
                    className="p-1 text-stone-500 hover:text-stone-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="font-serif text-2xl md:text-3xl font-bold text-stone-900">
                  {selectedArtworkModal.ten_tac_pham}
                </h3>
                <p className="font-serif text-base text-[#7D1818] font-bold mt-1">
                  Họa sĩ: {selectedArtworkModal.tac_gia}
                </p>

                <div className="mt-5 space-y-2.5 font-sans text-[13px] border-t border-b border-[#DFCBAA] py-4">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Mã định danh:</span>
                    <span className="font-mono font-semibold">{selectedArtworkModal.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Chất liệu:</span>
                    <span className="font-semibold">{selectedArtworkModal.chat_lieu}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Kích thước lòng tranh:</span>
                    <span className="font-semibold">{selectedArtworkModal.kich_thuoc_tranh || '—'}</span>
                  </div>
                  {selectedArtworkModal.kich_thuoc_khung_tranh && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Kích thước cả khung:</span>
                      <span className="font-semibold">{selectedArtworkModal.kich_thuoc_khung_tranh}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-500">Năm sáng tác:</span>
                    <span className="font-semibold">{selectedArtworkModal.nam_sang_tac || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Giấy chứng nhận tác quyền:</span>
                    <span className="font-semibold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {selectedArtworkModal.giay_chung_nhan === 'Yes'
                        ? 'Bản gốc có Giấy Chứng Nhận Gallery'
                        : 'Có sẵn tại phòng tranh'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Tình trạng trưng bày:</span>
                    <span className="font-bold text-[#7D1818]">
                      {selectedArtworkModal.tinh_trang === 'da_ban'
                        ? 'Đã thuộc sưu tập cá nhân'
                        : 'Đang trưng bày tại Gallery'}
                    </span>
                  </div>
                </div>

                {showPrice && (
                  <div className="mt-5 p-4 bg-white border border-[#C58C00] text-center">
                    <div className="font-sans text-[11px] uppercase tracking-wider text-stone-500">
                      Giá Niêm Yết Tại Phòng Tranh
                    </div>
                    <div className="font-serif text-2xl font-bold text-[#7D1818] mt-0.5">
                      {formatGuestPrice(selectedArtworkModal.gia)}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#DFCBAA] font-sans text-[11.5px] text-stone-600 flex items-center justify-between">
                <span>Bình Minh Art Gallery • 29A Ngô Thời Nhiệm, Q.3</span>
                <button
                  type="button"
                  onClick={() => setSelectedArtworkModal(null)}
                  className="h-[34px] px-4 bg-stone-900 text-white font-semibold rounded-none"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
