// src/components/deal-workspace/CustomerInvoicesTab.jsx
/**
 * ==============================================================================
 * BinhMinhArt Gallery - Customer Invoices History Tab
 * Renders list of finalized orders/invoices for customer
 * High-Density Compact UX Directive: button height 32-34px, font 11-11.5px (font-weight: 600)
 * ==============================================================================
 */

import React from 'react';
import { Receipt, QrCode, Calendar, Tag, CheckCircle2, Clock } from 'lucide-react';
import { formatUSD } from '../../types';
import { formatThousands } from '../../utils/currency';

export default function CustomerInvoicesTab({
  invoices = [],
  loading = false,
  onOpenVietQr
}) {
  if (loading) {
    return (
      <div className="p-8 text-center bg-white border border-[#EAE5D9] rounded-xl max-w-4xl mx-auto shadow-2xs">
        <div className="w-6 h-6 border-2 border-[#7D1818] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-[11.5px] text-stone-500 font-semibold">Đang tải lịch sử đơn hàng...</span>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-[#EAE5D9] rounded-xl max-w-4xl mx-auto shadow-2xs space-y-2">
        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
          <Receipt className="w-5 h-5" />
        </div>
        <h4 className="text-[13px] font-bold text-stone-800">Chưa có lịch sử giao dịch</h4>
        <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
          Khách hàng này chưa có đơn hàng nào được chốt. Hãy thêm tác phẩm vào giỏ hàng và tiến hành thanh toán ở tab Workspace & Giỏ hàng.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-4xl mx-auto" data-testid="customer-invoices__container">
      <div className="flex items-center justify-between text-[11.5px] font-bold text-stone-700 px-1">
        <span>Lịch sử đơn hàng đã xuất ({invoices.length})</span>
      </div>

      <div className="space-y-2.5">
        {invoices.map((inv) => {
          const items = Array.isArray(inv.items_detail)
            ? inv.items_detail
            : (Array.isArray(inv.painting_ids) ? inv.painting_ids.map(id => ({ painting_id: id })) : []);

          return (
            <div
              key={inv.id || inv.invoice_code}
              className="bg-white border border-[#EAE5D9] hover:border-[#DFCBAA] rounded-xl p-3.5 transition-all shadow-2xs space-y-2.5"
              data-testid={`customer-invoices__item--${inv.invoice_code}`}
            >
              {/* Header: Invoice Code + Date + Status + VietQR Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[12.5px] text-[#7D1818] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {inv.invoice_code}
                  </span>
                  <span className="text-[11px] text-stone-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>{inv.created_at ? inv.created_at.replace('T', ' ').slice(0, 16) : 'Mới tạo'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold ${
                    inv.payment_status === 'paid'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                  }`}>
                    {inv.payment_status === 'paid' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Đã thu tiền</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Chờ thanh toán</span>
                      </>
                    )}
                  </span>

                  {onOpenVietQr && (
                    <button
                      type="button"
                      onClick={() => onOpenVietQr(inv)}
                      className="h-[28px] px-2.5 bg-[#FAF8F5] hover:bg-[#7D1818] text-stone-700 hover:text-white border border-[#DDD5C4] text-[10.5px] font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
                      title="Xem lại mã VietQR"
                    >
                      <QrCode className="w-3 h-3 text-[#C58C00]" />
                      <span>Xem VietQR</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {items.map((it, idx) => (
                  <span
                    key={it.painting_id || idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAF8F5] border border-stone-200 rounded text-[10.5px] text-stone-800"
                  >
                    <Tag className="w-3 h-3 text-stone-400" />
                    <span className="font-mono font-bold text-[#7D1818]">{it.painting_id}</span>
                    {it.deal_price !== undefined && it.deal_price !== null && (
                      <>
                        <span className="text-stone-400">•</span>
                        <span className="font-mono font-semibold">${formatThousands(it.deal_price)}</span>
                      </>
                    )}
                  </span>
                ))}
              </div>

              {/* Financial Breakdown */}
              <div className="flex flex-wrap items-center justify-between text-[11px] bg-stone-50/70 p-2 rounded border border-stone-100">
                <div className="flex items-center gap-3 text-stone-600">
                  <span>Niêm yết: <strong className="font-mono text-stone-800">{formatUSD(inv.total_listed_price || 0)}</strong></span>
                  {inv.discount_amount > 0 && (
                    <span>Tiết kiệm: <strong className="font-mono text-emerald-700">-{formatUSD(inv.discount_amount)}</strong></span>
                  )}
                  <span>PTTT: <strong className="text-stone-800">{inv.payment_method === 'vietqr' ? 'VietQR' : (inv.payment_method === 'tien_mat' ? 'Tiền mặt' : inv.payment_method)}</strong></span>
                </div>

                <div className="text-[12px] font-bold text-stone-900">
                  <span>Tổng tiền: </span>
                  <span className="font-mono text-[13.5px] text-[#7D1818]">{formatUSD(inv.total_deal_price || 0)}</span>
                </div>
              </div>

              {inv.notes && (
                <p className="text-[10.5px] text-stone-500 italic">
                  Ghi chú: {inv.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
