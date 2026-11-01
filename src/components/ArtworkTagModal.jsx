import React, { useState } from 'react';
import {
  X,
  Tag,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import ArtworkDisplayTag from './ArtworkDisplayTag';

/**
 * ArtworkTagModal
 * Modal popup displaying artwork tags with support for multiple preset sizes.
 * Default standard size: 10cm x 4cm (Gallery foam board standard).
 * Ready for future sizes: 8cm x 3cm, 12cm x 5cm, etc.
 */
export default function ArtworkTagModal({
  isOpen,
  onClose,
  painting,
  originUrl = '',
  onToggleStatus,
  isToggling = false,
  onOpenPrintModal
}) {
  const [selectedSize, setSelectedSize] = useState('10x4'); // '10x4' | '8x3' | '12x5'

  if (!isOpen || !painting) return null;

  const currentOrigin = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const qrPngDownloadUrl = `/api/qr/${encodeURIComponent(painting.id)}?format=png&origin=${encodeURIComponent(currentOrigin)}`;

  // Tag Size Presets Definition (extensible for future requirements)
  const TAG_SIZES = [
    {
      id: '10x4',
      name: '10cm × 4cm',
      desc: 'Kích thước chuẩn gắn formex bảo tàng / triển lãm',
      ratio: '10 / 4',
      isDefault: true
    },
    {
      id: '12x5',
      name: '12cm × 5cm',
      desc: 'Cỡ lớn cho tranh khổ đại / sảnh chính (Sắp có)',
      ratio: '12 / 5',
      disabled: false
    },
    {
      id: '8x3',
      name: '8cm × 3cm',
      desc: 'Cỡ nhỏ gọn cho tranh để bàn / tượng nhỏ (Sắp có)',
      ratio: '8 / 3',
      disabled: false
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-[#C5A059] shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#1C1917] text-[#FAF8F5] flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#C5A059] text-[#1C1917] flex items-center justify-center font-bold">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-sm font-bold text-[#FAF8F5] tracking-wide uppercase">
                  Thẻ Tag Trưng Bày Tác Phẩm
                </h3>
                <span className="font-mono text-[10.5px] px-1.5 py-0.2 bg-stone-800 border border-stone-700 text-[#C5A059] font-bold">
                  {painting.id}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Xem trước tem nhãn thẻ tag gắn khung formex và xuất in theo chuẩn triển lãm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleStatus && (
              <button
                type="button"
                disabled={isToggling}
                onClick={onToggleStatus}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                  painting.da_in_tag
                    ? 'bg-emerald-900 text-emerald-200 border border-emerald-700 hover:bg-emerald-800'
                    : 'bg-amber-900 text-amber-200 border border-amber-700 hover:bg-amber-800'
                }`}
              >
                {painting.da_in_tag ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã In Tag</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Chưa In Tag</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Size Selection Tabs */}
        <div className="px-5 py-2.5 bg-[#FAF8F5] border-b border-[#EAE5D9] flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-stone-700 shrink-0">
            <Layers className="w-3.5 h-3.5 text-[#9E7A36]" />
            <span>Kích Cỡ Thẻ Tag:</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {TAG_SIZES.map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => setSelectedSize(size.id)}
                className={`h-[30px] px-3 text-[11.5px] font-semibold rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSize === size.id
                    ? 'bg-[#252016] text-[#FAF8F5] border border-[#C5A059] shadow-xs'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-[#EAE5D9]'
                }`}
              >
                <span>{size.name}</span>
                {size.isDefault && (
                  <span className="text-[9.5px] px-1 bg-[#C5A059] text-[#1C1917] font-bold rounded">
                    Chuẩn
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tag Preview Area */}
        <div className="p-5 bg-[#F5EFE6]/60 flex flex-col items-center justify-center">
          <div className="w-full max-w-[480px]">
            <ArtworkDisplayTag
              painting={painting}
              originUrl={currentOrigin}
              onToggleStatus={onToggleStatus}
              isToggling={isToggling}
            />
          </div>

          <p className="mt-3 text-[11px] text-stone-500 italic text-center">
            * Thẻ tag mô phỏng chuẩn tỷ lệ vật lý dán formex 10cm × 4cm với logo Bình Minh Art Gallery in chìm.
          </p>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3 bg-white border-t border-[#EAE5D9] flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11.5px] text-stone-500 font-mono">
            Mã tác phẩm: <strong>{painting.id}</strong>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={qrPngDownloadUrl}
              download={`QR_${painting.id}.png`}
              className="h-[34px] px-3 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 text-[11.5px] font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Tải ảnh mã QR dạng file .PNG"
            >
              <Download className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Tải Mã QR (.PNG)</span>
            </a>

            {onOpenPrintModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrintModal();
                }}
                className="h-[34px] px-4 bg-[#C5A059] hover:bg-[#b58f47] text-[#1C1917] text-[11.5px] font-bold rounded flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#1C1917]" />
                <span>In Thẻ Tag ({selectedSize === '10x4' ? '10x4cm' : selectedSize})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="h-[34px] px-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11.5px] font-semibold rounded transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
