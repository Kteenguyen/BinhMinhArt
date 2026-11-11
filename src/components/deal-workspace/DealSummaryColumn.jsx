// src/components/deal-workspace/DealSummaryColumn.jsx
/**
 * ==============================================================================
 * BinhMinhArt Gallery - Deal Summary & Checkout Form Column (Right Column)
 * Sticky summary card on desktop (lg:sticky lg:top-0)
 * Real-time financial KPI breakdown (listed, deal, savings, VND conversion preview)
 * Invoice details form (invoice code, payment method, order notes)
 * Primary CTA button: "Thanh toán & Xuất VietQR"
 * High-Density Compact UX Directive: button height 34-36px, font 11.5px (font-weight: 600)
 * ==============================================================================
 */

import React from 'react';
import {
  QrCode,
  DollarSign,
  Receipt,
  CreditCard,
  FileText,
  AlertCircle,
  Sparkles,
  TrendingDown
} from 'lucide-react';
import { formatUSD } from '../../types';

export default function DealSummaryColumn({
  cartItems = [],
  calculations,
  invoiceCode,
  setInvoiceCode,
  paymentMethod,
  setPaymentMethod,
  dealNotes,
  setDealNotes,
  onCheckout,
  isCheckingOut = false,
  error = null
}) {
  const {
    totalListed = 0,
    totalDeal = 0,
    discountAmount = 0,
    discountPercent = 0,
    soldCount = 0,
    canCheckout = false,
    hasUnpricedWithoutDeal = false
  } = calculations || {};

  return (
    <div
      className="bg-[#FAF8F5] border border-[#DFCBAA] rounded-xl p-3.5 sm:p-4 space-y-3.5 shadow-sm min-w-0"
      data-testid="customer-deal__summary-column"
    >
      <div className="border-b border-[#EAE5D9] pb-2 flex items-center justify-between">
        <h4 className="text-[12px] font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5 text-[#7D1818]" />
          <span>Tóm Tắt Deal & Thanh Toán</span>
        </h4>
        <span className="font-mono text-[10.5px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
          {cartItems.length} tác phẩm
        </span>
      </div>

      {/* 1. Financial KPI Breakdown Card */}
      <div className="bg-white border border-[#EAE5D9] rounded-lg p-3 space-y-2 text-[11.5px] shadow-2xs">
        <div className="flex justify-between items-center text-stone-600">
          <span>Tổng giá niêm yết:</span>
          <span
            className="font-mono font-semibold text-stone-800"
            data-testid="customer-deal__kpi-total-listed"
          >
            {formatUSD(totalListed)}
          </span>
        </div>

        <div className="flex justify-between items-center text-stone-900 font-bold border-t border-stone-100 pt-1.5">
          <span className="text-[12px] text-emerald-900">Tổng giá chốt (Deal):</span>
          <span
            className="font-mono text-[14px] text-emerald-800 font-extrabold"
            data-testid="customer-deal__kpi-total-deal"
          >
            {formatUSD(totalDeal)}
          </span>
        </div>

        {discountAmount > 0 && (
          <div
            className="flex justify-between items-center text-amber-800 text-[11px] font-semibold bg-amber-50/80 p-1.5 rounded border border-amber-200"
            data-testid="customer-deal__kpi-discount-savings"
          >
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
              <span>Tiết kiệm cho khách:</span>
            </span>
            <span className="font-mono font-bold">
              -{formatUSD(discountAmount)} (-{discountPercent}%)
            </span>
          </div>
        )}

        <div className="flex justify-between items-center text-stone-500 text-[10.5px] border-t border-dashed border-stone-200 pt-1.5">
          <span>Tương đương quy đổi VNĐ (~25.400):</span>
          <span className="font-mono font-bold text-stone-800">
            ~ {(totalDeal * 25400).toLocaleString('vi-VN')} ₫
          </span>
        </div>
      </div>

      {/* Concurrency or Validation Warning */}
      {soldCount > 0 && (
        <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-[10.5px] rounded-md flex items-center gap-1.5 font-semibold">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Có {soldCount} tác phẩm đã bán trong giỏ. Vui lòng loại bỏ trước khi thanh toán.</span>
        </div>
      )}

      {hasUnpricedWithoutDeal && (
        <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 text-[10.5px] rounded-md flex items-center gap-1.5 font-semibold">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Có tác phẩm chưa niêm yết giá. Vui lòng nhập giá thương lượng.</span>
        </div>
      )}

      {/* 2. Checkout Form */}
      <div className="space-y-2.5 text-[11.5px]">
        {/* Invoice Code */}
        <div>
          <label className="block text-[11px] font-bold text-stone-700 mb-1">
            Mã Hóa Đơn <span className="text-stone-400 font-normal">(để trống tự sinh tự động)</span>
          </label>
          <input
            type="text"
            value={invoiceCode || ''}
            onChange={(e) => setInvoiceCode(e.target.value)}
            placeholder="Ví dụ: HD-20261111-001"
            className="w-full h-[32px] px-2.5 font-mono font-bold text-stone-900 bg-white border border-[#DDD5C4] focus:border-[#7D1818] rounded-md focus:outline-none transition-colors"
            data-testid="customer-deal__input-invoice-code"
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-[11px] font-bold text-stone-700 mb-1">
            Phương Thức Thanh Toán
          </label>
          <select
            value={paymentMethod || 'vietqr'}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full h-[32px] px-2.5 bg-white border border-[#DDD5C4] focus:border-[#7D1818] rounded-md font-semibold text-stone-800 focus:outline-none transition-colors"
            data-testid="customer-deal__select-payment-method"
          >
            <option value="vietqr">💳 Chuyển Khoản VietQR (Khuyên dùng)</option>
            <option value="tien_mat">💵 Tiền Mặt</option>
            <option value="chuyen_khoan">🏦 Chuyển Khoản Ngân Hàng Khác</option>
            <option value="the">💳 Quẹt Thẻ / POS</option>
          </select>
        </div>

        {/* Deal Notes */}
        <div>
          <label className="block text-[11px] font-bold text-stone-700 mb-1">
            Ghi Chú Đơn Hàng
          </label>
          <textarea
            rows={2}
            value={dealNotes || ''}
            onChange={(e) => setDealNotes(e.target.value)}
            placeholder="Ghi chú đóng khung, thời gian giao tranh, yêu cầu bảo hiểm..."
            className="w-full p-2 bg-white border border-[#DDD5C4] focus:border-[#7D1818] rounded-md text-[11px] focus:outline-none transition-colors"
            data-testid="customer-deal__input-deal-notes"
          />
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-[11px] font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary CTA Checkout Button */}
        <button
          type="button"
          disabled={isCheckingOut || cartItems.length === 0 || !canCheckout}
          onClick={onCheckout}
          className="w-full h-[36px] bg-[#7D1818] hover:bg-[#691212] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md font-bold text-[11.5px] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          data-testid="customer-deal__btn-checkout"
        >
          {isCheckingOut ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Đang chốt đơn & tạo VietQR...</span>
            </>
          ) : (
            <>
              <QrCode className="w-4 h-4 text-[#F4E5B8]" />
              <span>Thanh Toán & Xuất VietQR</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-stone-500 text-center">
          Nhấn thanh toán sẽ khóa trạng thái tranh thành "Đã bán" và tạo mã QR nhận tiền.
        </p>
      </div>
    </div>
  );
}
