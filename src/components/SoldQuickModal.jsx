import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  DollarSign,
  Calendar,
  User,
  FileText,
  Sparkles,
  Tag
} from 'lucide-react';
import { formatUSD } from '../types';

function getTodayDDMMYYYY() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function SoldQuickModal({
  isOpen,
  onClose,
  painting,
  onConfirm
}) {
  // Auto-filled fields
  const [maTranh, setMaTranh] = useState('');
  const [tenTacPham, setTenTacPham] = useState('');
  const [tacGia, setTacGia] = useState('');
  const [chatLieu, setChatLieu] = useState('');
  const [kichThuoc, setKichThuoc] = useState('');
  const [namSangTac, setNamSangTac] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [buyer, setBuyer] = useState('');
  const [cert, setCert] = useState('');

  // Manual entry fields (Price & Invoice left blank as requested)
  const [soldPrice, setSoldPrice] = useState('');
  const [invoice, setInvoice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (painting && isOpen) {
      setMaTranh(painting.id || '');
      setTenTacPham(painting.ten_tac_pham || '');
      setTacGia(painting.tac_gia || '');
      setChatLieu(painting.chat_lieu || '');
      setKichThuoc(painting.kich_thuoc_tranh || '');
      setNamSangTac(painting.nam_sang_tac || '');
      setSaleDate(getTodayDDMMYYYY());
      setBuyer(painting.khach_hang || '');
      setCert(painting.giay_chung_nhan || 'Yes');

      // Price & Invoice MUST be left blank for user to fill manually
      setSoldPrice('');
      setInvoice('');
      setError('');
    }
  }, [painting, isOpen]);

  if (!isOpen || !painting) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (String(soldPrice).trim() === '') {
      setError('Vui lòng nhập Giá bán thực tế ($ USD).');
      return;
    }
    if (!String(invoice).trim()) {
      setError('Vui lòng nhập Mã hoá đơn giao dịch.');
      return;
    }

    const numericPrice = Number(soldPrice);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setError('Giá bán không hợp lệ.');
      return;
    }

    onConfirm({
      tinh_trang: 'da_ban',
      ten_tac_pham: tenTacPham.trim() || painting.ten_tac_pham,
      tac_gia: tacGia.trim() || painting.tac_gia,
      chat_lieu: chatLieu.trim() || painting.chat_lieu,
      kich_thuoc_tranh: kichThuoc.trim() || painting.kich_thuoc_tranh,
      nam_sang_tac: namSangTac.trim() || painting.nam_sang_tac,
      gia: numericPrice,
      ngay_ban: saleDate.trim() || getTodayDDMMYYYY(),
      hoa_don: invoice.trim(),
      khach_hang: buyer.trim(),
      giay_chung_nhan: cert
    });
  };

  const thumb = painting.thumbnail_url || (painting.hinh_anh && painting.hinh_anh[0]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-[#C5A059] rounded-xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800 bg-[#1C1917] text-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C5A059] text-[#1C1917] flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#FAF8F5] uppercase tracking-wide">
                Xác Nhận Bán Tác Phẩm (Chuyển Sang Tab Đã Bán)
              </h3>
              <p className="text-[11px] text-stone-400">
                Thông tin tác phẩm & Ngày bán đã được tự động điền • Vui lòng nhập Giá bán & Mã hoá đơn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 text-[12px] font-medium rounded-md">
              {error}
            </div>
          )}

          {/* Section 1: Auto-filled Artwork Info Summary */}
          <div className="p-3.5 bg-[#FAF8F5] border border-[#EAE5D9] rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#EAE5D9] pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#9E7A36]" />
                <span>Thông Tin Tác Phẩm & Ngày Bán (Tự Động Điền)</span>
              </span>
              <span className="px-2 py-0.5 bg-[#252016] text-[#C5A059] font-mono text-[11px] font-bold rounded">
                {maTranh}
              </span>
            </div>

            <div className="flex items-start gap-3">
              {thumb && (
                <img
                  src={thumb}
                  alt={tenTacPham}
                  className="w-16 h-16 object-cover rounded border border-stone-300 shrink-0 bg-white"
                />
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1">
                <div>
                  <label className="text-[10.5px] font-semibold text-stone-500 block mb-0.5">
                    Mã Tranh
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={maTranh}
                    className="w-full h-[30px] px-2 text-[11.5px] font-mono font-bold bg-stone-200/70 text-stone-800 border border-stone-300 rounded cursor-not-allowed"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10.5px] font-semibold text-stone-500 block mb-0.5">
                    Tên Tác Phẩm
                  </label>
                  <input
                    type="text"
                    value={tenTacPham}
                    onChange={(e) => setTenTacPham(e.target.value)}
                    className="w-full h-[30px] px-2 text-[11.5px] font-serif font-bold bg-white text-stone-900 border border-[#EAE5D9] rounded"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-stone-500 block mb-0.5">
                    Họa Sĩ
                  </label>
                  <input
                    type="text"
                    value={tacGia}
                    onChange={(e) => setTacGia(e.target.value)}
                    className="w-full h-[30px] px-2 text-[11.5px] bg-white text-stone-800 border border-[#EAE5D9] rounded"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-stone-500 block mb-0.5">
                    Chất Liệu
                  </label>
                  <input
                    type="text"
                    value={chatLieu}
                    onChange={(e) => setChatLieu(e.target.value)}
                    className="w-full h-[30px] px-2 text-[11.5px] bg-white text-stone-800 border border-[#EAE5D9] rounded"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-stone-500 block mb-0.5">
                    Kích Thước Tranh
                  </label>
                  <input
                    type="text"
                    value={kichThuoc}
                    onChange={(e) => setKichThuoc(e.target.value)}
                    className="w-full h-[30px] px-2 text-[11.5px] bg-white text-stone-800 border border-[#EAE5D9] rounded"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 flex items-center gap-1 mb-0.5">
                  <Calendar className="w-3 h-3 text-[#9E7A36]" />
                  <span>Ngày Bán (DD-MM-YYYY)</span>
                </label>
                <input
                  type="text"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  className="w-full h-[32px] px-2.5 text-[12px] font-mono font-semibold bg-white border border-[#EAE5D9] rounded"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-700 flex items-center gap-1 mb-0.5">
                  <User className="w-3 h-3 text-[#9E7A36]" />
                  <span>Khách Hàng / Nhà Sưu Tập</span>
                </label>
                <input
                  type="text"
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                  placeholder="Tên khách hàng (nếu có)..."
                  className="w-full h-[32px] px-2.5 text-[12px] bg-white border border-[#EAE5D9] rounded"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">
                  Giấy Chứng Nhận
                </label>
                <select
                  value={cert}
                  onChange={(e) => setCert(e.target.value)}
                  className="w-full h-[32px] px-2 text-[12px] bg-white border border-[#EAE5D9] rounded"
                >
                  <option value="Yes">Yes (Đã cấp)</option>
                  <option value="No">No (Chưa cấp)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Manual Input Fields (Giá Bán & Mã Hoá Đơn) */}
          <div className="p-4 bg-amber-50/70 border-2 border-[#C5A059] rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-amber-950">
                Thông Tin Chốt Giao Dịch (Nhập Tay Bắt Buộc)
              </span>
              {painting.gia !== null && painting.gia !== undefined && painting.gia !== '' && (
                <button
                  type="button"
                  onClick={() => setSoldPrice(String(painting.gia))}
                  className="text-[11px] font-semibold text-[#7D1818] hover:underline flex items-center gap-1"
                >
                  <span>Giá niêm yết: {formatUSD(painting.gia)} (Nhấn để điền nhanh)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sold Price (Left Empty by Default) */}
              <div>
                <label className="text-[11.5px] font-bold text-stone-900 flex items-center gap-1 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-[#7D1818]" />
                  <span>Giá Bán Thực Tế ($ USD) *</span>
                </label>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(e.target.value)}
                  placeholder="Nhập giá bán ($ USD)..."
                  className="w-full h-[38px] px-3 text-[13px] font-mono font-bold bg-white border-2 border-amber-400 focus:border-[#7D1818] rounded-md focus:outline-none"
                />
              </div>

              {/* Invoice Code (Left Empty by Default) */}
              <div>
                <label className="text-[11.5px] font-bold text-stone-900 flex items-center gap-1 mb-1">
                  <FileText className="w-3.5 h-3.5 text-[#7D1818]" />
                  <span>Mã Hoá Đơn *</span>
                </label>
                <input
                  type="text"
                  required
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                  placeholder="Nhập mã hoá đơn (VD: HD-2026-001)..."
                  className="w-full h-[38px] px-3 text-[13px] font-mono font-bold bg-white border-2 border-amber-400 focus:border-[#7D1818] rounded-md focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EAE5D9]">
            <button
              type="button"
              onClick={onClose}
              className="h-[34px] px-4 text-[12px] font-semibold text-stone-600 bg-white hover:bg-stone-100 border border-[#EAE5D9] rounded-md"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="h-[34px] px-5 text-[12px] font-bold text-[#FAF8F5] bg-[#7D1818] hover:bg-[#5e1111] rounded-md transition-colors shadow-md flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#F4E5B8]" />
              <span>Xác Nhận Đã Bán & Chuyển Tab</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
