import React, { useState, useEffect } from 'react';
import BatchTagPrintModal from './BatchTagPrintModal';
import ArtworkTagModal from './ArtworkTagModal';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Tag,
  Printer,
  Download,
  Edit,
  Maximize2,
  Search,
  Image as ImageIcon,
  CheckCircle2,
  Clock
} from 'lucide-react';

function hasRealValue(val) {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  if (!s) return false;
  const low = s.toLowerCase();
  if (low === 'đang cập nhật' || low === 'dang cap nhat' || low === '—') return false;
  return true;
}

function renderStrictValue(val, formatter = null) {
  if (!hasRealValue(val)) {
    return <span className="italic text-stone-400 font-normal text-[11px]">Đang cập nhật</span>;
  }
  if (formatter) {
    return formatter(val);
  }
  return <span className="text-stone-900 font-semibold text-[11.5px]">{String(val).trim()}</span>;
}

function formatStrictDate(val) {
  if (!hasRealValue(val)) {
    return <span className="italic text-stone-400 font-normal text-[11px]">Đang cập nhật</span>;
  }
  const datePart = String(val).trim().split(/\s+/)[0];
  if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return <span className="font-mono text-stone-900 font-semibold text-[11px]">{`${parts[2]}-${parts[1]}-${parts[0]}`}</span>;
      }
      if (parts[2].length === 2) {
        return <span className="font-mono text-stone-900 font-semibold text-[11px]">{`${parts[0]}-${parts[1]}-20${parts[2]}`}</span>;
      }
    }
  }
  return <span className="font-mono text-stone-900 font-semibold text-[11px]">{datePart}</span>;
}

function formatStrictPrice(val) {
  if (val === null || val === undefined || String(val).trim() === '') {
    return <span className="italic text-stone-400 font-normal text-[11px]">Đang cập nhật</span>;
  }
  const num = Number(val);
  if (isNaN(num)) {
    return <span className="italic text-stone-400 font-normal text-[11px]">Đang cập nhật</span>;
  }
  return (
    <span className="font-mono text-[13px] font-bold text-[#9E7A36]">
      ${num.toLocaleString('en-US')} USD
    </span>
  );
}

function formatStrictStatus(val) {
  if (!hasRealValue(val)) {
    return <span className="italic text-stone-400 font-normal text-[11px]">Đang cập nhật</span>;
  }
  const s = String(val).trim();
  if (s === 'da_ban') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10.5px] font-bold uppercase tracking-wider">
        <Clock className="w-2.5 h-2.5" />
        Đã bán
      </span>
    );
  }
  if (s === 'chua_ban') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10.5px] font-bold uppercase tracking-wider">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Chưa bán (Đang trưng bày)
      </span>
    );
  }
  return <span className="text-stone-900 font-semibold text-[11.5px]">{s}</span>;
}

