import React, { useState, useEffect, useMemo } from 'react';
import { 
  GripVertical, ArrowUpDown, ArrowUp, ArrowDown, 
  ExternalLink, Edit, Image as ImageIcon, QrCode, Eye, CheckCircle2, RotateCcw
} from 'lucide-react';
import { formatUSD, formatDateVN, SOLD_COLUMNS } from '../types';
import StickyPaginationBar from './StickyPaginationBar';

export default function ExcelGrid({
  columns = [],
  paintings = [],
  inventorySubTab = 'chua_ban',
  highlightedPaintingId = null,
  selectedPaintingIds = new Set(),
  onToggleSelectPainting,
  onSelectAllPaintings,
  onReorderColumns,
  onOpenDetail,
  onOpenArtworkPage,
  onOpenLightbox,
  onStatusChangeToSold,
  onRevertToStock
}) {
  const safeCols = Array.isArray(columns) ? columns : [];
  const safePaintings = Array.isArray(paintings) ? paintings : [];

  // Dragging state
  const [draggedColId, setDraggedColId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);
  const [dragOverPos, setDragOverPos] = useState(null); // 'left' | 'right'

  // Sorting state: { field, direction: 'asc' | 'desc' }
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [safePaintings.length, inventorySubTab]);

  // Filter visible columns based on active sub-tab ('chua_ban' vs 'da_ban')
  // Ensure 'actions' column is always placed at the end of visibleColumns so sticky right works properly
  const visibleColumns = useMemo(() => {
    let baseCols;
    const visMap = Object.fromEntries(safeCols.map(c => [c.id, c.visible !== false]));

    if (inventorySubTab === 'da_ban') {
      const hasSoldColumns = safeCols.some(c => c.id === 'ngay_ban' || c.id === 'hoa_don');
      if (hasSoldColumns) {
        baseCols = safeCols.filter(col => col.visible !== false);
      } else {
        baseCols = SOLD_COLUMNS.filter(col => {
          if (visMap[col.id] !== undefined) {
            return visMap[col.id];
          }
          return col.visible !== false;
        });
      }
    } else {
      const soldOnlyIds = new Set(['khach_hang', 'ngay_ban', 'hoa_don', 'tinh_trang']);
      baseCols = safeCols.filter(col => col.visible !== false && !soldOnlyIds.has(col.id));
    }

    const nonActionCols = baseCols.filter(c => c.id !== 'actions');
    const actionCol = baseCols.find(c => c.id === 'actions') || {
      id: 'actions',
      label: 'Thao Tác',
      width: 120,
      minWidth: 110,
      isEditable: false,
      type: 'action',
      description: 'Nút Cập nhật, Chi tiết & Đã bán',
      visible: true
    };
    return [...nonActionCols, actionCol];
  }, [safeCols, inventorySubTab]);

  // Drag & drop handlers
  const handleDragStart = (e, colId) => {
    setDraggedColId(colId);
    e.dataTransfer.setData('text/plain', colId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === colId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const pos = e.clientX < midX ? 'left' : 'right';

    setDragOverColId(colId);
    setDragOverPos(pos);
  };

  const handleDragLeave = () => {
    setDragOverColId(null);
    setDragOverPos(null);
  };

  const handleDrop = (e, targetColId) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      setDragOverPos(null);
      return;
    }

    const currentOrder = [...columns];
    const fromIdx = currentOrder.findIndex(c => c.id === draggedColId);
    const toIdx = currentOrder.findIndex(c => c.id === targetColId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const [movedCol] = currentOrder.splice(fromIdx, 1);
      const insertIdx = dragOverPos === 'right' ? toIdx + 1 : toIdx;
      currentOrder.splice(insertIdx > fromIdx ? insertIdx - 1 : insertIdx, 0, movedCol);
      onReorderColumns(currentOrder);
    }

    setDraggedColId(null);
    setDragOverColId(null);
    setDragOverPos(null);
  };

  // Sorting handler
  const handleSort = (field) => {
    if (field === 'actions' || field === 'hinh_anh' || field === 'qr_code') return;

    setSortConfig(prev => {
      if (prev.field === field) {
        if (prev.direction === 'asc') return { field, direction: 'desc' };
        return { field: null, direction: 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  // Process sorted items
  const sortedPaintings = useMemo(() => {
    if (!sortConfig.field) return safePaintings;

    return [...safePaintings].sort((a, b) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;

      let aVal = a[sortConfig.field];
      let bVal = b[sortConfig.field];

      if (sortConfig.field === 'gia') {
        aVal = typeof aVal === 'number' ? aVal : -1;
        bVal = typeof bVal === 'number' ? bVal : -1;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [safePaintings, sortConfig]);

  const paginatedPaintings = useMemo(() => {
    if (pageSize === 'all') return sortedPaintings;
    const size = Number(pageSize) || 10;
    const start = (currentPage - 1) * size;
    return sortedPaintings.slice(start, start + size);
  }, [sortedPaintings, currentPage, pageSize]);

  return (
    <div className="bg-white border border-[#EAE5D9] rounded-lg shadow-sm flex flex-col relative w-full min-w-0 max-w-full">
      {/* Scrollable table container */}
      <div className="overflow-x-auto min-h-[380px] overscroll-x-contain w-full max-w-full">
        <table className="w-full text-left border-collapse select-none">
          {/* Table Header */}
          <thead className="bg-[#F5F2EB] sticky top-0 z-20 shadow-sm border-b border-[#EAE5D9]">
            <tr>
              {/* Checkbox Column for multi-select tag printing */}
              {onToggleSelectPainting && (
                <th className="w-10 px-2 py-2 text-center border-r border-[#EAE5D9] bg-[#F5F2EB] sticky left-0 z-30">
                  <input
                    type="checkbox"
                    checked={paginatedPaintings.length > 0 && paginatedPaintings.every(p => selectedPaintingIds.has(p.id))}
                    onChange={() => onSelectAllPaintings && onSelectAllPaintings(paginatedPaintings.map(p => p.id))}
                    className="w-4 h-4 rounded text-[#7D1818] border-stone-300 focus:ring-0 cursor-pointer"
                    title="Chọn tất cả tranh trên trang hiện tại để in tag"
                  />
                </th>
              )}

              {visibleColumns.map((col, index) => {
                const isDragging = draggedColId === col.id;
                const isOver = dragOverColId === col.id;
                const isSorted = sortConfig.field === col.id;

                let borderHighlight = '';
                if (isOver && dragOverPos === 'left') {
                  borderHighlight = 'border-l-2 border-l-[#C5A059]';
                } else if (isOver && dragOverPos === 'right') {
                  borderHighlight = 'border-r-2 border-r-[#C5A059]';
                }

                const isStickyAction = col.id === 'actions';
                return (
                  <th
                    key={col.id}
                    draggable={!isStickyAction}
                    onDragStart={(e) => !isStickyAction && handleDragStart(e, col.id)}
                    onDragOver={(e) => !isStickyAction && handleDragOver(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => !isStickyAction && handleDrop(e, col.id)}
                    style={{ width: `${col.width || (isStickyAction ? 120 : 110)}px`, minWidth: `${col.minWidth || (isStickyAction ? 110 : 95)}px` }}
                    className={`py-2 px-2 text-[11px] font-semibold text-stone-700 tracking-wider uppercase border-r border-[#EAE5D9] relative transition-colors ${
                      isStickyAction
                        ? 'sticky top-0 right-0 z-30 bg-[#F5EFE6] border-l border-[#EAE5D9] shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)] bg-clip-padding'
                        : isDragging
                        ? 'opacity-40 bg-[#EAE5D9] cursor-grab active:cursor-grabbing'
                        : 'hover:bg-[#EAE5D9]/60 cursor-grab active:cursor-grabbing'
                    } ${borderHighlight}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div 
                        className="flex items-center gap-1 truncate flex-1"
                        onClick={() => handleSort(col.id)}
                      >
                        {!isStickyAction && (
                          <GripVertical className="w-3 h-3 text-stone-400 shrink-0 opacity-40 hover:opacity-100" />
                        )}
                        <span className="truncate">{col.label}</span>
                      </div>

                      {/* Sort Indicator */}
                      {col.id !== 'actions' && col.id !== 'hinh_anh' && col.id !== 'qr_code' && (
                        <button
                          type="button"
                          onClick={() => handleSort(col.id)}
                          className="p-0.5 text-stone-400 hover:text-stone-800 rounded cursor-pointer"
                        >
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-stone-800" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-stone-800" />
                            )
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#EAE5D9] text-[11.5px] font-sans">
            {paginatedPaintings.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (onToggleSelectPainting ? 1 : 0)} className="text-center py-12 text-stone-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <ImageIcon className="w-8 h-8 text-stone-400 opacity-60" />
                    <span className="font-medium text-[12px]">Không tìm thấy tác phẩm nào phù hợp</span>
                    <span className="text-[11px] text-stone-400">Hãy thử xóa bộ lọc tìm kiếm</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedPaintings.map((painting, rowIdx) => {
                const isSold = painting.tinh_trang === 'da_ban';
                const isSelected = selectedPaintingIds.has(painting.id);
                const isHighlighted = highlightedPaintingId && String(highlightedPaintingId).toLowerCase() === String(painting.id).toLowerCase();

                return (
                  <tr 
                    key={painting.id}
                    id={`row-${painting.id}`}
                    className={`transition-all duration-300 group hover:bg-[#FAF8F5] ${
                      isHighlighted
                        ? 'bg-[#F4E5B8]/60 ring-2 ring-[#C5A059] shadow-md z-10 relative'
                        : isSelected
                        ? 'bg-amber-100/50'
                        : isSold
                        ? 'bg-amber-50/20'
                        : rowIdx % 2 === 1
                        ? 'bg-stone-50/40'
                        : 'bg-white'
                    }`}
                  >
                    {/* Row Select Checkbox */}
                    {onToggleSelectPainting && (
                      <td className="w-10 px-2 py-1.5 text-center border-r border-[#EAE5D9] sticky left-0 z-10 bg-inherit">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelectPainting(painting.id)}
                          className="w-4 h-4 rounded text-[#7D1818] border-stone-300 focus:ring-0 cursor-pointer"
                        />
                      </td>
                    )}

                    {visibleColumns.map((col) => {
                      const rawVal = painting[col.id];

                      // 1. Column Image
                      if (col.id === 'hinh_anh') {
                        const thumb = painting.thumbnail_url || (painting.hinh_anh && painting.hinh_anh[0]);
                        const fullImg = painting.hinh_anh && painting.hinh_anh[0];

                        return (
                          <td key={col.id} className="py-1.5 px-2 border-r border-[#EAE5D9] text-center w-[76px]">
                            {thumb ? (
                              <div 
                                onClick={() => onOpenLightbox && onOpenLightbox(fullImg, painting.ten_tac_pham, `${painting.tac_gia} — ${painting.kich_thuoc_tranh}`)}
                                className="w-12 h-12 rounded border border-[#EAE5D9] overflow-hidden mx-auto bg-stone-100 cursor-pointer hover:border-stone-800 hover:scale-105 transition-all shadow-xs relative group/img"
                              >
                                <img 
                                  src={thumb} 
                                  alt={painting.ten_tac_pham} 
                                  className="w-full h-full object-cover" 
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <ExternalLink className="w-3 h-3" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded border border-dashed border-stone-300 mx-auto flex items-center justify-center text-stone-400 text-[9px]">
                                No img
                              </div>
                            )}
                          </td>
                        );
                      }

                      // 1b. Column QR Code (Generated from Mã Tranh)
                      if (col.id === 'qr_code') {
                        const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:5001';
                        const qrUrl = `/api/qr/${encodeURIComponent(painting.id)}?origin=${encodeURIComponent(originUrl)}`;
                        return (
                          <td key={col.id} className="py-1 px-2 border-r border-[#EAE5D9] text-center">
                            <button
                              type="button"
                              onClick={() => onOpenArtworkPage && onOpenArtworkPage(painting.id)}
                              title={`Quét hoặc nhấn để mở Trang Chi Tiết Tác Phẩm: ${painting.id}`}
                              className="w-11 h-11 p-0.5 bg-white border border-stone-300 hover:border-[#C5A059] mx-auto flex items-center justify-center transition-all hover:scale-105 shadow-2xs group/qr cursor-pointer"
                            >
                              <img
                                src={qrUrl}
                                alt={`QR ${painting.id}`}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            </button>
                          </td>
                        );
                      }

                      // 2. Column Actions (Sticky Right, chứa nút "Cập nhật", "Chi tiết", "Đã bán")
                      if (col.id === 'actions') {
                        const stickyBgClass = isSold
                          ? 'bg-[#FFFDF8] group-hover:bg-[#FAF5E8]'
                          : rowIdx % 2 === 1
                          ? 'bg-[#FBF9F5] group-hover:bg-[#FAF8F5]'
                          : 'bg-white group-hover:bg-[#FAF8F5]';

                        return (
                          <td
                            key={col.id}
                            style={{ width: `${col.width || 120}px`, minWidth: `${col.minWidth || 110}px` }}
                            className={`py-1 px-1.5 border-l border-[#EAE5D9] text-center sticky right-0 z-10 ${stickyBgClass} shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)] bg-clip-padding`}
                          >
                            <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                              {/* Nút Cập nhật (Edit icon button 28x28px) */}
                              <button
                                type="button"
                                onClick={() => onOpenDetail && onOpenDetail(painting)}
                                data-testid={`inventory__action-edit--btn-${painting.id}`}
                                title="Cập nhật hồ sơ & vị trí tác phẩm"
                                aria-label="Cập nhật hồ sơ & vị trí tác phẩm"
                                className="w-7 h-7 bg-[#7D1818] hover:bg-[#691212] text-white rounded flex items-center justify-center transition-transform hover:scale-105 shadow-2xs cursor-pointer shrink-0"
                              >
                                <Edit className="w-3.5 h-3.5 text-[#F4E5B8]" />
                              </button>

                              {/* Nút Chi tiết (Eye icon button 28x28px) */}
                              {onOpenArtworkPage && (
                                <button
                                  type="button"
                                  onClick={() => onOpenArtworkPage(painting.id)}
                                  data-testid={`inventory__action-detail--btn-${painting.id}`}
                                  title="Mở Trang Chi Tiết Tác Phẩm"
                                  aria-label="Mở Trang Chi Tiết Tác Phẩm"
                                  className="w-7 h-7 bg-[#252016] hover:bg-stone-800 text-[#FAF8F5] rounded flex items-center justify-center transition-transform hover:scale-105 shadow-2xs cursor-pointer shrink-0"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
                                </button>
                              )}

                              {/* Nút Đã bán / Hoàn kho (icon button 28x28px) */}
                              {!isSold ? (
                                <button
                                  type="button"
                                  onClick={() => onStatusChangeToSold && onStatusChangeToSold(painting)}
                                  data-testid={`inventory__action-sold--btn-${painting.id}`}
                                  title="Đánh dấu tác phẩm đã bán"
                                  aria-label="Đánh dấu tác phẩm đã bán"
                                  className="w-7 h-7 bg-[#F4E5B8] hover:bg-[#e5cf8e] text-[#1C1917] border border-[#C58C00] rounded flex items-center justify-center transition-transform hover:scale-105 shadow-2xs cursor-pointer shrink-0"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#7D1818]" />
                                </button>
                              ) : (
                                onRevertToStock && (
                                  <button
                                    type="button"
                                    onClick={() => onRevertToStock(painting)}
                                    data-testid={`inventory__action-revert--btn-${painting.id}`}
                                    title="Hoàn tác đưa tác phẩm trở lại Kho Chưa Bán"
                                    aria-label="Hoàn tác đưa tác phẩm trở lại Kho Chưa Bán"
                                    className="w-7 h-7 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shrink-0"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-amber-800" />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        );
                      }

                      // 3. Status column (Read-only badge)
                      if (col.id === 'tinh_trang') {
                        return (
                          <td
                            key={col.id}
                            className="py-1.5 px-2.5 border-r border-[#EAE5D9]"
                          >
                            <span 
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold border ${
                                isSold 
                                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {isSold ? 'Đã bán' : 'Chưa bán'}
                            </span>
                          </td>
                        );
                      }

                      // 4. Price Column (Read-only)
                      if (col.id === 'gia' || col.type === 'price') {
                        return (
                          <td
                            key={col.id}
                            className="py-1.5 px-2.5 border-r border-[#EAE5D9]"
                          >
                            {rawVal !== null && rawVal !== undefined && rawVal !== '' ? (
                              <span className="font-mono font-semibold text-stone-900">
                                {formatUSD(rawVal)}
                              </span>
                            ) : (
                              <span className="text-stone-400 italic text-[11px]">
                                Đang cập nhật
                              </span>
                            )}
                          </td>
                        );
                      }

                      // 4b. Tag Print Status Column (In Tag)
                      if (col.id === 'da_in_tag' || col.type === 'tag_status') {
                        const isPrinted = Boolean(painting.da_in_tag);
                        return (
                          <td
                            key={col.id}
                            className="py-1.5 px-2.5 border-r border-[#EAE5D9] text-center"
                          >
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isPrinted
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              {isPrinted ? 'Đã in tag' : 'Chưa in'}
                            </span>
                          </td>
                        );
                      }

                      // 5. Regular Display Cell (Zero Fallback Data: show "Đang cập nhật" if empty)
                      const hasVal =
                        rawVal !== null &&
                        rawVal !== undefined &&
                        String(rawVal).trim() !== '' &&
                        String(rawVal).trim().toLowerCase() !== 'đang cập nhật';

                      let displayContent = hasVal ? (
                        rawVal
                      ) : (
                        <span className="italic text-stone-400 text-[10.5px]">Đang cập nhật</span>
                      );

                      if (col.type === 'date') {
                        displayContent = hasVal ? (
                          formatDateVN(rawVal)
                        ) : (
                          <span className="italic text-stone-400 text-[10.5px]">Đang cập nhật</span>
                        );
                      } else if (col.id === 'ten_tac_pham') {
                        displayContent = hasVal ? (
                          <button
                            type="button"
                            onClick={() => onOpenArtworkPage && onOpenArtworkPage(painting.id)}
                            className="font-serif text-stone-900 hover:text-[#9E7A36] font-semibold text-left hover:underline cursor-pointer"
                          >
                            {rawVal}
                          </button>
                        ) : (
                          <span className="italic text-stone-400 text-[10.5px]">Đang cập nhật</span>
                        );
                      } else if (col.id === 'id') {
                        displayContent = (
                          <button
                            type="button"
                            onClick={() => onOpenArtworkPage && onOpenArtworkPage(painting.id)}
                            title="Nhấn để mở Trang Chi Tiết Tác Phẩm"
                            className="font-mono text-[11px] font-bold text-[#9E7A36] hover:text-stone-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>{rawVal}</span>
                          </button>
                        );
                      } else if (col.id === 'giay_chung_nhan') {
                        displayContent = hasVal ? (
                          <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                            rawVal === 'Yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {rawVal}
                          </span>
                        ) : (
                          <span className="italic text-stone-400 text-[10.5px]">Đang cập nhật</span>
                        );
                      } else if (col.id === 'location') {
                        displayContent = hasVal ? (
                          <span className="inline-flex items-center font-semibold text-stone-800 bg-[#F4E5B8]/40 border border-[#C58C00]/30 px-2 py-0.5 rounded text-[11px]">
                            <span>{rawVal}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center font-medium text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded text-[11px]">
                            <span>Kho</span>
                          </span>
                        );
                      } else if (col.id === 'ngay_cap_nhat_san_pham') {
                        displayContent = hasVal ? (
                          <span className="inline-block font-mono text-[10.5px] font-medium text-stone-700 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded">
                            {formatDateVN(rawVal)}
                          </span>
                        ) : (
                          <span className="italic text-stone-400 text-[10.5px]">Đang cập nhật</span>
                        );
                      }

                      return (
                        <td
                          key={col.id}
                          className="py-1.5 px-2.5 border-r border-[#EAE5D9] text-stone-700 truncate max-w-[200px]"
                        >
                          {displayContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sticky Pagination & Status Footer */}
      <StickyPaginationBar
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={sortedPaintings.length}
        pageSizeOptions={[6, 10, 14, 25, 'all']}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        leftHint="💡 Bảng xem dữ liệu chuẩn mực • Kéo thả tiêu đề cột để đổi vị trí • Nhấn &quot;Cập nhật&quot; để chỉnh sửa tác phẩm"
      />
    </div>
  );
}
