import React, { useState, useMemo } from 'react';
import {
  Printer,
  Maximize2,
  Eye,
  EyeOff,
  Grid,
  Columns,
  Square,
  Edit3,
  Users,
  Search,
  ChevronDown,
  X
} from 'lucide-react';
import SmartArtistDropdown from './SmartArtistDropdown';

function formatWordPrice(gia) {
  if (gia === null || gia === undefined || gia === '') {
    return 'Giá: Thỏa thuận';
  }
  const num = Number(gia);
  if (isNaN(num)) return 'Giá: Thỏa thuận';
  return `Giá: $${num.toLocaleString('en-US')}`;
}

export default function ExhibitionView({
  paintings,
  onOpenLightbox,
  onOpenDetail
}) {
  const [gridCols, setGridCols] = useState(3); // 1 | 2 | 3
  const [showPrice, setShowPrice] = useState(true);
  const [showSoldBadge, setShowSoldBadge] = useState(true);
  const [selectedArtist, setSelectedArtist] = useState('all');
  const [backdropTheme, setBackdropTheme] = useState('cream'); // 'cream' | 'white' | 'dark'
  const [cataloguePeriod, setCataloguePeriod] = useState('01/2026');

  // Extract unique artists with counts
  const artistStats = useMemo(() => {
    const map = new Map();
    for (const p of paintings) {
      const name = (p.tac_gia || 'Dương Văn Sen').trim();
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [paintings]);

  const currentArtistObj = artistStats.find(a => a.name === selectedArtist);

  // Filter by artist if selected
  const displayedPaintings = useMemo(() => {
    if (selectedArtist === 'all') return paintings;
    return paintings.filter(p => (p.tac_gia || '').trim() === selectedArtist);
  }, [paintings, selectedArtist]);

  // Group displayed paintings into dedicated Artist Sections so each Artist gets their own Header & Table
  const artistSections = useMemo(() => {
    const groups = new Map();
    for (const p of displayedPaintings) {
      const artistName = (p.tac_gia || 'Dương Văn Sen').trim();
      if (!groups.has(artistName)) groups.set(artistName, []);
      groups.get(artistName).push(p);
    }

    return Array.from(groups.entries()).map(([artistName, items]) => {
      const rows = [];
      for (let i = 0; i < items.length; i += gridCols) {
        const slice = items.slice(i, i + gridCols);
        while (slice.length < gridCols) slice.push(null);
        rows.push(slice);
      }
      const totalForArtist = displayedPaintings.filter(
        dp => (dp.tac_gia || 'Dương Văn Sen').trim() === artistName
      ).length;

      return {
        artistName,
        totalForArtist,
        rows
      };
    });
  }, [displayedPaintings, gridCols]);

  // Export PDF Catalogue (Grouped cleanly by Artist Section!)
  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const origin = window.location.origin;
    const colsForPrint = gridCols === 1 ? 1 : gridCols === 2 ? 2 : 3;

    // Group ALL filtered paintings by Artist for full PDF export
    const pdfGroups = new Map();
    for (const p of displayedPaintings) {
      const artistName = (p.tac_gia || 'Dương Văn Sen').trim();
      if (!pdfGroups.has(artistName)) pdfGroups.set(artistName, []);
      pdfGroups.get(artistName).push(p);
    }

    const sectionsHtml = Array.from(pdfGroups.entries())
      .map(([artistName, items], sIdx) => {
        const pdfRows = [];
        for (let i = 0; i < items.length; i += colsForPrint) {
          const slice = items.slice(i, i + colsForPrint);
          while (slice.length < colsForPrint) slice.push(null);
          pdfRows.push(slice);
        }

        const rowsHtml = pdfRows
          .map(row => {
            const imgCells = row
              .map(p => {
                if (!p) return `<td class="img-cell empty"></td>`;
                const imgSrc = (p.hinh_anh && p.hinh_anh[0]) || p.thumbnail_url || '';
                const fullUrl = imgSrc.startsWith('http') ? imgSrc : `${origin}${imgSrc}`;
                return `
                  <td class="img-cell">
                    <div class="img-frame">
                      ${imgSrc ? `<img src="${fullUrl}" alt="${p.ten_tac_pham || ''}" />` : ''}
                    </div>
                  </td>
                `;
              })
              .join('');

            const metaCells = row
              .map(p => {
                if (!p) return `<td class="meta-cell empty"></td>`;
                const line2 = [p.chat_lieu, p.kich_thuoc_tranh, p.nam_sang_tac]
                  .filter(Boolean)
                  .join(', ');
                const priceLine =
                  p.gia !== null && p.gia !== undefined && p.gia !== ''
                    ? `Giá: $${Number(p.gia).toLocaleString('en-US')}`
                    : 'Giá:';
                const soldTag =
                  showSoldBadge && p.tinh_trang === 'da_ban'
                    ? `<div class="sold-tag">ĐÃ BÁN ${p.khach_hang ? `— ${p.khach_hang}` : ''}</div>`
                    : '';
                return `
                  <td class="meta-cell">
                    <div class="title">${p.ten_tac_pham || ''}</div>
                    <div class="sub">${line2}</div>
                    ${showPrice ? `<div class="price">${priceLine}</div>` : ''}
                    ${soldTag}
                  </td>
                `;
              })
              .join('');

            return `
              <tbody class="artwork-row-group">
                <tr class="img-row">${imgCells}</tr>
                <tr class="meta-row">${metaCells}</tr>
              </tbody>
            `;
          })
          .join('');

        return `
          <div class="artist-section ${sIdx > 0 ? 'page-break' : ''}">
            <div class="catalogue-header">
              <div class="gallery-brand">BÌNH MINH ART GALLERY — 29A Ngô Thời Nhiệm, Q.3, TP.HCM</div>
              <h1 class="main-title">BẢNG GIÁ TRANH CỦA HS. ${artistName.toUpperCase()}</h1>
              <div class="period">(${cataloguePeriod}) — ${items.length} tác phẩm</div>
            </div>
            <table class="catalogue-table">
              ${rowsHtml}
            </table>
          </div>
        `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>BẢNG GIÁ TRANH — BÌNH MINH ART GALLERY (${cataloguePeriod})</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 12mm 10mm;
          }
          * {
            box-sizing: border-box;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: "Times New Roman", Georgia, serif;
            color: #1C1917;
            background: #FFFFFF;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
            margin-top: 16px;
          }
          .catalogue-header {
            text-align: center;
            padding-bottom: 12px;
            margin-bottom: 14px;
            border-bottom: 2px solid #7D1818;
          }
          .gallery-brand {
            font-size: 11pt;
            letter-spacing: 2px;
            color: #7D1818;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .main-title {
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #111111;
            margin: 0;
          }
          .period {
            font-size: 12pt;
            font-weight: bold;
            color: #444444;
            margin-top: 2px;
          }
          table.catalogue-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          tbody.artwork-row-group {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          td.img-cell {
            width: ${100 / colsForPrint}%;
            border: 1px solid #D6CFC2;
            border-bottom: none;
            padding: 8px;
            vertical-align: middle;
            text-align: center;
            background: #FAF8F5;
            height: ${colsForPrint === 1 ? '420px' : colsForPrint === 2 ? '270px' : '210px'};
          }
          td.img-cell.empty, td.meta-cell.empty {
            border: none;
            background: transparent;
          }
          .img-frame {
            width: 100%;
            height: ${colsForPrint === 1 ? '400px' : colsForPrint === 2 ? '250px' : '195px'};
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .img-frame img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
            margin: 0 auto;
          }
          td.meta-cell {
            border: 1px solid #D6CFC2;
            border-top: 1px solid #EAE5D9;
            padding: 8px 6px 14px 6px;
            text-align: center;
            vertical-align: top;
            background: #FFFFFF;
          }
          .title {
            font-size: 12pt;
            font-weight: bold;
            color: #111111;
            margin-bottom: 3px;
          }
          .sub {
            font-size: 10.5pt;
            color: #333333;
            margin-bottom: 3px;
          }
          .price {
            font-size: 11pt;
            font-weight: bold;
            color: #7D1818;
          }
          .sold-tag {
            display: inline-block;
            margin-top: 4px;
            padding: 1px 6px;
            font-size: 8.5pt;
            font-weight: bold;
            background: #7D1818;
            color: #FFFFFF;
          }
        </style>
      </head>
      <body>
        ${sectionsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const themeStyles = {
    cream: {
      wrapper: 'bg-[#FAF7F0] text-stone-900 border-[#DFCBAA]',
      imgCell: 'bg-[#F4EFE4] border-[#D6C7B2]',
      metaCell: 'bg-white border-[#D6C7B2] text-stone-900',
      subText: 'text-stone-700',
      priceText: 'text-[#7D1818]'
    },
    white: {
      wrapper: 'bg-white text-stone-900 border-stone-300',
      imgCell: 'bg-stone-50 border-stone-300',
      metaCell: 'bg-white border-stone-300 text-stone-900',
      subText: 'text-stone-600',
      priceText: 'text-stone-900'
    },
    dark: {
      wrapper: 'bg-[#161412] text-[#FAF7F0] border-[#3D3529]',
      imgCell: 'bg-[#1F1C18] border-[#3D3529]',
      metaCell: 'bg-[#161412] border-[#3D3529] text-[#FAF7F0]',
      subText: 'text-[#C7BCA8]',
      priceText: 'text-[#E5B84B]'
    }
  }[backdropTheme];

  const imageHeightClass =
    gridCols === 1
      ? 'h-[420px] md:h-[540px] lg:h-[620px]'
      : gridCols === 2
      ? 'h-[300px] md:h-[380px] lg:h-[440px]'
      : 'h-[240px] md:h-[300px] lg:h-[340px]';

  return (
    <div className="space-y-3 pb-4">
      {/* Exhibition Control Bar: Single Combined High-Density Row */}
      <div className="bg-white border border-[#DFCBAA] p-2 shadow-xs rounded-none">
        <div className="flex flex-nowrap items-center justify-between gap-2 overflow-x-auto">
          {/* Left Group: Dropdown Họa Sĩ tìm kiếm + Kỳ Bảng Giá + Nền */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Smart Artist Filter Dropdown (Portal-based, immune to horizontal clipping) */}
            <SmartArtistDropdown
              selectedArtist={selectedArtist}
              onSelectArtist={setSelectedArtist}
              artists={artistStats}
              allCount={paintings.length}
              allOptionLabel="Tất Cả Họa Sĩ"
              className="shrink-0"
              dropdownWidth={280}
            />

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] font-semibold text-stone-600 whitespace-nowrap">Kỳ:</span>
              <input
                type="text"
                value={cataloguePeriod}
                onChange={(e) => setCataloguePeriod(e.target.value)}
                className="h-[32px] w-[75px] px-1.5 text-[11.5px] font-semibold text-center bg-[#FAF7F0] border border-[#DFCBAA] focus:outline-none rounded-none"
                placeholder="01/2026"
              />
            </div>

            <div className="flex items-center border border-[#DFCBAA] bg-[#FAF7F0] shrink-0">
              {[
                { id: 'cream', label: 'Nền Kem' },
                { id: 'white', label: 'Trắng' },
                { id: 'dark', label: 'Đen' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBackdropTheme(t.id)}
                  className={`h-[32px] px-2 text-[10.5px] font-semibold transition-colors rounded-none whitespace-nowrap ${
                    backdropTheme === t.id
                      ? 'bg-[#252016] text-[#F4E5B8]'
                      : 'text-stone-700 hover:bg-stone-200/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Group: Layout Cột + Hiện/Ẩn Giá + Nút Xuất PDF */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center border border-[#DFCBAA] bg-[#FAF7F0] shrink-0">
              <button
                type="button"
                onClick={() => setGridCols(1)}
                className={`h-[32px] px-2 text-[11px] font-semibold flex items-center gap-1 rounded-none whitespace-nowrap ${
                  gridCols === 1 ? 'bg-[#7D1818] text-white' : 'text-stone-700 hover:bg-stone-200/50'
                }`}
              >
                <Square className="w-3 h-3" />
                <span>1 Cột</span>
              </button>
              <button
                type="button"
                onClick={() => setGridCols(2)}
                className={`h-[32px] px-2 text-[11px] font-semibold flex items-center gap-1 border-l border-[#DFCBAA] rounded-none whitespace-nowrap ${
                  gridCols === 2 ? 'bg-[#7D1818] text-white' : 'text-stone-700 hover:bg-stone-200/50'
                }`}
              >
                <Columns className="w-3 h-3" />
                <span>2 Cột</span>
              </button>
              <button
                type="button"
                onClick={() => setGridCols(3)}
                className={`h-[32px] px-2 text-[11px] font-semibold flex items-center gap-1 border-l border-[#DFCBAA] rounded-none whitespace-nowrap ${
                  gridCols === 3 ? 'bg-[#7D1818] text-white' : 'text-stone-700 hover:bg-stone-200/50'
                }`}
              >
                <Grid className="w-3 h-3" />
                <span>3 Cột (Word)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPrice(!showPrice)}
              className={`h-[32px] px-2.5 text-[11px] font-semibold border flex items-center gap-1 rounded-none transition-colors shrink-0 whitespace-nowrap ${
                showPrice
                  ? 'bg-amber-50 text-amber-900 border-[#C58C00]'
                  : 'bg-stone-100 text-stone-600 border-stone-300'
              }`}
            >
              {showPrice ? <Eye className="w-3 h-3 text-[#7D1818]" /> : <EyeOff className="w-3 h-3 text-stone-500" />}
              <span>{showPrice ? 'Hiện Giá' : 'Ẩn Giá'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="h-[32px] px-3 text-[11px] font-bold text-white bg-[#7D1818] hover:bg-[#5E1010] transition-colors flex items-center gap-1.5 shadow-2xs rounded-none shrink-0 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-[#F4E5B8]" />
              <span>Xuất PDF Bảng Giá</span>
            </button>
          </div>
        </div>
      </div>

      {/* DEDICATED ARTIST CATALOGUE SECTIONS */}
      {artistSections.length === 0 ? (
        <div className={`border p-20 text-center text-stone-500 font-serif text-base rounded-none ${themeStyles.wrapper}`}>
          Không có tác phẩm nào trong danh mục triển lãm hiện tại.
        </div>
      ) : (
        <div className="space-y-6">
          {artistSections.map(section => (
            <div
              key={section.artistName}
              className={`border p-4 md:p-8 shadow-sm rounded-none ${themeStyles.wrapper}`}
            >
              {/* Artist-Specific Official Word-Style Header Banner */}
              <div className="text-center pb-6 mb-6 border-b-2 border-[#7D1818]">
                <p className="text-[11px] font-sans font-bold tracking-[0.22em] uppercase text-[#C58C00] mb-1">
                  BÌNH MINH ART GALLERY • EXHIBITION & CATALOGUE
                </p>
                <h1 className="font-serif text-xl md:text-2xl lg:text-3xl font-bold uppercase tracking-wide">
                  BẢNG GIÁ TRANH CỦA HS. {section.artistName.toUpperCase()}
                </h1>
                <p className="font-serif text-base md:text-lg font-bold mt-1 opacity-80">
                  ({cataloguePeriod}) — Hiển thị {section.totalForArtist} tác phẩm
                </p>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse table-fixed rounded-none">
                  {section.rows.map((rowItems, rIdx) => (
                    <tbody key={rIdx} className="break-inside-avoid">
                      <tr>
                        {rowItems.map((painting, cIdx) => {
                          if (!painting) {
                            return (
                              <td
                                key={`empty-img-${cIdx}`}
                                className="border border-transparent p-2"
                              />
                            );
                          }

                          const fullImg =
                            (painting.hinh_anh && painting.hinh_anh[0]) ||
                            painting.thumbnail_url;
                          const isSold = painting.tinh_trang === 'da_ban';

                          return (
                            <td
                              key={`img-${painting.id}`}
                              className={`border border-b-0 p-2 md:p-3 align-middle text-center relative group rounded-none ${themeStyles.imgCell}`}
                            >
                              {showSoldBadge && isSold && (
                                <div className="absolute top-2 right-2 z-10 px-2.5 py-1 bg-[#7D1818] text-white text-[10.5px] font-bold uppercase tracking-wider shadow-xs rounded-none">
                                  ĐÃ BÁN {painting.khach_hang ? `• ${painting.khach_hang}` : ''}
                                </div>
                              )}

                              <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                {fullImg && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onOpenLightbox(
                                        fullImg,
                                        painting.ten_tac_pham,
                                        `${painting.tac_gia} — ${painting.chat_lieu}, ${painting.kich_thuoc_tranh}, ${painting.nam_sang_tac}`
                                      )
                                    }
                                    className="h-[30px] px-2.5 bg-black/80 text-white text-[11px] font-semibold flex items-center gap-1 rounded-none hover:bg-black"
                                  >
                                    <Maximize2 className="w-3 h-3 text-[#F4E5B8]" />
                                    <span>Phóng To HD</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onOpenDetail(painting)}
                                  className="h-[30px] px-2 bg-white/95 text-stone-900 border border-stone-300 text-[11px] font-semibold flex items-center gap-1 rounded-none hover:bg-stone-100"
                                >
                                  <Edit3 className="w-3 h-3 text-[#7D1818]" />
                                  <span>Sửa</span>
                                </button>
                              </div>

                              <div
                                onClick={() =>
                                  fullImg &&
                                  onOpenLightbox(
                                    fullImg,
                                    painting.ten_tac_pham,
                                    `${painting.tac_gia} — ${painting.chat_lieu}, ${painting.kich_thuoc_tranh}, ${painting.nam_sang_tac}`
                                  )
                                }
                                className={`w-full ${imageHeightClass} flex items-center justify-center cursor-pointer overflow-hidden rounded-none`}
                              >
                                {fullImg ? (
                                  <img
                                    src={fullImg}
                                    alt={painting.ten_tac_pham}
                                    className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02] shadow-md rounded-none"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full border border-dashed border-stone-400 flex items-center justify-center text-stone-400 text-xs rounded-none">
                                    Chưa có ảnh tác phẩm
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
                            return (
                              <td
                                key={`empty-meta-${cIdx}`}
                                className="border border-transparent p-2"
                              />
                            );
                          }

                          const line2Specs = [
                            painting.chat_lieu,
                            painting.kich_thuoc_tranh,
                            painting.nam_sang_tac
                          ]
                            .filter(Boolean)
                            .join(', ');

                          return (
                            <td
                              key={`meta-${painting.id}`}
                              onClick={() => onOpenDetail(painting)}
                              className={`border px-3 py-3.5 pb-5 text-center align-top cursor-pointer transition-colors hover:bg-amber-50/20 rounded-none ${themeStyles.metaCell}`}
                            >
                              <div className="font-serif text-base md:text-lg font-bold tracking-tight leading-snug">
                                {painting.ten_tac_pham}
                              </div>

                              <div className={`font-serif text-[13.5px] md:text-[14.5px] mt-0.5 ${themeStyles.subText}`}>
                                {line2Specs}
                              </div>

                              {showPrice && (
                                <div className={`font-serif text-[14px] md:text-[15px] font-bold mt-1 ${themeStyles.priceText}`}>
                                  {formatWordPrice(painting.gia)}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
