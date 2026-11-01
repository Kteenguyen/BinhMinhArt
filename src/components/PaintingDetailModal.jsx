import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, Calendar, DollarSign, Image as ImageIcon, Save, ExternalLink, MapPin, History, Plus } from 'lucide-react';
import { formatUSD, formatDateVN } from '../types';

export default function PaintingDetailModal({
  isOpen,
  onClose,
  painting,
  onSave,
  onDelete,
  onOpenLightbox
}) {
  const [formData, setFormData] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'history'
  const [locationHistory, setLocationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [newLocationNote, setNewLocationNote] = useState('');
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([
    'Kho',
    'Phòng khách',
    'Khu vực 1',
    'Khu vực 2',
    'Hành lang',
    'Phòng trưng bày'
  ]);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newCustomLocation, setNewCustomLocation] = useState('');

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAvailableLocations(json.data);
      }
    } catch (e) {
      console.warn('Could not fetch locations:', e);
    }
  };

  const handleAddNewLocation = async () => {
    const trimmed = newCustomLocation.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAvailableLocations(json.data);
      } else {
        setAvailableLocations(prev => Array.from(new Set([...prev, trimmed])));
      }
      handleChange('location', trimmed);
      setNewCustomLocation('');
      setIsAddingLocation(false);
    } catch (e) {
      setAvailableLocations(prev => Array.from(new Set([...prev, trimmed])));
      handleChange('location', trimmed);
      setNewCustomLocation('');
      setIsAddingLocation(false);
    }
  };

  const fetchHistory = async (paintingId) => {
    if (!paintingId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/paintings/${encodeURIComponent(paintingId)}/location-history`);
      const json = await res.json();
      if (json.success) {
        setLocationHistory(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch location history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (painting) {
      setFormData({ ...painting, location: painting.location || 'Kho' });
      setNewLocationInput('');
      setNewLocationNote('');
      setSelectedImageIdx(0);
      setError(null);
      setIsDeleting(false);
      setActiveTab('info');
      fetchHistory(painting.id);
      fetchLocations();
    }
  }, [painting]);

  if (!isOpen || !formData) return null;

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
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
        setFormData(prev => ({
          ...prev,
          hinh_anh: [...(prev.hinh_anh || []), ...newUrls]
        }));
      }
    } catch (err) {
      setError(err.message || 'Lỗi tải ảnh');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (idx) => {
    setFormData(prev => {
      const updated = (prev.hinh_anh || []).filter((_, i) => i !== idx);
      return { ...prev, hinh_anh: updated };
    });
    if (selectedImageIdx >= idx && selectedImageIdx > 0) {
      setSelectedImageIdx(prev => prev - 1);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      gia: formData.gia !== '' && formData.gia !== null ? Number(formData.gia) : null
    };
    onSave(payload);
  };

  const currentImg = formData.hinh_anh && formData.hinh_anh.length > 0 
    ? formData.hinh_anh[selectedImageIdx] || formData.hinh_anh[0]
    : null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-[#EAE5D9] rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Artwork Visual & Gallery */}
        <div className="md:w-1/2 bg-[#1A1815] p-4 flex flex-col justify-between text-white border-b md:border-b-0 md:border-r border-stone-800">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059]">
                {formData.id}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                formData.tinh_trang === 'da_ban'
                  ? 'bg-amber-900/60 text-amber-200 border border-amber-700/50'
                  : 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/50'
              }`}>
                {formData.tinh_trang === 'da_ban' ? 'Đã bán' : 'Đang trưng bày'}
              </span>
            </div>

            {/* Main preview */}
            <div className="relative aspect-[4/3] bg-black/40 rounded-lg overflow-hidden flex items-center justify-center border border-white/10 group">
              {currentImg ? (
                <>
                  <img
                    src={currentImg}
                    alt={formData.ten_tac_pham}
                    className="max-h-full max-w-full object-contain cursor-pointer"
                    onClick={() => onOpenLightbox(currentImg, formData.ten_tac_pham, `${formData.tac_gia} — ${formData.kich_thuoc_tranh}`)}
                  />
                  <button
                    type="button"
                    onClick={() => onOpenLightbox(currentImg, formData.ten_tac_pham, `${formData.tac_gia} — ${formData.kich_thuoc_tranh}`)}
                    className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 hover:bg-black/90 text-white text-[10.5px] rounded backdrop-blur flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Xem phóng to HD</span>
                  </button>
                </>
              ) : (
                <div className="text-center text-stone-500">
                  <ImageIcon className="w-10 h-10 mx-auto mb-1 opacity-50" />
                  <span className="text-[11px]">Chưa có hình ảnh</span>
                </div>
              )}
            </div>

            {/* Thumbnails list */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
              {(formData.hinh_anh || []).map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`relative w-14 h-14 rounded overflow-hidden shrink-0 border-2 cursor-pointer transition-all ${
                    selectedImageIdx === idx ? 'border-[#C5A059] scale-105' : 'border-stone-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(idx);
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/80 hover:bg-red-600 rounded text-white"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              <label className="w-14 h-14 rounded border-2 border-dashed border-stone-700 hover:border-[#C5A059] shrink-0 flex flex-col items-center justify-center cursor-pointer transition-colors text-stone-400 hover:text-white">
                <Upload className="w-3.5 h-3.5" />
                <span className="text-[9px] mt-0.5">{uploading ? '...' : '+ Thêm'}</span>
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

          <div className="pt-3 border-t border-stone-800 text-[11.5px] text-stone-400">
            <div>Giá niêm yết: <strong className="text-white font-mono text-sm">{formatUSD(formData.gia)}</strong></div>
            <div>Cập nhật giá lần cuối: <span className="text-stone-300">{formatDateVN(formData.ngay_cap_nhat_gia_gan_nhat)}</span></div>
          </div>
        </div>

        {/* Right Side: Form details */}
        <div className="md:w-1/2 flex flex-col justify-between bg-white max-h-[92vh]">
          {/* Header & Tabs */}
          <div className="px-5 pt-3 pb-2 border-b border-[#EAE5D9] bg-[#FAF8F5]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-serif text-sm font-semibold text-stone-900">
                Chi Tiết Hồ Sơ Tác Phẩm
              </h3>
              <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`h-[28px] px-3 text-[11px] font-bold rounded-md transition-colors ${
                  activeTab === 'info'
                    ? 'bg-[#7D1818] text-white shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                Hồ Sơ & Thông Tin
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`h-[28px] px-3 text-[11px] font-bold rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-[#7D1818] text-white shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                <History className="w-3.5 h-3.5 text-[#F4E5B8]" />
                <span>Nhật Ký Vị Trí ({locationHistory.length})</span>
              </button>
            </div>
          </div>

          {/* Form Fields or History Tab */}
          {activeTab === 'info' ? (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-3">
            {error && (
              <div className="p-2 bg-red-50 text-red-700 text-[11px] rounded">
                {error}
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Tên Tác Phẩm</label>
              <input
                type="text"
                required
                value={formData.ten_tac_pham || ''}
                onChange={(e) => handleChange('ten_tac_pham', e.target.value)}
                className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md font-medium"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Họa Sĩ / Tác Giả</label>
                <input
                  type="text"
                  value={formData.tac_gia || ''}
                  onChange={(e) => handleChange('tac_gia', e.target.value)}
                  className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Chất Liệu</label>
                <input
                  type="text"
                  value={formData.chat_lieu || ''}
                  onChange={(e) => handleChange('chat_lieu', e.target.value)}
                  className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-semibold text-stone-700">
                    Vị Trí
                  </label>
                  {!isAddingLocation ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingLocation(true)}
                      className="text-[10.5px] text-[#7D1818] font-bold hover:underline"
                    >
                      Thêm vị trí mới
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingLocation(false);
                        setNewCustomLocation('');
                      }}
                      className="text-[10px] text-stone-400 hover:text-stone-700"
                    >
                      Hủy
                    </button>
                  )}
                </div>

                {isAddingLocation ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Nhập tên vị trí mới..."
                      value={newCustomLocation}
                      onChange={(e) => setNewCustomLocation(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewLocation();
                        }
                      }}
                      className="flex-1 h-[32px] px-2 text-[11.5px] bg-white border border-[#7D1818] rounded focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewLocation}
                      className="h-[32px] px-2.5 bg-[#7D1818] hover:bg-[#691212] text-white text-[11px] font-bold rounded"
                    >
                      Lưu
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={formData.location || 'Kho'}
                      onChange={(e) => {
                        if (e.target.value === '__NEW_LOCATION__') {
                          setIsAddingLocation(true);
                        } else {
                          handleChange('location', e.target.value);
                        }
                      }}
                      className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md font-medium text-stone-800 focus:outline-none focus:border-[#7D1818]"
                    >
                      {availableLocations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                      {formData.location && !availableLocations.includes(formData.location) && (
                        <option value={formData.location}>{formData.location}</option>
                      )}
                      <option value="__NEW_LOCATION__" className="font-bold text-[#7D1818]">
                        + Thêm vị trí khác vào danh sách...
                      </option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Giá ($ USD)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.gia ?? ''}
                  onChange={(e) => handleChange('gia', e.target.value)}
                  placeholder="Thỏa thuận"
                  className="w-full h-[32px] px-2 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Năm Sáng Tác</label>
                <input
                  type="text"
                  value={formData.nam_sang_tac || ''}
                  onChange={(e) => handleChange('nam_sang_tac', e.target.value)}
                  className="w-full h-[32px] px-2 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Tình Trạng</label>
                <select
                  value={formData.tinh_trang}
                  onChange={(e) => handleChange('tinh_trang', e.target.value)}
                  className="w-full h-[32px] px-1.5 text-[11.5px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
                >
                  <option value="chua_ban">Chưa bán</option>
                  <option value="da_ban">Đã bán</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Kích Thước Tranh</label>
                <input
                  type="text"
                  value={formData.kich_thuoc_tranh || ''}
                  onChange={(e) => handleChange('kich_thuoc_tranh', e.target.value)}
                  className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Kích Thước Khung</label>
                <input
                  type="text"
                  value={formData.kich_thuoc_khung_tranh || ''}
                  onChange={(e) => handleChange('kich_thuoc_khung_tranh', e.target.value)}
                  className="w-full h-[32px] px-2.5 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
                />
              </div>
            </div>

            {/* Dates & Certificate */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Ngày Mua Vào</label>
                <input
                  type="date"
                  value={formData.ngay_mua_vao || ''}
                  onChange={(e) => handleChange('ngay_mua_vao', e.target.value)}
                  className="w-full h-[32px] px-1.5 text-[11px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Giấy CN</label>
                <select
                  value={formData.giay_chung_nhan || 'Yes'}
                  onChange={(e) => handleChange('giay_chung_nhan', e.target.value)}
                  className="w-full h-[32px] px-1 text-[11.5px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Ngày Thêm</label>
                <input
                  type="date"
                  value={formData.ngay_them || ''}
                  onChange={(e) => handleChange('ngay_them', e.target.value)}
                  className="w-full h-[32px] px-1.5 text-[11px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
                />
              </div>
            </div>

            {/* Transaction info if Sold */}
            {formData.tinh_trang === 'da_ban' && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-md grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10.5px] font-semibold text-amber-900 block mb-0.5">Khách Hàng</label>
                  <input
                    type="text"
                    value={formData.khach_hang || ''}
                    onChange={(e) => handleChange('khach_hang', e.target.value)}
                    className="w-full h-[30px] px-2 text-[11.5px] bg-white border border-amber-300 rounded"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-amber-900 block mb-0.5">Ngày Bán</label>
                  <input
                    type="date"
                    value={formData.ngay_ban || ''}
                    onChange={(e) => handleChange('ngay_ban', e.target.value)}
                    className="w-full h-[30px] px-1 text-[11px] bg-white border border-amber-300 rounded"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10.5px] font-semibold text-amber-900 block mb-0.5">Hoá Đơn</label>
                  <input
                    type="text"
                    value={formData.hoa_don || ''}
                    onChange={(e) => handleChange('hoa_don', e.target.value)}
                    className="w-full h-[30px] px-2 text-[11.5px] bg-white border border-amber-300 rounded"
                  />
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">Ghi Chú</label>
              <textarea
                rows="2"
                value={formData.ghi_chu || ''}
                onChange={(e) => handleChange('ghi_chu', e.target.value)}
                className="w-full p-2 text-[11.5px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
              />
            </div>
          </form>
          ) : (
            /* Tab: History Log */
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Quick Move Action */}
              <div className="p-3 bg-[#F4E5B8]/30 border border-[#C58C00]/30 rounded-lg">
                <h4 className="text-[11.5px] font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#7D1818]" />
                  <span>Chuyển Vị Trí Tranh & Ghi Nhật Ký</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10.5px] text-stone-600 block mb-0.5">Vị trí mới</label>
                    <input
                      type="text"
                      list="quick-location-list"
                      placeholder="Chọn hoặc nhập vị trí..."
                      value={newLocationInput}
                      onChange={(e) => setNewLocationInput(e.target.value)}
                      className="w-full h-[32px] px-2 text-[12px] bg-white border border-[#DDD5C4] rounded"
                    />
                    <datalist id="quick-location-list">
                      {availableLocations.map(loc => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-[10.5px] text-stone-600 block mb-0.5">Ghi chú điều chuyển</label>
                    <input
                      type="text"
                      placeholder="Lý do điều chuyển..."
                      value={newLocationNote}
                      onChange={(e) => setNewLocationNote(e.target.value)}
                      className="w-full h-[32px] px-2 text-[12px] bg-white border border-[#DDD5C4] rounded"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!newLocationInput.trim()}
                  onClick={async () => {
                    const toLoc = newLocationInput.trim();
                    if (!toLoc) return;
                    try {
                      const res = await fetch(`/api/paintings/${encodeURIComponent(formData.id)}/location-history`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          to_location: toLoc,
                          from_location: formData.location || 'Kho',
                          note: newLocationNote.trim()
                        })
                      });
                      const json = await res.json();
                      if (json.success) {
                        setFormData(prev => ({ ...prev, location: toLoc }));
                        setLocationHistory(json.history || []);
                        setNewLocationInput('');
                        setNewLocationNote('');
                        onSave && onSave({ ...formData, location: toLoc });
                      }
                    } catch (e) {
                      console.error('Failed to log location move:', e);
                    }
                  }}
                  className="h-[30px] px-3 text-[11px] font-bold text-white bg-[#7D1818] hover:bg-[#691212] rounded transition-colors disabled:opacity-50"
                >
                  Xác Nhận Chuyển Vị Trí
                </button>
              </div>

              {/* History Timeline */}
              <div>
                <h5 className="text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Lịch Sử Luân Chuyển Tác Phẩm
                </h5>
                {loadingHistory ? (
                  <div className="text-center py-6 text-[11px] text-stone-500">Đang tải nhật ký...</div>
                ) : locationHistory.length === 0 ? (
                  <div className="text-center py-6 text-[11.5px] text-stone-400 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                    Chưa có nhật ký luân chuyển nào được ghi nhận.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {locationHistory.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-2.5 bg-[#FAF8F5] border border-[#EAE5D9] rounded-md text-[11.5px] flex items-start justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                            <span className="text-stone-500">{item.from_location || '(Khởi tạo)'}</span>
                            <span>➔</span>
                            <span className="text-[#7D1818] font-bold">📍 {item.to_location}</span>
                          </div>
                          {item.note && (
                            <p className="text-stone-600 italic text-[11px]">"{item.note}"</p>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-stone-500 shrink-0 bg-stone-100 px-1.5 py-0.5 rounded">
                          {item.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#EAE5D9] bg-[#FAF8F5]">
            {isDeleting ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-red-600 font-medium">Chắc chắn xóa?</span>
                <button
                  type="button"
                  onClick={() => onDelete(formData.id)}
                  className="h-[28px] px-2 text-[11px] font-semibold bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Xóa Ngay
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleting(false)}
                  className="h-[28px] px-2 text-[11px] text-stone-600 hover:bg-stone-200 rounded"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsDeleting(true)}
                className="h-[32px] px-2.5 text-[11px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Tác Phẩm</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-[32px] px-3 text-[11.5px] font-medium text-stone-600 bg-white hover:bg-stone-50 border border-[#EAE5D9] rounded-md"
              >
                Đóng
              </button>
              <button
                onClick={handleSave}
                className="h-[32px] px-4 text-[11.5px] font-semibold text-white bg-[#252016] hover:bg-stone-800 rounded-md transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
