import React from 'react';
import { QrCode, CheckCircle2, Clock } from 'lucide-react';

/**
 * ArtworkDisplayTag
 * Standard Gallery Display Tag designed for 10cm x 4cm foam board mounting.
 * Left: QR Code (quick scan link)
 * Right: Artwork Name, Medium, Dimensions, Year, Artist Name.
 */
export default function ArtworkDisplayTag({
  painting,
  originUrl = '',
  onToggleStatus,
  isToggling = false
}) {
  if (!painting) return null;

  const currentOrigin = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const qrSvgUrl = `/api/qr/${encodeURIComponent(painting.id)}?origin=${encodeURIComponent(currentOrigin)}`;

  // Physical tag aspect ratio: 10cm x 4cm (2.5 : 1)
  return (
    <div className="bg-white border-2 border-stone-800 shadow-sm flex flex-col">
      <div className="px-3.5 py-1.5 bg-[#1C1917] text-[#FAF8F5] flex items-center justify-between border-b border-stone-800 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="font-bold uppercase tracking-wider text-[#C5A059]">
            Thẻ Tag Trưng Bày Tác Phẩm
          </span>
          <span className="font-mono text-[9.5px] text-stone-400 bg-stone-800 px-1.5 py-0.2 rounded border border-stone-700">
            Kích thước chuẩn: 10cm × 4cm
          </span>
        </div>

        {onToggleStatus && (
          <button
            type="button"
            disabled={isToggling}
            onClick={onToggleStatus}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors flex items-center gap-1 ${
              painting.da_in_tag
                ? 'bg-emerald-900 text-emerald-200 border border-emerald-700 hover:bg-emerald-800'
                : 'bg-amber-900 text-amber-200 border border-amber-700 hover:bg-amber-800'
            }`}
          >
            {painting.da_in_tag ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Đã In Tag</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Chưa In Tag</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Visual Simulation of the 10cm x 4cm Foam Card */}
      <div className="p-2 sm:p-2.5 bg-[#EFECE6] flex items-center justify-center">
        {/* Physical Foam Board Mockup (10cm x 4cm = 2.5 : 1 ratio) */}
        <div
          className="w-full max-w-[380px] bg-white border border-stone-300 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center px-3 py-2 gap-3 relative overflow-hidden"
          style={{ aspectRatio: '10 / 4' }}
        >
          {/* Subtle foam board edge thickness indicator */}
          <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-stone-200" />

          {/* Left: Clean QR Code (No thick border box, seamless integration) */}
          <div className="h-[82%] aspect-square shrink-0 flex items-center justify-center bg-white p-0.5">
            <img
              src={qrSvgUrl}
              alt={`QR ${painting.id}`}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Elegant Divider Line between QR and Text */}
          <div className="w-[1px] h-[75%] bg-stone-200 shrink-0" />

          {/* Right: Artwork Details (Aligned: Title & Specs right-aligned, Artist left-aligned) */}
          <div className="flex-1 flex flex-col justify-between h-[82%] min-w-0 pr-1 select-text relative">
            {/* Watermark Logo nằm trọn bên phải, căn giữa, không tràn qua vạch QR */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.13] select-none flex items-center justify-center p-2 z-0">
              <img
                src="/binhminh_logo.png"
                alt=""
                className="max-w-[85%] max-h-[85%] object-contain grayscale contrast-125"
              />
            </div>

            {/* Top Right: Artwork Title & Specifications (Căn phải) */}
            <div className="text-right relative z-10">
              {/* Artwork Title (Large, Bold Serif, Căn phải) */}
              <h3 className="font-serif text-[22px] sm:text-[25px] font-bold text-stone-950 leading-tight tracking-tight truncate">
                {painting.ten_tac_pham || painting.id}
              </h3>

              {/* Specifications: Medium - Dimensions - Year (Căn phải) */}
              <div className="text-[13px] sm:text-[14px] text-stone-600 font-sans tracking-tight mt-1 flex items-center justify-end gap-1.5 flex-wrap font-medium">
                <span>{painting.chat_lieu || 'Sơn mài'}</span>
                <span className="text-stone-300">•</span>
                <span>{painting.kich_thuoc_tranh || '—'}</span>
                {painting.nam_sang_tac && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span>{painting.nam_sang_tac}</span>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Left: Artist Name (Căn trái, Bold Serif chuẩn Times New Roman / Playfair Display trang nhã) */}
            <div className="text-left pt-1 relative z-10">
              <span className="font-serif text-[17px] sm:text-[19px] font-bold text-[#7D1818] tracking-normal leading-none inline-block">
                {painting.tac_gia || 'Dương Văn Sen'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
