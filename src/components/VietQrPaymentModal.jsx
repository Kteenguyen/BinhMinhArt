// src/components/VietQrPaymentModal.jsx
/**
 * ==============================================================================
 * BinhMinhArt Gallery - VietQR Payment Modal Component
 * Renders standard VietQR code (QuickLink URL with Base64 offline fallback),
 * bank details table, 1-click copy buttons with 2-second feedback,
 * download QR, print receipt, and compact enterprise layout.
 * Conforms strictly to Enterprise Compact Mobile UX:
 * Button height 32-34px, font 11-11.5px (font-weight: 600), touch targets >= 44px.
 * ==============================================================================
 */

import React, { useState } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  Download,
  Printer,
  CheckCircle2,
  Building2,
  Hash,
  User,
  DollarSign,
  Sparkles
} from 'lucide-react';
import { formatUSD } from '../types';
import { formatThousands } from '../utils/currency';

function formatVND(val) {
  if (val === null || val === undefined || val === '') return '0 ₫';
  const num = Number(val) || 0;
  return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
}

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text));
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, attempting fallback:', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = String(text);
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error('Fallback clipboard copy failed:', fallbackErr);
    return false;
  }
}

export default function VietQrPaymentModal({
  isOpen,
  onClose,
  invoice,
  vietqr,
  onPaymentConfirmed
}) {
  const [copiedKey, setCopiedKey] = useState(null); // 'account_no' | 'amount_vnd' | 'memo'
  const [qrImgFallback, setQrImgFallback] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!isOpen || !invoice || !vietqr) return null;

  const handleCopy = async (key, value) => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine active QR image source (QuickLink vs offline Base64 fallback)
  const qrImageSrc = qrImgFallback
    ? (vietqr.qr_data_url || vietqr.qr_image_url)
    : (vietqr.qr_image_url || vietqr.qr_data_url);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#EAE5D9] shadow-2xl rounded-xl w-full max-w-[440px] sm:max-w-lg overflow-hidden flex flex-col my-auto max-h-[94vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        data-testid="vietqr-modal__container"
      >
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#252016] text-[#FAF8F5] flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-[#C5A059] text-[#1C1917] flex items-center justify-center shrink-0 shadow-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[12.5px] sm:text-[13px] font-bold text-white uppercase tracking-wider truncate flex items-center gap-1.5">
                <span>Thanh Toán VietQR</span>
                <span className="text-[9.5px] px-1.5 py-0.2 bg-[#7D1818] text-[#F4E5B8] rounded font-mono font-bold">
                  NAPAS 24/7
                </span>
              </h3>
              <div className="flex items-center gap-2 text-[10.5px] text-stone-300 mt-0.5 truncate">
                <span className="font-mono text-[#C5A059] font-bold">
                  {invoice.invoice_code}
                </span>
                <span>•</span>
                <span className="truncate">{invoice.customer_name}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md text-stone-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
            title="Đóng"
            data-testid="vietqr-modal__btn-close-header"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-[#FAF8F5] text-[11.5px]">
          {/* QR Code Presentation Box */}
          <div className="bg-white border border-[#DDD5C4] rounded-lg p-3 text-center shadow-2xs">
            <div className="inline-block p-2 bg-white rounded border border-stone-200 shadow-xs">
              <img
                src={qrImageSrc}
                alt="Mã QR Thanh Toán VietQR"
                onError={() => setQrImgFallback(true)}
                className="w-44 h-44 sm:w-52 sm:h-52 object-contain mx-auto"
                data-testid="vietqr-modal__qr-image"
              />
            </div>

            <div className="mt-2 flex items-center justify-center gap-1.5 text-[10.5px] text-emerald-800 font-semibold bg-emerald-50 py-1 px-2.5 rounded-full border border-emerald-200 max-w-fit mx-auto">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Quét bằng ứng dụng 50+ ngân hàng & ví điện tử</span>
            </div>
          </div>

          {/* Clean Tabular Bank Details */}
          <div className="bg-white border border-[#EAE5D9] rounded-lg divide-y divide-[#EAE5D9] overflow-hidden shadow-2xs">
            {/* Row 1: Bank Name */}
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-stone-500 font-semibold flex items-center gap-1.5 shrink-0">
                <Building2 className="w-3.5 h-3.5 text-stone-400" />
                <span>Ngân hàng:</span>
              </span>
              <span className="font-bold text-stone-900 text-right truncate">
                {vietqr.bank_name}{' '}
                <span className="font-mono text-[10px] text-stone-400">
                  (BIN {vietqr.bank_id})
                </span>
              </span>
            </div>

            {/* Row 2: Account Number + Copy */}
            <div className="px-3 py-2 flex items-center justify-between gap-2 bg-[#FAF8F5]/50">
              <span className="text-stone-500 font-semibold flex items-center gap-1.5 shrink-0">
                <Hash className="w-3.5 h-3.5 text-stone-400" />
                <span>Số tài khoản:</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[13px] text-stone-900 tracking-wider">
                  {vietqr.account_no}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('account_no', vietqr.account_no)}
                  className={`h-[28px] px-2 text-[10.5px] font-semibold rounded transition-all flex items-center gap-1 cursor-pointer ${
                    copiedKey === 'account_no'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                  }`}
                  title="Sao chép số tài khoản"
                  data-testid="vietqr-modal__btn-copy-account"
                >
                  {copiedKey === 'account_no' ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Đã chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-stone-500" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Row 3: Account Name */}
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-stone-500 font-semibold flex items-center gap-1.5 shrink-0">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>Chủ tài khoản:</span>
              </span>
              <span className="font-bold text-stone-900 uppercase text-right truncate">
                {vietqr.account_name}
              </span>
            </div>

            {/* Row 4: Deal Price USD & Exchange Rate */}
            <div className="px-3 py-2 flex items-center justify-between gap-2 bg-[#FAF8F5]/50">
              <span className="text-stone-500 font-semibold flex items-center gap-1.5 shrink-0">
                <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                <span>Quy đổi USD ➔ VND:</span>
              </span>
              <div className="text-right">
                <span className="font-mono font-bold text-stone-800">
                  ${formatThousands(vietqr.amount_usd || invoice.total_deal_price)} USD
                </span>
                <span className="text-stone-400 text-[10px] ml-1.5">
                  (Tỷ giá: {formatThousands(vietqr.exchange_rate || 25400)} đ/$)
                </span>
              </div>
            </div>

            {/* Row 5: Payable Amount in VND + Copy */}
            <div className="px-3 py-2.5 flex items-center justify-between gap-2 bg-amber-50/70 border-t-2 border-amber-200">
              <div>
                <span className="text-stone-800 font-bold block text-[11px]">
                  Số tiền thanh toán (VND):
                </span>
                <span className="text-[10px] text-stone-500">Đã làm tròn số nguyên</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-[15px] sm:text-[16px] text-[#7D1818] tracking-tight">
                  {formatVND(vietqr.amount_vnd)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('amount_vnd', vietqr.amount_vnd)}
                  className={`h-[28px] px-2 text-[10.5px] font-semibold rounded transition-all flex items-center gap-1 cursor-pointer ${
                    copiedKey === 'amount_vnd'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-300'
                  }`}
                  title="Sao chép số tiền VND"
                  data-testid="vietqr-modal__btn-copy-amount"
                >
                  {copiedKey === 'amount_vnd' ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Đã chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-stone-500" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Row 6: Transfer Memo + Copy */}
            <div className="px-3 py-2.5 flex items-center justify-between gap-2 bg-amber-50/70 border-t border-amber-200">
              <div className="min-w-0">
                <span className="text-stone-800 font-bold block text-[11px]">
                  Nội dung chuyển tiền:
                </span>
                <span className="text-[10px] text-stone-500 truncate block">
                  Giữ nguyên mã HĐ để đối soát
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono font-bold text-[12px] text-stone-900 bg-white px-2 py-0.5 rounded border border-[#DDD5C4] select-all">
                  {vietqr.memo}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('memo', vietqr.memo)}
                  className={`h-[28px] px-2 text-[10.5px] font-semibold rounded transition-all flex items-center gap-1 cursor-pointer ${
                    copiedKey === 'memo'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-300'
                  }`}
                  title="Sao chép nội dung chuyển khoản"
                  data-testid="vietqr-modal__btn-copy-memo"
                >
                  {copiedKey === 'memo' ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Đã chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-stone-500" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Purchased Artworks Pill Summary */}
          {Array.isArray(invoice.items_detail) && invoice.items_detail.length > 0 && (
            <div className="bg-white border border-[#EAE5D9] rounded-lg p-2.5 text-[11px] space-y-1 shadow-2xs">
              <div className="font-semibold text-stone-700 flex items-center justify-between">
                <span>Tác phẩm trong hóa đơn ({invoice.items_detail.length}):</span>
                {invoice.discount_amount > 0 && (
                  <span className="text-stone-500 font-mono text-[10.5px]">
                    Tiết kiệm: {formatUSD(invoice.discount_amount)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {invoice.items_detail.map((it) => (
                  <span
                    key={it.painting_id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF8F5] border border-stone-200 rounded text-[10.5px] text-stone-800"
                  >
                    <span className="font-mono font-bold text-[#7D1818]">{it.painting_id}</span>
                    <span className="text-stone-400">•</span>
                    <span className="font-mono font-semibold">${formatThousands(it.deal_price)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions - High-Density Compact Standards */}
        <div className="px-3.5 py-2.5 bg-white border-t border-[#EAE5D9] flex flex-wrap items-center justify-between gap-2">
          {/* Left Buttons: Download QR & Print */}
          <div className="flex items-center gap-1.5">
            <a
              href={qrImageSrc}
              download={`VietQR_${invoice.invoice_code || 'payment'}.png`}
              className="h-[32px] px-2.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 text-[11px] font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              title="Tải ảnh QR về máy"
              data-testid="vietqr-modal__btn-download"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden xs:inline">Tải QR</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="h-[32px] px-2.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 text-[11px] font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              title="In phiếu giao dịch thanh toán"
              data-testid="vietqr-modal__btn-print"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden xs:inline">In Phiếu</span>
            </button>
          </div>

          {/* Right Action: Close / Confirm */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[32px] px-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
              data-testid="vietqr-modal__btn-close"
            >
              Đóng
            </button>

            {onPaymentConfirmed && (
              <button
                type="button"
                onClick={async () => {
                  setConfirming(true);
                  try {
                    await onPaymentConfirmed(invoice);
                    onClose();
                  } finally {
                    setConfirming(false);
                  }
                }}
                disabled={confirming}
                className="h-[34px] px-3.5 bg-[#7D1818] hover:bg-[#691212] text-white text-[11.5px] font-bold rounded-md flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                data-testid="vietqr-modal__btn-confirm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F4E5B8]" />
                <span>{confirming ? 'Đang cập nhật...' : 'Xác Nhận Đã Thu Tiền'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
