import React, { useRef } from 'react';
import { X, Printer, Check, Info } from 'lucide-react';

/**
 * BatchTagPrintModal
 * Standard A4 Sheet Layout (2 columns x 5 rows = 10 tags per A4 sheet)
 * Physical dimension per tag: exactly 100mm x 40mm (10cm x 4cm)
 * With dashed crop marks for quick cutting and foam board mounting.
 */
export default function BatchTagPrintModal({
  isOpen,
  onClose,
  paintings = [],
  onConfirmPrinted
}) {
  if (!isOpen || paintings.length === 0) return null;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handlePrint = () => {
    window.print();
    if (onConfirmPrinted) {
      onConfirmPrinted(paintings.map(p => p.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* On-screen Modal Container (Hidden during window.print via print:hidden) */}
      <div
        className="bg-white border border-[#DFCBAA] rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-98 duration-150 print:hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#FAF8F5] border-b border-[#EAE5D9]">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#7D1818]" />
            <div>
              <h3 className="font-serif text-sm font-bold text-stone-900">
                In Thẻ Tag Trưng Bày 10cm × 4cm ({paintings.length} tác phẩm)
              </h3>
              <p className="text-[11px] text-stone-500">
                Khổ giấy chuẩn A4 (2 cột × 5 hàng = 10 tag/trang) kèm đường đứt nét để cắt dán lên xốp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="h-[32px] px-4 text-[11.5px] font-bold text-white bg-[#7D1818] hover:bg-[#691212] rounded shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#F4E5B8]" />
              <span>In Ngay (Khổ A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tip / Instruction Box */}
        <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-200 text-[11.5px] text-amber-900 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-amber-700" />
          <span>
            <strong>Hướng dẫn in:</strong> Chọn máy in khổ <strong>A4</strong>, đặt tỷ lệ in <strong>100% (Actual size)</strong> để mỗi tag đạt kích thước chuẩn xác <strong>100mm × 40mm</strong>. Dùng dao rọc giấy cắt theo viền đứt nét để dán vào miếng xốp.
          </span>
        </div>

        {/* Preview of the A4 Layout in Browser */}
        <div className="flex-1 overflow-y-auto p-4 bg-stone-200 flex justify-center">
          <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl p-[10mm] border border-stone-300 grid grid-cols-2 gap-[5mm] content-start">
            {paintings.map((p, idx) => (
              <div
                key={p.id || idx}
                className="w-[100mm] h-[40mm] border border-dashed border-[#777] p-[3.5mm] flex items-center gap-[4mm] box-border relative overflow-hidden bg-white shadow-xs"
              >
                {/* QR Code */}
                <div className="w-[30mm] h-[30mm] shrink-0 flex items-center justify-center p-[0.5mm] bg-white">
                  <img
                    src={`/api/qr/${encodeURIComponent(p.id)}?origin=${encodeURIComponent(originUrl)}`}
                    alt={p.id}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Vertical Divider */}
                <div className="w-[0.5px] h-[28mm] bg-stone-200 shrink-0" />

                {/* Metadata (Aligned: Title & Specs right-aligned, Artist left-aligned) */}
                <div className="flex-1 flex flex-col justify-between h-[30mm] min-w-0 pr-1 text-black relative">
                  {/* Watermark Logo nằm trọn bên phải, căn giữa, không tràn qua vạch QR */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.13] select-none flex items-center justify-center p-[2mm] z-0">
                    <img
                      src="/binhminh_logo.png"
                      alt=""
                      className="max-w-[85%] max-h-[85%] object-contain grayscale contrast-125"
                    />
                  </div>

                  <div className="text-right relative z-10">
                    <h4 className="font-serif text-[15pt] font-bold text-stone-950 tracking-tight truncate leading-tight">
                      {p.ten_tac_pham || p.id}
                    </h4>

                    <div className="text-[9.5pt] text-stone-700 font-sans tracking-tight mt-[1mm] flex items-center justify-end gap-[1.5mm] font-medium">
                      <span>{p.chat_lieu || 'Sơn mài'}</span>
                      <span className="text-stone-300">•</span>
                      <span>{p.kich_thuoc_tranh || '—'}</span>
                      {p.nam_sang_tac && (
                        <>
                          <span className="text-stone-300">•</span>
                          <span>{p.nam_sang_tac}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-left pt-[1mm] relative z-10">
                    <span className="font-serif text-[13pt] font-bold text-[#7D1818] tracking-normal leading-none inline-block">
                      {p.tac_gia || 'Dương Văn Sen'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#FAF8F5] border-t border-[#EAE5D9] flex items-center justify-between text-[11px] text-stone-500">
          <span>Tổng số: <strong>{paintings.length}</strong> tag đang chuẩn bị in</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[28px] px-3 font-semibold text-stone-600 bg-white border border-[#DDD5C4] rounded hover:bg-stone-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="h-[28px] px-3.5 font-bold text-white bg-[#7D1818] hover:bg-[#691212] rounded flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In ({paintings.length} tag)</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY CONTAINER: Strictly configured for A4 paper and exact millimeter measurements */}
      <div className="hidden print:block print:w-[210mm] print:m-0 print:p-[10mm]">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-grid-container {
              display: grid !important;
              grid-template-columns: repeat(2, 100mm) !important;
              grid-auto-rows: 40mm !important;
              column-gap: 5mm !important;
              row-gap: 5mm !important;
              page-break-after: always;
            }
            .print-tag-box {
              width: 100mm !important;
              height: 40mm !important;
              border: 0.5px dashed #444 !important;
              padding: 3mm !important;
              box-sizing: border-box !important;
              display: flex !important;
              align-items: center !important;
              gap: 3mm !important;
              overflow: hidden !important;
              background: white !important;
              break-inside: avoid !important;
            }
          }
        ` }} />

        <div className="print-grid-container">
          {paintings.map((p, idx) => (
            <div key={p.id || idx} className="print-tag-box">
              {/* QR Code */}
              <div style={{ width: '28mm', height: '28mm', flexShrink: 0, padding: '0.5mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={`/api/qr/${encodeURIComponent(p.id)}?origin=${encodeURIComponent(originUrl)}`}
                  alt={p.id}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Elegant Hairline Divider */}
              <div style={{ width: '0.5px', height: '26mm', backgroundColor: '#e0dcd3', flexShrink: 0 }} />

              {/* Tag Info (Print Output: Title & Specs right-aligned, Artist left-aligned) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '28mm', overflow: 'hidden', position: 'relative' }}>
                {/* Watermark Logo Print-safe: Center of right column only, never overlapping QR */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.13, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 0, padding: '1mm' }}>
                  <img
                    src="/binhminh_logo.png"
                    alt=""
                    style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain', filter: 'grayscale(100%) contrast(125%)' }}
                  />
                </div>

                <div style={{ textAlign: 'right', position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '14.5pt', fontWeight: 'bold', color: '#000', fontFamily: 'serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.15 }}>
                    {p.ten_tac_pham || p.id}
                  </div>

                  <div style={{ fontSize: '9pt', color: '#333', fontFamily: 'sans-serif', marginTop: '1.2mm', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1.5mm' }}>
                    <span>{p.chat_lieu || 'Sơn mài'}</span>
                    <span>•</span>
                    <span>{p.kich_thuoc_tranh || '—'}</span>
                    {p.nam_sang_tac && (
                      <>
                        <span>•</span>
                        <span>{p.nam_sang_tac}</span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'left', paddingTop: '1mm' }}>
                  <span style={{ fontSize: '12.5pt', fontWeight: 'bold', color: '#000', fontFamily: 'serif' }}>
                    {p.tac_gia || 'Dương Văn Sen'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
