import React, { useState } from 'react';
import { X, UserPlus, Calendar, Phone, FileText, Check } from 'lucide-react';

export default function QuickAddCustomerModal({
  isOpen,
  onClose,
  onSave
}) {
  const [formData, setFormData] = useState({
    ho_ten: '',
    so_dien_thoai: '',
    ngay_hen: '',
    ghi_chu: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.ho_ten.trim()) {
      setError('Vui lòng nhập tên khách hàng');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(formData);
      setFormData({ ho_ten: '', so_dien_thoai: '', ngay_hen: '', ghi_chu: '' });
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi lưu thông tin khách hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#EAE5D9] rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EAE5D9] bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#7D1818]/10 text-[#7D1818] flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-stone-900">
                Tạo Khách Hàng Nhanh
              </h3>
              <p className="text-[11px] text-stone-500">
                Nhập nhanh thông tin khách ghé thăm phòng tranh
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 text-[11.5px] rounded border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="text-[11.5px] font-semibold text-stone-700 block mb-1">
              Tên Khách Hàng *
            </label>
            <input
              type="text"
              autoFocus
              required
              placeholder="VD: Anh Tuấn, Chị Lan..."
              value={formData.ho_ten}
              onChange={(e) => setFormData({ ...formData, ho_ten: e.target.value })}
              className="w-full h-[34px] px-3 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md focus:outline-none focus:border-[#7D1818] font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11.5px] font-semibold text-stone-700 block mb-1">
                Số Điện Thoại (Tùy chọn)
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="tel"
                  placeholder="09..."
                  value={formData.so_dien_thoai}
                  onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })}
                  className="w-full h-[34px] pl-8 pr-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md focus:outline-none focus:border-[#7D1818]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11.5px] font-semibold text-stone-700 block mb-1">
                Lịch Hẹn Tới (Tùy chọn)
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="datetime-local"
                  value={formData.ngay_hen}
                  onChange={(e) => setFormData({ ...formData, ngay_hen: e.target.value })}
                  className="w-full h-[34px] pl-8 pr-2 text-[11px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md focus:outline-none focus:border-[#7D1818]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11.5px] font-semibold text-stone-700 block mb-1">
              Ghi Chú Nhu Cầu / Gu Tranh (Tùy chọn)
            </label>
            <textarea
              rows="3"
              placeholder="VD: Thích tranh sơn mài khổ lớn, ngân sách khoảng $3000..."
              value={formData.ghi_chu}
              onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
              className="w-full p-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md focus:outline-none focus:border-[#7D1818]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE5D9]">
            <button
              type="button"
              onClick={onClose}
              className="h-[34px] px-3.5 text-[11.5px] font-semibold text-stone-600 bg-white hover:bg-stone-50 border border-[#EAE5D9] rounded-md"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-[34px] px-4 text-[11.5px] font-bold text-white bg-[#7D1818] hover:bg-[#691212] rounded-md transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-[#F4E5B8]" />
              <span>{loading ? 'Đang lưu...' : 'Lưu Hồ Sơ Khách'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
