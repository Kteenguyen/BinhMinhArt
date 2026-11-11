// src/components/deal-workspace/CustomerInfoTab.jsx
/**
 * ==============================================================================
 * BinhMinhArt Gallery - Customer Information & Appointment Tab
 * Preserves customer profile fields (name, phone, email, address, appointment, notes)
 * High-Density Compact UX Directive: button height 32-34px, font 11-11.5px (font-weight: 600)
 * ==============================================================================
 */

import React from 'react';
import { User, Phone, Mail, MapPin, Calendar, FileText, Save } from 'lucide-react';

export default function CustomerInfoTab({
  formData,
  setFormData,
  onSave,
  saving = false
}) {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white border border-[#EAE5D9] rounded-xl p-4 sm:p-5 space-y-4 max-w-3xl mx-auto shadow-2xs">
      <div className="border-b border-[#EAE5D9] pb-2 flex items-center justify-between">
        <div>
          <h4 className="text-[13px] font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#7D1818]" />
            <span>Thông Tin Cá Nhân & Lịch Hẹn Xem Tranh</span>
          </h4>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Cập nhật thông tin liên hệ và lịch tiếp đón khách tại phòng tranh
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[11.5px]">
        {/* Full Name */}
        <div>
          <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-stone-400" />
            <span>Họ và Tên Khách Hàng <span className="text-red-500">*</span></span>
          </label>
          <input
            type="text"
            value={formData.ho_ten || ''}
            onChange={(e) => handleChange('ho_ten', e.target.value)}
            placeholder="Ví dụ: Nguyễn Văn An"
            className="w-full h-[32px] px-2.5 bg-white border border-[#DDD5C4] focus:border-[#7D1818] rounded focus:outline-none text-[11.5px] font-semibold text-stone-900"
            data-testid="customer-info__input-name"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-stone-400" />
            <span>Số Điện Thoại</span>
          </label>
          <input
            type="text"
            value={formData.so_dien_thoai || ''}
            onChange={(e) => handleChange('so_dien_thoai', e.target.value)}
            placeholder="Ví dụ: 0901234567"
            className="w-full h-[32px] px-2.5 bg-white border border-[#DDD5C4] focus:border-[#7D1818] rounded focus:outline-none text-[11.5px] font-mono font-semibold text-stone-900"
            data-testid="customer-info__input-phone"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-stone-400" />
            <span>Email Liên Hệ</span>
          </label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="Ví dụ: an.nguyen@example.com"
            className="w-full h-[32px] px-2.5 bg-white border border-[#DDD5C4] focus:border-[#7D1818] rounded focus:outline-none text-[11.5px] text-stone-900"
            data-testid="customer-info__input-email"
          />
        </div>

        {/* Appointment Date/Time */}
        <div>
          <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>Lịch Hẹn Xem Tranh</span>
          </label>
          <input
            type="datetime-local"
            value={formData.ngay_hen || ''}
            onChange={(e) => handleChange('ngay_hen', e.target.value)}
            className="w-full h-[32px] px-2.5 bg-white border border-[#DDD5C4] focus:border-[#7D1818] rounded focus:outline-none text-[11.5px] font-mono text-stone-900"
            data-testid="customer-info__input-appointment"
          />
        </div>

        {/* Address */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-stone-400" />
            <span>Địa Chỉ Giao Tranh / Liên Hệ</span>
          </label>
          <input
            type="text"
            value={formData.dia_chi || ''}
            onChange={(e) => handleChange('dia_chi', e.target.value)}
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
            className="w-full h-[32px] px-2.5 bg-white border border-[#DDD5C4] focus:border-[#7D1818] rounded focus:outline-none text-[11.5px] text-stone-900"
            data-testid="customer-info__input-address"
          />
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-stone-400" />
            <span>Ghi Chú Sở Thích Hội Họa & Gu Nghệ Thuật</span>
          </label>
          <textarea
            rows={3}
            value={formData.ghi_chu || ''}
            onChange={(e) => handleChange('ghi_chu', e.target.value)}
            placeholder="Ghi chú sở thích dòng tranh (sơn mài, sơn dầu), gu họa sĩ yêu thích, kích thước phòng khách..."
            className="w-full p-2.5 bg-white border border-[#DDD5C4] focus:border-[#7D1818] rounded focus:outline-none text-[11.5px] text-stone-900"
            data-testid="customer-info__input-notes"
          />
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="h-[34px] px-4 bg-[#7D1818] hover:bg-[#691212] text-white text-[11.5px] font-bold rounded-md flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          data-testid="customer-info__btn-save"
        >
          <Save className="w-3.5 h-3.5 text-[#F4E5B8]" />
          <span>{saving ? 'Đang lưu hồ sơ...' : 'Lưu Thông Tin Khách Hàng'}</span>
        </button>
      </div>
    </div>
  );
}
