import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Upload, Trash2, Calendar, DollarSign, Image as ImageIcon, Save, 
  ExternalLink, MapPin, History, Plus, AlertCircle, CheckCircle2, Clock, RefreshCw 
} from 'lucide-react';
import { formatUSD, formatDateVN, parseNumericPrice } from '../types';
import CurrencyInput from './ui/CurrencyInput';

export default function PaintingDetailModal({
  isOpen,
  onClose,
  painting,
  onSave,
  onDelete,
  onOpenLightbox
}) {
  const [formData, setFormData] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'history' | 'price'
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

  // --- Price History State (M2) ---
  const [priceHistory, setPriceHistory] = useState([]);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);
  const [priceHistoryError, setPriceHistoryError] = useState(null);
  const [newPriceInput, setNewPriceInput] = useState('');
  const [newPriceNote, setNewPriceNote] = useState('');
  const [quickPriceError, setQuickPriceError] = useState(null);
  const [priceSuccessMsg, setPriceSuccessMsg] = useState(null);
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);
  const isSubmittingRef = useRef(false);

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

  const fetchPriceHistory = async (paintingId) => {
    if (!paintingId) return;
    setLoadingPriceHistory(true);
    setPriceHistoryError(null);
    try {
      const res = await fetch(`/api/paintings/${encodeURIComponent(paintingId)}/price-history`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPriceHistory(json.data);
      } else {
        setPriceHistory([]);
      }
    } catch (err) {
      console.error('Failed to fetch price history:', err);
      setPriceHistoryError('Không thể tải nhật ký biến động giá. Vui lòng thử lại.');
    } finally {
      setLoadingPriceHistory(false);
    }
  };

  useEffect(() => {
    if (painting) {
      setFormData({ ...painting, location: painting.location || 'Kho' });
      setNewLocationInput('');
      setNewLocationNote('');
      setNewPriceInput('');
      setNewPriceNote('');
      setQuickPriceError(null);
      setPriceSuccessMsg(null);
      setSelectedImageIdx(0);
      setError(null);
      setIsDeleting(false);
      setActiveTab('info');
      isSubmittingRef.current = false;
      fetchHistory(painting.id);
      fetchLocations();
      fetchPriceHistory(painting.id);
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
    const parsedGia = parseNumericPrice(formData.gia);
    const initialGia = painting ? parseNumericPrice(painting.gia) : null;
    const priceChanged = parsedGia !== initialGia;

    const payload = {
      ...formData,
      gia: parsedGia
    };

    // If price changed, update date to today and include note
    if (priceChanged) {
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const todayFormatted = `${dd}-${mm}-${yyyy}`;
      payload.ngay_cap_nhat_gia_gan_nhat = todayFormatted;
      payload.price_note = `Điều chỉnh giá từ ${formatUSD(initialGia)} sang ${formatUSD(parsedGia)}`;
    }

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
        className="bg-white border border-[#EAE5D9] rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden"
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

        {/* Right Side: Form details & Tabs */}
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

            {/* Tab Navigation: Enterprise Compact Mobile UX */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                data-testid="painting-detail__tab-info"
                className={`h-[28px] px-2.5 sm:px-3 text-[11px] font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'info'
                    ? 'bg-[#7D1818] text-white shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span>Hồ Sơ & Thông Tin</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                data-testid="painting-detail__tab-history"
                className={`h-[28px] px-2.5 sm:px-3 text-[11px] font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'history'
                    ? 'bg-[#7D1818] text-white shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#F4E5B8]" />
                <span>Nhật Ký Vị Trí ({locationHistory.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('price')}
                data-testid="painting-detail__tab-price-history"
                className={`h-[28px] px-2.5 sm:px-3 text-[11px] font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'price'
                    ? 'bg-[#7D1818] text-white shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-[#F4E5B8]" />
                <span>Nhật Ký Giá ({priceHistory.length})</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Info Form */}
          {activeTab === 'info' && (
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
                  <CurrencyInput
                    value={formData.gia ?? ''}
                    onChange={(numVal, formattedStr) => handleChange('gia', formattedStr)}
                    placeholder="Thỏa thuận"
                    className="w-full h-[32px] px-2 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md"
                    data-testid="painting-detail__input-price"
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
          )}

          {/* Tab 2: Location History Log */}
          {activeTab === 'history' && (
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

          {/* Tab 3: Price History Subtab (M2) */}
          {activeTab === 'price' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              
              {/* SECTION A: CURRENT PRICE KPI SUMMARY BAR */}
              <div 
                data-testid="price-history__kpi-current-price" data-alias="painting-detail__price-kpi-bar"
                className="p-2.5 sm:p-3 bg-[#FAF8F5] border border-[#EAE5D9] rounded-lg flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider font-semibold text-stone-500 block">
                    Giá Niêm Yết Hiện Tại
                  </span>
                  <span className="font-mono text-base sm:text-lg font-bold text-[#9E7A36]">
                    {formatUSD(formData.gia, 'Chưa có giá')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider font-semibold text-stone-500 block">
                    Cập Nhật Lần Cuối
                  </span>
                  <div className="flex items-center justify-end gap-1 text-stone-800 font-mono text-[11.5px] font-semibold">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>{formatDateVN(formData.ngay_cap_nhat_gia_gan_nhat, 'Chưa cập nhật')}</span>
                  </div>
                </div>
              </div>

              {/* SECTION B: QUICK PRICE ADJUSTMENT CARD */}
              <div data-testid="price-history__quick-adjust-card" className="p-3 bg-[#F4E5B8]/25 border border-[#C58C00]/30 rounded-lg">
                <h4 className="text-[11.5px] font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#7D1818]" />
                  <span>Điều Chỉnh Giá & Ghi Nhật Ký</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10.5px] font-semibold text-stone-700 block mb-0.5">
                      Giá mới ($ USD) <span className="text-red-500">*</span>
                    </label>
                    <CurrencyInput
                      placeholder="VD: 1,600"
                      value={newPriceInput}
                      disabled={isSubmittingPrice}
                      onChange={(numVal, formattedStr) => {
                        setNewPriceInput(formattedStr);
                        setQuickPriceError(null);
                      }}
                      data-testid="price-history__input-new-price"
                      data-alias="painting-detail__quick-price-input"
                      className="w-full h-[32px] px-2.5 text-[12px] font-mono bg-white border border-[#DDD5C4] rounded focus:outline-none focus:border-[#7D1818] focus:ring-1 focus:ring-[#7D1818]/20 transition-all placeholder:font-sans placeholder:text-stone-400 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-stone-700 block mb-0.5">
                      Lý do thay đổi / Ghi chú
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Điều chỉnh giá triển lãm..."
                      value={newPriceNote}
                      disabled={isSubmittingPrice}
                      onChange={(e) => setNewPriceNote(e.target.value)}
                      data-testid="price-history__input-note" data-alias="painting-detail__quick-price-note"
                      className="w-full h-[32px] px-2.5 text-[12px] bg-white border border-[#DDD5C4] rounded focus:outline-none focus:border-[#7D1818] focus:ring-1 focus:ring-[#7D1818]/20 transition-all placeholder:text-stone-400 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Validation Error Message */}
                {quickPriceError && (
                  <div className="mb-2 p-1.5 bg-red-50 border border-red-200 text-red-700 text-[10.5px] rounded flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{quickPriceError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  data-testid="price-history__btn-submit" data-alias="painting-detail__quick-price-submit"
                  disabled={
                    !String(newPriceInput || '').trim() ||
                    isSubmittingPrice ||
                    (parseNumericPrice(formData.gia) !== null && parseNumericPrice(newPriceInput) === parseNumericPrice(formData.gia))
                  }
                  onClick={async () => {
                    // Synchronous guard check: drop rapid multi-taps before async yield
                    if (isSubmittingRef.current) return;

                    const trimmed = String(newPriceInput || '').trim();
                    if (!trimmed) {
                      setQuickPriceError('Vui lòng nhập giá mới');
                      return;
                    }
                    const parsed = parseNumericPrice(trimmed);
                    if (parsed === null || parsed < 0) {
                      setQuickPriceError('Giá mới không hợp lệ (phải là số >= 0)');
                      return;
                    }
                    const currentPrice = parseNumericPrice(formData.gia);
                    if (currentPrice !== null && parsed === currentPrice) {
                      setQuickPriceError('Giá mới trùng với giá hiện tại');
                      return;
                    }

                    isSubmittingRef.current = true;
                    setIsSubmittingPrice(true);
                    setQuickPriceError(null);

                    const d = new Date();
                    const dd = String(d.getDate()).padStart(2, '0');
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const yyyy = d.getFullYear();
                    const todayFormatted = `${dd}-${mm}-${yyyy}`;

                    const payload = {
                      new_price: parsed,
                      old_price: currentPrice,
                      note: newPriceNote.trim() || `Điều chỉnh giá từ ${formatUSD(currentPrice)} sang ${formatUSD(parsed)}`
                    };

                    try {
                      let res = await fetch(`/api/paintings/${encodeURIComponent(formData.id)}/price-history`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                      });

                      // Dual Fallback to PUT /api/paintings/:id if POST endpoint not ready
                      if (res.status === 404 || res.status === 405) {
                        res = await fetch(`/api/paintings/${encodeURIComponent(formData.id)}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...formData,
                            gia: parsed,
                            ngay_cap_nhat_gia_gan_nhat: todayFormatted,
                            price_note: payload.note
                          })
                        });
                      }

                      const json = await res.json();
                      if (json.success) {
                        const effectiveDate = json.data?.ngay_cap_nhat_gia_gan_nhat || todayFormatted;
                        // Immediate reactive sync for Left preview & KPI bar
                        setFormData(prev => ({
                          ...prev,
                          gia: parsed,
                          ngay_cap_nhat_gia_gan_nhat: effectiveDate
                        }));

                        // Update priceHistory list
                        if (Array.isArray(json.history)) {
                          setPriceHistory(json.history);
                        } else if (Array.isArray(json.data) && json.data.length > 0 && json.data[0].new_price !== undefined) {
                          setPriceHistory(json.data);
                        } else {
                          await fetchPriceHistory(formData.id);
                        }

                        setNewPriceInput('');
                        setNewPriceNote('');
                        setPriceSuccessMsg('Đã cập nhật giá mới thành công!');
                        setTimeout(() => setPriceSuccessMsg(null), 3500);
                      } else {
                        setQuickPriceError(json.message || 'Lỗi khi cập nhật giá');
                      }
                    } catch (err) {
                      console.error('Failed to update price:', err);
                      setQuickPriceError('Lỗi kết nối máy chủ');
                    } finally {
                      isSubmittingRef.current = false;
                      setIsSubmittingPrice(false);
                    }
                  }}
                  className="h-[30px] px-3.5 text-[11px] font-bold text-white bg-[#7D1818] hover:bg-[#691212] active:scale-[0.98] rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-2xs"
                >
                  {isSubmittingPrice ? (
                    <div className="animate-spin w-3.5 h-3.5 border-2 border-[#F4E5B8] border-t-transparent rounded-full" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-[#F4E5B8]" />
                  )}
                  <span>{isSubmittingPrice ? 'Đang lưu...' : 'Xác Nhận Đổi Giá'}</span>
                </button>
              </div>

              {/* SUCCESS STATE FEEDBACK BANNER */}
              {priceSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-medium">{priceSuccessMsg}</span>
                </div>
              )}

              {/* SECTION C: TIMELINE LIST */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-stone-500" />
                    <span>Lịch Sử Biến Động Giá</span>
                  </h5>
                  <span className="text-[10.5px] font-mono text-stone-500">
                    {priceHistory.length} mốc ghi nhận
                  </span>
                </div>

                {/* 1. LOADING STATE */}
                {loadingPriceHistory ? (
                  <div className="py-8 text-center text-stone-500 text-[11px] flex flex-col items-center justify-center gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-[#7D1818] border-t-transparent rounded-full" />
                    <span>Đang tải nhật ký biến động giá...</span>
                  </div>
                ) : priceHistoryError ? (
                  /* 2. ERROR STATE */
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[11px] rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{priceHistoryError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchPriceHistory(formData.id)}
                      className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded text-[10.5px] transition-colors"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : priceHistory.length === 0 ? (
                  /* 3. EMPTY STATE */
                  <div className="text-center py-8 px-4 text-[11.5px] text-stone-400 bg-stone-50 rounded-lg border border-dashed border-stone-200 flex flex-col items-center justify-center gap-1.5">
                    <History className="w-6 h-6 text-stone-300 opacity-60" />
                    <p>Chưa có nhật ký biến động giá nào cho tác phẩm này.</p>
                    <span className="text-[10.5px] text-stone-400 italic">
                      Sử dụng khối điều chỉnh giá bên trên để ghi nhận mốc giá mới.
                    </span>
                  </div>
                ) : (
                  /* 4. SUCCESS / POPULATED TIMELINE LIST */
                  <div data-testid="price-history__timeline-container" data-alias="painting-detail__price-history-timeline" className="space-y-2">
                    {priceHistory.map((item, idx) => {
                      const isInitial = Boolean(item.is_initial || item.note === 'Khởi tạo mốc giá ban đầu' || ((item.old_price === null || item.old_price === undefined) && idx === priceHistory.length - 1));
                      const oldVal = !isInitial && item.old_price !== null && item.old_price !== undefined 
                        ? Number(item.old_price) 
                        : null;
                      const newVal = item.new_price !== null && item.new_price !== undefined 
                        ? Number(item.new_price) 
                        : null;
                      const diff = (oldVal !== null && newVal !== null) ? (newVal - oldVal) : null;
                      const percent = (diff !== null && oldVal > 0) ? ((diff / oldVal) * 100).toFixed(1) : null;

                      return (
                        <div
                          key={item.id || idx}
                          data-testid="price-history__timeline-item" data-alias="painting-detail__price-history-item"
                          className={`p-2.5 bg-[#FAF8F5] border rounded-md text-[11.5px] flex items-start justify-between gap-3 transition-all ${
                            idx === 0
                              ? 'border-[#C5A059]/60 shadow-2xs bg-[#FAF7F0]'
                              : 'border-[#EAE5D9]'
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            {/* Price Comparison + Diff Tags */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {isInitial ? (
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-[11px] text-stone-500 font-sans">Khởi tạo:</span>
                                  <strong className="text-stone-900 font-bold text-[12.5px]">
                                    {formatUSD(newVal)}
                                  </strong>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-stone-400 line-through text-[11px]">
                                    {formatUSD(oldVal)}
                                  </span>
                                  <span className="text-stone-400 font-sans text-[10px]">➔</span>
                                  <strong className="text-stone-900 font-bold text-[12.5px]">
                                    {formatUSD(newVal)}
                                  </strong>
                                </div>
                              )}

                              {/* Visual Diff Tag */}
                              {isInitial ? (
                                <span data-testid="price-history__badge-baseline" className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[#F4E5B8]/50 text-[#8C6400] border border-[#C58C00]/30 uppercase tracking-wide shrink-0">
                                  Mốc ban đầu
                                </span>
                              ) : diff !== null && diff > 0 ? (
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                  +{formatUSD(diff)} (+{percent}%)
                                </span>
                              ) : diff !== null && diff < 0 ? (
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                  -{formatUSD(Math.abs(diff))} ({percent}%)
                                </span>
                              ) : null}
                            </div>

                            {/* Note */}
                            {item.note && (
                              <p className="text-stone-600 italic text-[11px] leading-relaxed break-words">
                                "{item.note}"
                              </p>
                            )}
                          </div>

                          {/* Date & Badge */}
                          <div className="text-right shrink-0 space-y-0.5">
                            <span className="font-mono text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded block">
                              {formatDateVN(item.date || item.change_date || item.timestamp)}
                            </span>
                            {idx === 0 && (
                              <span className="text-[9px] text-[#7D1818] font-bold uppercase tracking-wider block">
                                Hiện hành
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
