import React, { useState, useMemo } from 'react';
import { X, Upload, Plus, Trash2, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { formatUSD } from '../types';

function getTodayDDMMYYYY() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function normStr(str) {
  return String(str || '')
    .normalize('NFC')
    .trim()
    .toLowerCase();
}

function buildArtistPrefix(artistName, mediumName) {
  const words = String(artistName || 'Dương Văn Sen')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const artistCode = words.length > 0 ? words.map(w => w[0].toUpperCase()).join('') : 'BMA';
  const medLower = String(mediumName || '').toLowerCase();
  const medCode = medLower.includes('sơn dầu')
    ? 'SD'
    : medLower.includes('sơn mài')
    ? 'SM'
    : medLower.includes('lụa')
    ? 'LUA'
    : 'ART';
  return `${artistCode}-${medCode}`;
}

export default function AddPaintingModal({
  isOpen,
  onClose,
  onSave,
  existingArtists = [],
  existingPaintings = []
}) {
  const today = getTodayDDMMYYYY();

  const computeNextSku = (artistName, mediumName) => {
    const prefix = buildArtistPrefix(artistName, mediumName);
    const matchingCount = existingPaintings.filter(p =>
      String(p.id || '').toUpperCase().startsWith(prefix + '-')
    ).length;
    return `${prefix}-${String(matchingCount + 1).padStart(2, '0')}`;
  };

  const [customIdEdited, setCustomIdEdited] = useState(false);
  const [conflictResolution, setConflictResolution] = useState('overwrite'); // 'keep_original' | 'overwrite'
  const [formData, setFormData] = useState({
    id: computeNextSku('Dương Văn Sen', 'Sơn mài'),
    ten_tac_pham: '',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    location: 'Kho',
    ngay_them: today,
    gia: '',
    ngay_cap_nhat_gia_gan_nhat: today,
    kich_thuoc_tranh: '',
    kich_thuoc_khung_tranh: '',
    nam_sang_tac: new Date().getFullYear().toString(),
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: '',
    hoa_don: '',
    giay_chung_nhan: '',
    ghi_chu: ''
  });

  const [images, setImages] = useState([]); // array of preview urls or uploaded urls
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const detectedDuplicate = useMemo(() => {
    if (!Array.isArray(existingPaintings) || existingPaintings.length === 0) return null;
    const idKey = normStr(formData.id);
    if (idKey) {
      const byId = existingPaintings.find(p => normStr(p.id) === idKey);
      if (byId) return byId;
    }
    const titleKey = normStr(formData.ten_tac_pham);
    const artistKey = normStr(formData.tac_gia);
    const sizeKey = normStr(formData.kich_thuoc_tranh).replace(/\s+/g, '');
    if (!titleKey || !sizeKey) return null;

    return (
      existingPaintings.find(p => {
        const pt = normStr(p.ten_tac_pham);
        const pa = normStr(p.tac_gia);
        const ps = normStr(p.kich_thuoc_tranh).replace(/\s+/g, '');
        return pt === titleKey && ps === sizeKey && (!artistKey || !pa || pa === artistKey);
      }) || null
    );
  }, [formData.id, formData.ten_tac_pham, formData.tac_gia, formData.kich_thuoc_tranh, existingPaintings]);

  if (!isOpen) return null;

  const handleChange = (field, val) => {
    setFormData(prev => {
      const next = { ...prev, [field]: val };
      if (!customIdEdited && (field === 'tac_gia' || field === 'chat_lieu')) {
        next.id = computeNextSku(
          field === 'tac_gia' ? val : prev.tac_gia,
          field === 'chat_lieu' ? val : prev.chat_lieu
        );
      }
      return next;
    });
    if (field === 'id') {
      setCustomIdEdited(true);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    const data = new FormData();
    files.forEach(f => data.append('images', f));

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: data
      });
      const json = await res.json();
      if (json.success && json.files) {
        const newUrls = json.files.map(f => f.url);
        setImages(prev => [...prev, ...newUrls]);
      } else {
        setError(json.message || 'Lỗi khi tải ảnh lên');
      }
    } catch (err) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.ten_tac_pham.trim() && !(detectedDuplicate && conflictResolution === 'keep_original')) {
      setError('Vui lòng nhập tên tác phẩm');
      return;
    }

    const payload = {
      ...formData,
      gia: formData.gia !== '' ? Number(formData.gia) : null,
      hinh_anh: images,
      ngay_ban: formData.tinh_trang === 'da_ban' ? (formData.ngay_ban || today) : null,
      ...(detectedDuplicate ? { conflict_resolution: conflictResolution } : {})
    };

    onSave(payload);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-[#EAE5D9] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#EAE5D9] bg-[#FAF8F5]">
          <div>
            <h3 className="font-serif text-base font-semibold text-stone-900">
              Nhập Kho Tác Phẩm Hội Hoạ Mới
            </h3>
            <p className="text-[11px] text-stone-500">
              Điền chi tiết thông tin và tải ảnh tác phẩm để đưa vào quản lý kho
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 text-[11.5px] rounded-md">
              {error}
            </div>
          )}

          {/* Duplicate Detection Warning Banner */}
          {detectedDuplicate && (
            <div className="p-3 bg-amber-50 border-2 border-amber-400 space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11.5px] text-amber-950">
                  <div className="font-bold">
                    Cảnh Báo Trùng Lặp: Tác phẩm này trùng với mã{' '}
                    <span className="font-mono text-[#7D1818]">{detectedDuplicate.id}</span> đang có trong kho!
                  </div>
                  <div className="text-[11px] text-amber-900 mt-0.5">
                    Bản gốc: <strong>{detectedDuplicate.ten_tac_pham}</strong> • {detectedDuplicate.tac_gia} •{' '}
                    {detectedDuplicate.kich_thuoc_tranh || '—'} • Giá: {formatUSD(detectedDuplicate.gia)} • Ngày cập nhật cũ:{' '}
                    <strong>{detectedDuplicate.ngay_cap_nhat_san_pham || '—'}</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConflictResolution('keep_original')}
                  className={`h-[32px] px-3 text-[11px] font-bold border cursor-pointer ${
                    conflictResolution === 'keep_original'
                      ? 'bg-stone-800 text-white border-stone-900'
                      : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Giữ Bản Gốc (Không ghi đè)
                </button>
                <button
                  type="button"
                  onClick={() => setConflictResolution('overwrite')}
                  className={`h-[32px] px-3 text-[11px] font-bold border cursor-pointer ${
                    conflictResolution === 'overwrite'
                      ? 'bg-[#7D1818] text-white border-[#7D1818]'
                      : 'bg-white text-[#7D1818] border-[#7D1818] hover:bg-red-50'
                  }`}
                >
                  Thay Thế (Ghi đè & Cập nhật ngày = {today})
                </button>
              </div>
            </div>
          )}

          {/* Image Uploader */}
          <div>
            <label className="text-[11.5px] font-semibold text-stone-800 block mb-1">
              Hình Ảnh Tác Phẩm (Ảnh chính đại diện + Ảnh chụp cận cảnh/chữ ký)
            </label>
            <div className="flex flex-wrap gap-2.5 items-center">
              {images.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-md overflow-hidden border border-[#EAE5D9] group bg-stone-50">
                  <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-stone-900/80 text-[9px] text-[#FAF8F5] text-center py-0.5 font-medium">
                      Ảnh chính
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <label className="w-20 h-20 border-2 border-dashed border-[#DDD5C4] hover:border-stone-500 rounded-md flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#FAF8F5]">
                <Upload className="w-4 h-4 text-stone-400 mb-1" />
                <span className="text-[10px] font-medium text-stone-600">
                  {uploading ? 'Đang tải...' : '+ Thêm ảnh'}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Row 1: Code, Title, Artist */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Mã Tác Phẩm</label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => handleChange('id', e.target.value)}
                className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Tên Tác Phẩm *</label>
              <input
                type="text"
                required
                value={formData.ten_tac_pham}
                onChange={(e) => handleChange('ten_tac_pham', e.target.value)}
                placeholder="VD: Hoa mùa hạ, Thiếu nữ..."
                className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Họa Sĩ / Tác Giả</label>
              <input
                type="text"
                list="artist-datalist"
                value={formData.tac_gia}
                onChange={(e) => handleChange('tac_gia', e.target.value)}
                placeholder="Chọn hoặc gõ tên họa sĩ mới..."
                className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
              />
              <datalist id="artist-datalist">
                {existingArtists.map((artist) => (
                  <option key={artist} value={artist} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Row 2: Medium, Location, Price, Year */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Chất Liệu</label>
              <select
                value={formData.chat_lieu}
                onChange={(e) => handleChange('chat_lieu', e.target.value)}
                className="w-full h-[32px] px-2 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
              >
                <option value="Sơn mài">Sơn mài</option>
                <option value="Sơn dầu">Sơn dầu</option>
                <option value="Lụa">Lụa</option>
                <option value="Màu nước">Màu nước</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                Vị Trí Hiện Tại
              </label>
              <input
                type="text"
                list="location-datalist"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="VD: Kho, Khu vực 1..."
                className="w-full h-[32px] px-2 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md font-medium"
              />
              <datalist id="location-datalist">
                <option value="Kho" />
                <option value="Phòng khách" />
                <option value="Khu vực 1" />
                <option value="Khu vực 2" />
                <option value="Hành lang" />
                <option value="Phòng trưng bày" />
              </datalist>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                Giá Bán ($ USD)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.gia}
                onChange={(e) => handleChange('gia', e.target.value)}
                placeholder="VD: 2000"
                className="w-full h-[32px] px-2 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                Năm Sáng Tác
              </label>
              <input
                type="text"
                value={formData.nam_sang_tac}
                onChange={(e) => handleChange('nam_sang_tac', e.target.value)}
                placeholder="VD: 2025"
                className="w-full h-[32px] px-2 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
              />
            </div>
          </div>

          {/* Row 3: Dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Kích Thước Tranh</label>
              <input
                type="text"
                value={formData.kich_thuoc_tranh}
                onChange={(e) => handleChange('kich_thuoc_tranh', e.target.value)}
                placeholder="VD: 80x60cm hoặc H100"
                className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Kích Thước & Loại Khung</label>
              <input
                type="text"
                value={formData.kich_thuoc_khung_tranh}
                onChange={(e) => handleChange('kich_thuoc_khung_tranh', e.target.value)}
                placeholder="VD: 92x72cm (Khung gỗ sồi) hoặc Chưa lên khung"
                className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
              />
            </div>
          </div>

          {/* Row 4: Status & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Tình Trạng</label>
              <select
                value={formData.tinh_trang}
                onChange={(e) => handleChange('tinh_trang', e.target.value)}
                className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
              >
                <option value="chua_ban">Chưa bán (Đang trưng bày)</option>
                <option value="da_ban">Đã bán</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Ngày Mua Vào / Ký Gửi</label>
              <input
                type="date"
                value={formData.ngay_mua_vao}
                onChange={(e) => handleChange('ngay_mua_vao', e.target.value)}
                className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Giấy Chứng Nhận</label>
              <select
                value={formData.giay_chung_nhan}
                onChange={(e) => handleChange('giay_chung_nhan', e.target.value)}
                className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
              >
                <option value="Yes">Yes (Có chứng nhận)</option>
                <option value="No">No (Chưa có)</option>
              </select>
            </div>
          </div>

          {/* Extra fields if Sold */}
          {formData.tinh_trang === 'da_ban' && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
              <div>
                <label className="text-[11px] font-semibold text-amber-900 block mb-1">Khách Hàng</label>
                <input
                  type="text"
                  value={formData.khach_hang}
                  onChange={(e) => handleChange('khach_hang', e.target.value)}
                  placeholder="Tên khách hàng"
                  className="w-full h-[32px] px-2.5 text-[12px] bg-white border border-amber-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-amber-900 block mb-1">Ngày Bán</label>
                <input
                  type="date"
                  value={formData.ngay_ban}
                  onChange={(e) => handleChange('ngay_ban', e.target.value)}
                  className="w-full h-[32px] px-2.5 text-[12px] bg-white border border-amber-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-amber-900 block mb-1">Hoá Đơn</label>
                <input
                  type="text"
                  value={formData.hoa_don}
                  onChange={(e) => handleChange('hoa_don', e.target.value)}
                  placeholder="Mã hoá đơn"
                  className="w-full h-[32px] px-2.5 text-[12px] bg-white border border-amber-300 rounded-md"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold text-stone-700 block mb-1">Ghi Chú Nghệ Thuật</label>
            <textarea
              rows="2"
              value={formData.ghi_chu}
              onChange={(e) => handleChange('ghi_chu', e.target.value)}
              placeholder="Ghi chú chi tiết về kỹ thuật vẽ, chất liệu, ý nghĩa hoặc nguồn gốc tác phẩm..."
              className="w-full p-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md focus:outline-none focus:border-stone-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE5D9]">
            <button
              type="button"
              onClick={onClose}
              className="h-[32px] px-3.5 text-[11.5px] font-medium text-stone-600 bg-white hover:bg-stone-50 border border-[#EAE5D9] rounded-md"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="h-[32px] px-5 text-[11.5px] font-semibold text-white bg-[#252016] hover:bg-stone-800 rounded-md transition-colors shadow-sm cursor-pointer"
            >
              {detectedDuplicate
                ? conflictResolution === 'keep_original'
                  ? 'Giữ Nguyên Bản Gốc & Đóng'
                  : `Thay Thế & Cập Nhật Ngày (${today})`
                : 'Hoàn Tất Nhập Kho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