export default function ArtworkDetailPage({
  painting,
  allPaintings = [],
  onBack,
  onSelectPainting,
  onOpenEditModal,
  onOpenLightbox,
  onOpenQrScanner
}) {
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [quickQuery, setQuickQuery] = useState('');
  const [quickSuggestions, setQuickSuggestions] = useState([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isTogglingTag, setIsTogglingTag] = useState(false);

  useEffect(() => {
    setSelectedImgIdx(0);
  }, [painting?.id]);

  // Quick search suggestions
  useEffect(() => {
    const q = quickQuery.trim().toLowerCase();
    if (!q) {
      setQuickSuggestions([]);
      return;
    }
    const matches = allPaintings
      .filter(p => {
        const idMatch = String(p.id || '').toLowerCase().includes(q);
        const nameMatch = String(p.ten_tac_pham || '').toLowerCase().includes(q);
        const artistMatch = String(p.tac_gia || '').toLowerCase().includes(q);
        return idMatch || nameMatch || artistMatch;
      })
      .slice(0, 6);
    setQuickSuggestions(matches);
  }, [quickQuery, allPaintings]);

  const handleQuickJumpSubmit = (e) => {
    e.preventDefault();
    const raw = quickQuery.trim();
    if (!raw) return;

    // Extract SKU if full URL was scanned into the input
    let code = raw;
    if (raw.includes('/tranh/')) {
      code = decodeURIComponent(raw.split('/tranh/').pop().split(/[?#]/)[0]).trim();
    }

    const exact =
      allPaintings.find(p => String(p.id || '').toLowerCase() === code.toLowerCase()) ||
      quickSuggestions[0];

    if (exact) {
      setQuickQuery('');
      setQuickSuggestions([]);
      onSelectPainting(exact.id);
    }
  };

  const handlePrintQrLabel = () => {
    window.print();
  };

  if (!painting) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white border-2 border-[#C5A059] p-8 max-w-md w-full shadow-lg">
          <QrCode className="w-12 h-12 text-[#9E7A36] mx-auto mb-3" />
          <h2 className="font-serif text-lg font-bold text-stone-900 mb-1">
            Không Tìm Thấy Tác Phẩm
          </h2>
          <p className="text-[12.5px] text-stone-600 mb-5">
            Mã tranh bạn vừa tra cứu hoặc quét QR không tồn tại trong Database Excel hiện tại.
          </p>
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="h-[36px] px-4 bg-[#252016] text-[#FAF8F5] text-[12px] font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4 text-[#C5A059]" />
              <span>Quay Lại Kho Tranh</span>
            </button>
            {onOpenQrScanner && (
              <button
                type="button"
                onClick={onOpenQrScanner}
                className="h-[36px] px-4 bg-[#C5A059] text-[#1C1917] text-[12px] font-bold flex items-center gap-1.5"
              >
                <QrCode className="w-4 h-4" />
                <span>Quét Lại Mã QR</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentIdx = allPaintings.findIndex(p => p.id === painting.id);
  const prevPainting = currentIdx > 0 ? allPaintings[currentIdx - 1] : null;
  const nextPainting =
    currentIdx >= 0 && currentIdx < allPaintings.length - 1 ? allPaintings[currentIdx + 1] : null;

  const handleToggleTagStatus = async () => {
    setIsTogglingTag(true);
    try {
      const nextStatus = !painting.da_in_tag;
      const res = await fetch('/api/paintings/batch-tag-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [painting.id], da_in_tag: nextStatus })
      });
      const json = await res.json();
      if (json.success) {
        painting.da_in_tag = nextStatus;
      }
    } catch (e) {
      console.error('Failed to toggle tag status:', e);
    } finally {
      setIsTogglingTag(false);
    }
  };

  const images = Array.isArray(painting.hinh_anh) ? painting.hinh_anh.filter(Boolean) : [];
  const activeImg = images.length > 0 ? images[selectedImgIdx] || images[0] : null;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:5001';
  const detailFullUrl = `${originUrl}/tranh/${encodeURIComponent(painting.id)}`;
  const qrSvgUrl = `/api/qr/${encodeURIComponent(painting.id)}?origin=${encodeURIComponent(originUrl)}`;
  const qrPngDownloadUrl = `/api/qr/${encodeURIComponent(painting.id)}?format=png&origin=${encodeURIComponent(originUrl)}`;

  const detailFields = [
    {
      section: '1. Thông Tin Định Danh & Nghệ Thuật',
      rows: [
        { label: 'Tên Tác Phẩm', value: renderStrictValue(painting.ten_tac_pham, v => <span className="font-serif text-[13px] font-bold text-stone-900">{v}</span>) },
        { label: 'Họa Sĩ / Tác Giả', value: renderStrictValue(painting.tac_gia) },
        { label: 'Chất Liệu', value: renderStrictValue(painting.chat_lieu) },
        { label: 'Năm Sáng Tác', value: renderStrictValue(painting.nam_sang_tac) },
        { label: 'Kích Thước Tranh', value: renderStrictValue(painting.kich_thuoc_tranh) },
        { label: 'Kích Thước Khung Tranh', value: renderStrictValue(painting.kich_thuoc_khung_tranh) },
        { label: 'Giấy Chứng Nhận Tác Quyền', value: renderStrictValue(painting.giay_chung_nhan) }
      ]
    },
    {
      section: '2. Thông Tin Giá Niêm Yết & Giao Dịch',
      rows: [
        { label: 'Tình Trạng Hiện Tại', value: formatStrictStatus(painting.tinh_trang) },
        { label: 'Giá Niêm Yết ($ USD)', value: formatStrictPrice(painting.gia) },
        { label: 'Khách Hàng Sở Hữu', value: renderStrictValue(painting.khach_hang) },
        { label: 'Số Hoá Đơn / Chứng Từ', value: renderStrictValue(painting.hoa_don) },
        { label: 'Ngày Mua Vào / Nhập Kho', value: formatStrictDate(painting.ngay_mua_vao) },
        { label: 'Ngày Bán / Xuất Kho', value: formatStrictDate(painting.ngay_ban) }
      ]
    },
    {
      section: '3. Nhật Ký Dữ Liệu & Ghi Chú Tác Phẩm',
      rows: [
        { label: 'Ngày Thêm Vào Kho', value: formatStrictDate(painting.ngay_them) },
        { label: 'Cập Nhật Giá Gần Nhất', value: formatStrictDate(painting.ngay_cap_nhat_gia_gan_nhat) },
        { label: 'Ngày Cập Nhật Sản Phẩm', value: formatStrictDate(painting.ngay_cap_nhat_san_pham) },
        { label: 'Số Lượng Hình Ảnh Lưu Trữ', value: images.length > 0 ? <span className="font-semibold text-stone-900">{images.length} hình ảnh</span> : <span className="italic text-stone-400 font-normal">Đang cập nhật</span> },
        { label: 'Ghi Chú Nghệ Thuật', value: renderStrictValue(painting.ghi_chu) }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col">
      {/* Top Sticky Navigation & Quick QR Lookup Bar (Hidden when printing QR Label) */}
      <header className="bg-[#1C1917] text-[#FAF8F5] border-b-2 border-[#C5A059] sticky top-0 z-40 shadow-md print:hidden">
        <div className="max-w-[1750px] mx-auto px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back Button & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="h-[36px] px-3.5 bg-stone-800 hover:bg-stone-700 text-[#FAF8F5] border border-stone-600 text-[12px] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#C5A059]" />
              <span>Quay Lại Kho Tranh</span>
            </button>

            <div className="border-l border-stone-700 pl-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#C5A059] text-[#1C1917] font-mono text-[11px] font-bold">
                  {painting.id}
                </span>
                <h1 className="font-serif text-sm md:text-base font-bold text-[#FAF8F5] tracking-wide uppercase truncate max-w-[260px] md:max-w-[420px]">
                  {hasRealValue(painting.ten_tac_pham) ? painting.ten_tac_pham : 'Đang cập nhật'}
                </h1>
              </div>
              <p className="text-[11px] text-stone-400">
                Trang Chi Tiết Tác Phẩm • Dữ liệu gốc trực tiếp từ cơ sở dữ liệu (Không dùng dữ liệu giả/fallback)
              </p>
            </div>
          </div>

          {/* Center: Quick Search / Barcode & QR Jump Input */}
          <div className="relative flex items-center gap-2 flex-1 max-w-md min-w-[240px]">
            <form onSubmit={handleQuickJumpSubmit} className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Nhập/quét nhanh Mã Tranh (VD: DVS-SD-01) + Enter..."
                className="w-full h-[36px] pl-8 pr-3 text-[12px] bg-stone-900 text-white border border-stone-700 focus:border-[#C5A059] focus:outline-none"
              />
              {quickSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white text-stone-900 border-2 border-[#C5A059] shadow-2xl z-50 divide-y divide-stone-200 max-h-72 overflow-y-auto">
                  {quickSuggestions.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setQuickQuery('');
                        setQuickSuggestions([]);
                        onSelectPainting(item.id);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[#FAF8F5] flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-mono text-[11px] font-bold text-[#9E7A36] mr-2">
                          {item.id}
                        </span>
                        <span className="font-serif font-semibold text-[12.5px] text-stone-900">
                          {hasRealValue(item.ten_tac_pham) ? item.ten_tac_pham : 'Đang cập nhật'}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 shrink-0">
                        {hasRealValue(item.kich_thuoc_tranh) ? item.kich_thuoc_tranh : 'Đang cập nhật'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {onOpenQrScanner && (
              <button
                type="button"
                onClick={onOpenQrScanner}
                className="h-[36px] px-3 bg-[#C5A059] hover:bg-[#b58f47] text-[#1C1917] text-[11.5px] font-bold flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <QrCode className="w-4 h-4" />
                <span>Quét QR</span>
              </button>
            )}
          </div>

          {/* Right: Prev/Next & Edit Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTagModalOpen(true)}
                className="h-[36px] px-3.5 bg-[#FAF8F5] hover:bg-[#F4E5B8] text-stone-900 border border-[#C5A059] font-bold text-[12px] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Mở Thẻ Tag trưng bày (kèm tùy chọn kích cỡ)"
              >
                <Tag className="w-4 h-4 text-[#7D1818]" />
                <span>Thẻ Tag</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="h-[36px] px-3.5 bg-[#C5A059] hover:bg-[#b58f47] text-[#1C1917] font-bold text-[12px] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#1C1917]" />
                <span className="hidden sm:inline">In Tag</span>
              </button>
              <a
                href={qrPngDownloadUrl}
                download={`QR_${painting.id}.png`}
                className="h-[36px] px-3 bg-stone-800 hover:bg-stone-700 text-[#FAF8F5] border border-stone-600 text-[12px] font-semibold flex items-center gap-1.5 transition-colors hidden md:flex"
                title="Tải ảnh mã QR dạng file .PNG"
              >
                <Download className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Tải QR</span>
              </a>
            </div>

            <div className="flex items-center border border-stone-700 bg-stone-900">
              <button
                type="button"
                disabled={!prevPainting}
                onClick={() => prevPainting && onSelectPainting(prevPainting.id)}
                title={prevPainting ? `Trước: ${prevPainting.id}` : 'Đầu danh sách'}
                className="h-[34px] px-2.5 text-[11.5px] text-stone-300 hover:text-white disabled:opacity-30 flex items-center gap-1 border-r border-stone-700"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Trước</span>
              </button>
              <span className="px-2.5 text-[11px] font-mono text-stone-400">
                {currentIdx >= 0 ? `${currentIdx + 1}/${allPaintings.length}` : '—'}
              </span>
              <button
                type="button"
                disabled={!nextPainting}
                onClick={() => nextPainting && onSelectPainting(nextPainting.id)}
                title={nextPainting ? `Tiếp: ${nextPainting.id}` : 'Cuối danh sách'}
                className="h-[34px] px-2.5 text-[11.5px] text-stone-300 hover:text-white disabled:opacity-30 flex items-center gap-1 border-l border-stone-700"
              >
                <span className="hidden sm:inline">Tiếp</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {onOpenEditModal && (
              <button
                type="button"
                onClick={() => onOpenEditModal(painting)}
                className="h-[36px] px-3.5 bg-stone-800 hover:bg-stone-700 text-[#FAF8F5] border border-[#C5A059] text-[12px] font-semibold flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Cập Nhật Dữ Liệu</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Layout: Compact 1-Screen View Without Scroll */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 md:px-6 py-2.5 print:p-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch print:hidden">
          {/* LEFT COLUMN (5 cols on Desktop): Dedicated Artwork Visual Display */}
          <div className="lg:col-span-5 flex flex-col gap-2">
            {/* Artwork Visual Frame */}
            <div className="bg-white border-2 border-stone-800 shadow-sm flex flex-col flex-1">
              <div className="px-3.5 py-1.5 bg-[#1C1917] text-[#FAF8F5] flex items-center justify-between border-b border-stone-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A059] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Hình Ảnh Tác Phẩm Gốc</span>
                </span>
                {activeImg && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenLightbox &&
                      onOpenLightbox(
                        activeImg,
                        hasRealValue(painting.ten_tac_pham) ? painting.ten_tac_pham : 'Đang cập nhật',
                        `${painting.id}`
                      )
                    }
                    className="text-[10.5px] text-stone-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3 text-[#C5A059]" />
                    <span>Phóng đại toàn màn hình</span>
                  </button>
                )}
              </div>

              <div className="bg-[#F4F1EA] min-h-[400px] sm:min-h-[460px] lg:min-h-[500px] flex-1 flex items-center justify-center p-3 relative">
                {activeImg ? (
                  <img
                    src={activeImg}
                    alt={hasRealValue(painting.ten_tac_pham) ? painting.ten_tac_pham : painting.id}
                    onClick={() =>
                      onOpenLightbox &&
                      onOpenLightbox(
                        activeImg,
                        hasRealValue(painting.ten_tac_pham) ? painting.ten_tac_pham : 'Đang cập nhật',
                        `${painting.id}`
                      )
                    }
                    className="w-full h-full max-h-[580px] object-contain cursor-zoom-in drop-shadow-sm transition-transform hover:scale-[1.01]"
                  />
                ) : (
                  <div className="text-center p-8 border border-dashed border-stone-400 bg-white/70">
                    <ImageIcon className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                    <p className="text-[12.5px] italic text-stone-500 font-medium">
                      Hình ảnh tác phẩm: Đang cập nhật
                    </p>
                  </div>
                )}
              </div>

              {/* Multi-image selector if painting has multiple photos */}
              {images.length > 1 && (
                <div className="p-2 bg-white border-t border-stone-200 flex items-center gap-2 overflow-x-auto">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImgIdx(idx)}
                      className={`w-14 h-14 border-2 shrink-0 overflow-hidden transition-all ${
                        selectedImgIdx === idx
                          ? 'border-[#C5A059] scale-105 shadow-sm'
                          : 'border-stone-300 opacity-65 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt={`Góc chụp ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (7 cols on Desktop): Complete Artwork Specification Table (Zero Fallback Data) */}
          <div className="lg:col-span-7 flex flex-col gap-2.5">
            {/* Phân Hệ 1: Thông Tin Định Danh & Nghệ Thuật */}
            <div className="bg-white border-2 border-stone-800 shadow-sm">
              <div className="px-3.5 py-1.5 bg-[#1C1917] text-[#FAF8F5] border-b border-stone-800 flex items-center justify-between">
                <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-[#C5A059]">
                  1. Thông Tin Định Danh & Nghệ Thuật
                </h2>
              </div>

              <table className="w-full border-collapse text-left">
                <tbody className="divide-y divide-stone-200 text-[11.5px]">
                  {detailFields[0].rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 0 ? 'bg-white' : 'bg-[#FAF8F5]/70'}
                    >
                      <th className="py-1 px-3 w-[36%] font-semibold text-stone-600 border-r border-stone-200 align-top text-[11px]">
                        {row.label}
                      </th>
                      <td className="py-1 px-3 align-top break-words text-[11.5px]">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phân Hệ 2 & 3: Giá & Giao Dịch, Nhật Ký Dữ Liệu */}
            {detailFields.slice(1).map((group, gIdx) => (
              <div key={gIdx} className="bg-white border-2 border-stone-800 shadow-sm">
                <div className="px-3.5 py-1.5 bg-[#1C1917] text-[#FAF8F5] border-b border-stone-800 flex items-center justify-between">
                  <h2 className="text-[11.5px] font-bold uppercase tracking-wider text-[#C5A059]">
                    {group.section}
                  </h2>
                </div>

                <table className="w-full border-collapse text-left">
                  <tbody className="divide-y divide-stone-200 text-[11.5px]">
                    {group.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={rIdx % 2 === 0 ? 'bg-white' : 'bg-[#FAF8F5]/70'}
                      >
                        <th className="py-1 px-3 w-[36%] font-semibold text-stone-600 border-r border-stone-200 align-top text-[11px]">
                          {row.label}
                        </th>
                        <td className="py-1 px-3 align-top break-words text-[11.5px]">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        {/* PRINT-ONLY QR ARTWORK LABEL & SPECIFICATION SHEET */}
        <div className="hidden print:block bg-white text-black p-6 border-2 border-black">
          <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest">
                BÌNH MINH ART GALLERY — HỒ SƠ & TEM NHÃN QR TÁC PHẨM
              </div>
              <h1 className="font-serif text-2xl font-bold mt-1">
                {hasRealValue(painting.ten_tac_pham) ? painting.ten_tac_pham : 'Đang cập nhật'}
              </h1>
              <div className="text-sm font-mono font-bold mt-1">
                Mã Tranh: {painting.id}
              </div>
            </div>
            <div className="w-28 h-28 border-2 border-black p-1">
              <img src={qrSvgUrl} alt={`QR ${painting.id}`} className="w-full h-full object-contain" />
            </div>
          </div>

          {activeImg && (
            <div className="mb-4 flex justify-center border border-black p-2">
              <img src={activeImg} alt={painting.id} className="max-h-[260px] object-contain" />
            </div>
          )}

          <table className="w-full border-collapse border border-black text-sm">
            <tbody>
              {detailFields.flatMap(g => g.rows).map((r, idx) => (
                <tr key={idx} className="border-b border-black">
                  <th className="py-1.5 px-3 text-left font-bold border-r border-black w-2/5">
                    {r.label}
                  </th>
                  <td className="py-1.5 px-3">
                    {r.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* BATCH / SINGLE TAG 10x4cm PRINT MODAL */}
        <BatchTagPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          paintings={[painting]}
          onConfirmPrinted={async () => {
            await handleToggleTagStatus();
          }}
        />

        {/* ARTWORK TAG POPUP MODAL (MULTI-SIZE READY) */}
        <ArtworkTagModal
          isOpen={isTagModalOpen}
          onClose={() => setIsTagModalOpen(false)}
          painting={painting}
          originUrl={originUrl}
          onToggleStatus={handleToggleTagStatus}
          isToggling={isTogglingTag}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
        />
      </main>
    </div>
  );
}
