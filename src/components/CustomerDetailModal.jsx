// src/components/CustomerDetailModal.jsx
/**
 * ==============================================================================
 * BinhMinhArt Gallery - Customer Detail & Deal Workspace Modal Orchestrator
 * Standard: Rule 04 (< 500 lines) and Enterprise Compact Mobile UX Directive
 * 2-Column Deal Workspace:
 * - Left (7 cols): DealCartColumn (diacritic-insensitive search, quick-add, cart cards)
 * - Right (5 cols): DealSummaryColumn (sticky financial summary, checkout form, CTA)
 * Tabs: Workspace & Giỏ hàng | Thông tin & Lịch hẹn | Lịch sử đơn hàng
 * VietQR Integration: Opens VietQrPaymentModal on successful checkout
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Trash2, ShoppingCart, Calendar, Receipt, Save, AlertCircle } from 'lucide-react';
import { useCustomerCart } from '../hooks/useCustomerCart';
import DealCartColumn from './deal-workspace/DealCartColumn';
import DealSummaryColumn from './deal-workspace/DealSummaryColumn';
import CustomerInfoTab from './deal-workspace/CustomerInfoTab';
import CustomerInvoicesTab from './deal-workspace/CustomerInvoicesTab';
import VietQrPaymentModal from './VietQrPaymentModal';

export default function CustomerDetailModal({
  isOpen,
  onClose,
  customerId,
  paintings = [],
  onCustomerUpdated,
  onCustomerDeleted,
  onOpenLightbox
}) {
  const [customer, setCustomer] = useState(null);
  const [formData, setFormData] = useState({
    ho_ten: '', so_dien_thoai: '', email: '', dia_chi: '', ngay_hen: '', ghi_chu: ''
  });
  const [initialLoading, setInitialLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Active Tab: 'workspace' | 'info' | 'invoices'
  const [activeTab, setActiveTab] = useState('workspace');

  // Past Invoices
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Checkout & VietQR Modal State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [completedPaymentBundle, setCompletedPaymentBundle] = useState(null);
  const [isVietQrOpen, setIsVietQrOpen] = useState(false);

  // Active Cart State & Calculations via Hook
  const {
    cartItems, invoiceCode, setInvoiceCode, paymentMethod, setPaymentMethod,
    dealNotes, setDealNotes, calculations, addToCart, removeFromCart,
    updateDealPrice, applyDiscountPercent, updateItemNote, clearCart
  } = useCustomerCart({ customerId, isOpen, paintings });

  // 1. Fetch Customer Detail
  const fetchCustomerDetail = useCallback(async () => {
    if (!customerId) return;
    setInitialLoading(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCustomer(json.data);
        setFormData({
          ho_ten: json.data.ho_ten || '',
          so_dien_thoai: json.data.so_dien_thoai || '',
          email: json.data.email || '',
          dia_chi: json.data.dia_chi || '',
          ngay_hen: json.data.ngay_hen || '',
          ghi_chu: json.data.ghi_chu || ''
        });
      } else {
        setModalError(json.message || 'Không tìm thấy thông tin khách hàng');
      }
    } catch (err) {
      setModalError('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setInitialLoading(false);
    }
  }, [customerId]);

  // 2. Fetch Customer Invoices
  const fetchCustomerInvoices = useCallback(async () => {
    if (!customerId) return;
    setInvoicesLoading(true);
    try {
      const res = await fetch(`/api/invoices?customer_id=${customerId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setInvoices(json.data);
      }
    } catch (err) {
      console.warn('[CustomerDetailModal] Invoices fetch warning:', err);
    } finally {
      setInvoicesLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (!isOpen || !customerId) {
      setCustomer(null);
      setInvoices([]);
      setCheckoutError(null);
      setModalError(null);
      return;
    }
    fetchCustomerDetail();
    fetchCustomerInvoices();
    setActiveTab('workspace');
  }, [isOpen, customerId, fetchCustomerDetail, fetchCustomerInvoices]);

  // 3. Save Customer Profile
  const handleSaveCustomerProfile = async () => {
    setSaving(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        if (onCustomerUpdated) onCustomerUpdated();
        fetchCustomerDetail();
      } else {
        setModalError(json.error || json.message || 'Lỗi lưu thông tin');
      }
    } catch (err) {
      setModalError('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 4. Execute Checkout & Generate VietQR
  const handleExecuteCheckout = async () => {
    if (!cartItems || cartItems.length === 0) {
      setCheckoutError('Giỏ hàng trống! Vui lòng chọn ít nhất 1 tác phẩm.');
      return;
    }
    if (!calculations.canCheckout) {
      if (calculations.soldCount > 0) {
        setCheckoutError('Có tác phẩm trong giỏ đã bán cho khách khác. Vui lòng loại bỏ trước khi thanh toán.');
      } else if (calculations.hasUnpricedWithoutDeal) {
        setCheckoutError('Vui lòng nhập giá thương lượng cho các tác phẩm chưa niêm yết giá.');
      } else {
        setCheckoutError('Không thể thanh toán giỏ hàng hiện tại.');
      }
      return;
    }

    const customerName = (formData.ho_ten || customer?.ho_ten || '').trim();
    if (!customerName) {
      setCheckoutError('Tên khách hàng không được để trống.');
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const payload = {
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: (formData.so_dien_thoai || customer?.so_dien_thoai || '').trim(),
        customer_email: (formData.email || customer?.email || '').trim(),
        invoice_code: invoiceCode.trim() || undefined,
        payment_method: paymentMethod || 'vietqr',
        notes: dealNotes.trim() || '',
        items: cartItems.map((it) => {
          const p = paintings.find(pt => String(pt.id || '').trim() === String(it.painting_id || '').trim());
          const dealPriceNum = typeof it.deal_price === 'number' && Number.isFinite(it.deal_price) && it.deal_price >= 0
            ? it.deal_price
            : (p && typeof p.gia === 'number' ? p.gia : 0);
          return { painting_id: it.painting_id, deal_price: dealPriceNum, note: it.note || '' };
        })
      };

      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setCheckoutError(res.status === 409
          ? (json.message || 'Xung đột: Tác phẩm đã được bán trước đó, không thể thanh toán!')
          : (json.message || 'Không thể hoàn tất thanh toán do lỗi máy chủ.')
        );
        return;
      }

      // Success!
      const { invoice, vietqr } = json.data;
      clearCart();
      setCompletedPaymentBundle({ invoice, vietqr });
      setIsVietQrOpen(true);
      fetchCustomerInvoices();
      if (onCustomerUpdated) onCustomerUpdated();
    } catch (err) {
      setCheckoutError('Lỗi kết nối máy chủ khi thanh toán: ' + err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // 5. Open Past Invoice VietQR
  const handleOpenPastVietQr = (pastInvoice) => {
    const amountUsd = pastInvoice.total_deal_price || 0;
    const amountVnd = Math.round(amountUsd * 25400);
    const memo = `THANH TOAN ${String(pastInvoice.invoice_code || '').replace(/[^a-zA-Z0-9]/g, ' ').toUpperCase()}`.trim();
    const qrUrl = `https://img.vietqr.io/image/970422-0901234567-compact2.png?amount=${amountVnd}&addInfo=${encodeURIComponent(memo)}&accountName=GALLERY%20BINH%20MINH`;

    setCompletedPaymentBundle({
      invoice: pastInvoice,
      vietqr: pastInvoice.vietqr || {
        bank_id: '970422', bank_name: 'MBBank', account_no: '0901234567',
        account_name: 'GALLERY BINH MINH', amount_usd: amountUsd,
        exchange_rate: 25400, amount_vnd: amountVnd, memo, qr_image_url: qrUrl
      }
    });
    setIsVietQrOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#DFCBAA] rounded-xl shadow-2xl w-full max-w-[95vw] lg:max-w-6xl xl:max-w-7xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-98 duration-150"
        onClick={(e) => e.stopPropagation()}
        data-testid="customer-detail-modal"
      >
        {/* 1. Modal Top Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#FAF8F5] border-b border-[#EAE5D9]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#7D1818] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <User className="w-3.5 h-3.5 text-[#F4E5B8]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="font-serif text-[13.5px] sm:text-[14px] font-bold text-stone-900 leading-tight truncate">
                  {formData.ho_ten || customer?.ho_ten || 'Hồ Sơ Khách Hàng'}
                </h3>
                <span className="font-mono text-[9.5px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 shrink-0 font-bold">
                  KH-{customerId}
                </span>
                {formData.so_dien_thoai && (
                  <span className="text-[11px] font-mono text-stone-600 font-semibold shrink-0">
                    📞 {formData.so_dien_thoai}
                  </span>
                )}
                {formData.ngay_hen && (
                  <span className="text-[10px] sm:text-[10.5px] font-mono text-[#7D1818] bg-rose-50 px-1.5 py-0.2 border border-rose-200 rounded shrink-0">
                    🗓️ {formData.ngay_hen.replace('T', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-md hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng modal"
              data-testid="customer-detail-modal__btn-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Navigation Sub-Tabs */}
        <div className="flex items-center justify-between px-3.5 pt-1.5 border-b border-[#EAE5D9] bg-white">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
              className={`h-[30px] px-3 text-[11px] font-bold rounded-t-md transition-all flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
                activeTab === 'workspace' || activeTab === 'interests'
                  ? 'border-[#7D1818] text-[#7D1818] bg-[#FAF8F5]'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
              data-testid="customer-detail-modal__tab-workspace"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Workspace & Giỏ hàng ({cartItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`h-[30px] px-3 text-[11px] font-bold rounded-t-md transition-all flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
                activeTab === 'info'
                  ? 'border-[#7D1818] text-[#7D1818] bg-[#FAF8F5]'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
              data-testid="customer-detail-modal__tab-info"
            >
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <span>Thông tin & Lịch hẹn</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`h-[30px] px-3 text-[11px] font-bold rounded-t-md transition-all flex items-center gap-1.5 border-b-2 cursor-pointer shrink-0 ${
                activeTab === 'invoices'
                  ? 'border-[#7D1818] text-[#7D1818] bg-[#FAF8F5]'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
              data-testid="customer-detail-modal__tab-invoices"
            >
              <Receipt className="w-3.5 h-3.5 text-stone-500" />
              <span>Lịch sử đơn hàng ({invoices.length})</span>
            </button>
          </div>
        </div>

        {/* 3. Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
          {modalError && (
            <div className="p-2.5 bg-red-50 text-red-700 text-[11.5px] rounded-md border border-red-200 flex items-center gap-1.5 font-semibold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {initialLoading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-[#7D1818] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-[11.5px] text-stone-500">Đang tải dữ liệu khách hàng...</span>
            </div>
          ) : (
            <>
              {/* Tab 1: 2-Column Deal Workspace */}
              {(activeTab === 'workspace' || activeTab === 'interests') && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  <div className="lg:col-span-7 xl:col-span-7 min-w-0">
                    <DealCartColumn
                      cartItems={cartItems}
                      paintings={paintings}
                      onAddToCart={addToCart}
                      onUpdateDealPrice={updateDealPrice}
                      onApplyDiscount={applyDiscountPercent}
                      onUpdateNote={updateItemNote}
                      onRemoveItem={removeFromCart}
                      onClearCart={clearCart}
                      onOpenLightbox={onOpenLightbox}
                    />
                  </div>
                  <div className="lg:col-span-5 xl:col-span-5 min-w-0 lg:sticky lg:top-0">
                    <DealSummaryColumn
                      cartItems={cartItems}
                      calculations={calculations}
                      invoiceCode={invoiceCode}
                      setInvoiceCode={setInvoiceCode}
                      paymentMethod={paymentMethod}
                      setPaymentMethod={setPaymentMethod}
                      dealNotes={dealNotes}
                      setDealNotes={setDealNotes}
                      onCheckout={handleExecuteCheckout}
                      isCheckingOut={isCheckingOut}
                      error={checkoutError}
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Profile & Appointment */}
              {activeTab === 'info' && (
                <CustomerInfoTab
                  formData={formData}
                  setFormData={setFormData}
                  onSave={handleSaveCustomerProfile}
                  saving={saving}
                />
              )}

              {/* Tab 3: Past Invoices */}
              {activeTab === 'invoices' && (
                <CustomerInvoicesTab
                  customerId={customerId}
                  invoices={invoices}
                  loading={invoicesLoading}
                  onOpenVietQr={handleOpenPastVietQr}
                />
              )}
            </>
          )}
        </div>

        {/* 4. Modal Footer */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-[#EAE5D9] bg-[#FAF8F5]">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ khách "${formData.ho_ten || customer?.ho_ten}"?`)) {
                if (onCustomerDeleted) onCustomerDeleted(customerId);
                onClose();
              }
            }}
            className="h-[32px] px-2.5 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
            data-testid="customer-detail-modal__btn-delete-customer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa Khách</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[32px] px-3.5 text-[11px] font-semibold text-stone-600 bg-white hover:bg-stone-50 border border-[#EAE5D9] rounded-md transition-colors cursor-pointer"
              data-testid="customer-detail-modal__btn-footer-close"
            >
              Đóng
            </button>
            {activeTab === 'info' && (
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveCustomerProfile}
                className="h-[34px] px-3.5 text-[11.5px] font-bold text-white bg-[#7D1818] hover:bg-[#691212] rounded-md transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                data-testid="customer-detail-modal__btn-footer-save"
              >
                <Save className="w-3.5 h-3.5 text-[#F4E5B8]" />
                <span>{saving ? 'Đang lưu...' : 'Lưu Thông Tin'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VietQR Payment Modal */}
      {isVietQrOpen && completedPaymentBundle && (
        <VietQrPaymentModal
          isOpen={isVietQrOpen}
          onClose={() => setIsVietQrOpen(false)}
          invoice={completedPaymentBundle.invoice}
          vietqr={completedPaymentBundle.vietqr}
          onPaymentConfirmed={async () => {
            fetchCustomerInvoices();
            if (onCustomerUpdated) onCustomerUpdated();
          }}
        />
      )}
    </div>
  );
}
