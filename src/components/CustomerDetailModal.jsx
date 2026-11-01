import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  QrCode,
  Search,
  Check,
  Save,
  Image as ImageIcon,
  ExternalLink,
  Layers,
  Heart,
  Percent,
  CheckSquare,
  Square,
  Tag,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { formatUSD } from '../types';

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
    ho_ten: '',
    so_dien_thoai: '',
    email: '',
    dia_chi: '',
    ngay_hen: '',
    ghi_chu: ''
  });

  // Active Interests List in Customer Profile
  // Each item: { id, customer_id, painting_id, deal_price, note }
  const [interests, setInterests] = useState([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Tab: 'interests' (Danh mục quan tâm & Deal) | 'info' (Thông tin cá nhân & Lịch hẹn) | 'add_paintings' (Chọn thêm tranh từ kho)
  const [activeTab, setActiveTab] = useState('interests');

  // Search & Batch Picker State (Multi-select from inventory)
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSelectedIds, setPickerSelectedIds] = useState(new Set());
  const [batchDiscountPercent, setBatchDiscountPercent] = useState(''); // Global discount for picker selection

  // Load customer details from API whenever customerId changes or modal opens
  useEffect(() => {
    if (!isOpen || !customerId) {
      setCustomer(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setInitialLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customers/${customerId}`);
        const json = await res.json();
        if (isMounted) {
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
            setInterests(json.data.interests || []);
          } else {
            setError(json.message || 'Không tìm thấy thông tin khách hàng');
          }
        }
      } catch (err) {
        if (isMounted) setError('Lỗi kết nối máy chủ: ' + err.message);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };

    fetchDetail();
    setPickerSelectedIds(new Set());
    setActiveTab('interests');

    return () => {
      isMounted = false;
    };
  }, [isOpen, customerId]);

  // Realtime Financial Calculations
  const calculations = useMemo(() => {
    let totalListed = 0;
    let totalDeal = 0;
    let pricedCount = 0;

    interests.forEach(item => {
      const p = paintings.find(pt => pt.id === item.painting_id);
      const listed = p && typeof p.gia === 'number' ? p.gia : 0;
      totalListed += listed;

      if (item.deal_price !== null && item.deal_price !== undefined && item.deal_price !== '') {
        const dealVal = Number(item.deal_price) || 0;
        totalDeal += dealVal;
        pricedCount++;
      } else if (listed > 0) {
        totalDeal += listed;
      }
    });

    const totalDiscountAmount = totalListed > 0 && totalDeal < totalListed ? totalListed - totalDeal : 0;
    const avgDiscountPercent = totalListed > 0 && totalDiscountAmount > 0 
      ? Math.round((totalDiscountAmount / totalListed) * 100) 
      : 0;

    return {
      totalListed,
      totalDeal,
      totalDiscountAmount,
      avgDiscountPercent,
      count: interests.length
    };
  }, [interests, paintings]);

  // Handle Deal Price edit on an existing interest (Realtime)
  const handleUpdateDealPrice = (idx, newPrice) => {
    setInterests(prev => {
      const copy = [...prev];
      const val = newPrice === '' ? null : Number(newPrice);
      copy[idx] = { ...copy[idx], deal_price: isNaN(val) ? null : val };
      return copy;
    });
  };

  // Handle Note edit on an existing interest
  const handleUpdateNote = (idx, newNote) => {
    setInterests(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], note: newNote };
      return copy;
    });
  };

  // Quick discount buttons (% off on a specific row)
  const handleApplyRowDiscountPercent = (idx, percent) => {
    setInterests(prev => {
      const copy = [...prev];
      const item = copy[idx];
      const p = paintings.find(pt => pt.id === item.painting_id);
      const listed = p && typeof p.gia === 'number' ? p.gia : 0;
      if (listed > 0) {
        const discounted = Math.round(listed * (1 - percent / 100));
        copy[idx] = { ...item, deal_price: discounted };
      }
      return copy;
    });
  };

  // Remove single painting from interests
  const handleRemoveInterest = (idx) => {
    setInterests(prev => prev.filter((_, i) => i !== idx));
  };

  // Toggle selection in inventory picker
  const handleTogglePickerSelect = (pId) => {
    setPickerSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(pId)) next.delete(pId);
      else next.add(pId);
      return next;
    });
  };

  // Select all / Deselect all currently filtered picker items
  const handleSelectAllFiltered = (filteredList) => {
    const allIds = filteredList.map(p => p.id);
    const isAllSelected = allIds.length > 0 && allIds.every(id => pickerSelectedIds.has(id));
    setPickerSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        allIds.forEach(id => next.delete(id));
      } else {
        allIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Batch Add selected paintings from picker into interests
  const handleBatchAddSelected = () => {
    if (pickerSelectedIds.size === 0) return;

    const discountPct = parseFloat(batchDiscountPercent);
    const hasDiscount = !isNaN(discountPct) && discountPct >= 0 && discountPct <= 100;

    const newInterests = [];
    pickerSelectedIds.forEach(pId => {
      // Check if already in interests
      const already = interests.find(i => i.painting_id === pId);
      if (already) return;

      const p = paintings.find(pt => pt.id === pId);
      let dealPrice = null;
      if (p && typeof p.gia === 'number') {
        if (hasDiscount) {
          dealPrice = Math.round(p.gia * (1 - discountPct / 100));
        } else {
          dealPrice = p.gia;
        }
      }

      newInterests.push({
        customer_id: customerId,
        painting_id: pId,
        deal_price: dealPrice,
        note: hasDiscount ? `Chiết khấu ${discountPct}%` : '',
        created_at: new Date().toISOString().slice(0, 10)
      });
    });

    setInterests(prev => [...prev, ...newInterests]);
    setPickerSelectedIds(new Set());
    setBatchDiscountPercent('');
    setActiveTab('interests');
  };

  // Save all customer info & interests to backend
  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        interests: interests.map(item => ({
          painting_id: item.painting_id,
          deal_price: item.deal_price !== null && item.deal_price !== undefined ? Number(item.deal_price) : null,
          note: item.note || ''
        }))
      };

      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        if (onCustomerUpdated) onCustomerUpdated();
        onClose();
      } else {
        setError(json.error || json.message || 'Lỗi lưu thông tin');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter available paintings for picker
  const pickerPaintings = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const existingIds = new Set(interests.map(i => i.painting_id));

    return paintings.filter(p => {
      // Don't show paintings already in interests list
      if (existingIds.has(p.id)) return false;

      if (!q) return true;
      const matchId = (p.id || '').toLowerCase().includes(q);
      const matchName = (p.ten_tac_pham || '').toLowerCase().includes(q);
      const matchArtist = (p.tac_gia || '').toLowerCase().includes(q);
      const matchMedium = (p.chat_lieu || '').toLowerCase().includes(q);
      return matchId || matchName || matchArtist || matchMedium;
    });
  }, [paintings, interests, pickerSearch]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#DFCBAA] rounded-xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-98 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#FAF8F5] border-b border-[#EAE5D9]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#7D1818] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              <User className="w-3.5 h-3.5 text-[#F4E5B8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-[14px] font-bold text-stone-900 leading-tight">
                  {formData.ho_ten || 'Hồ Sơ Khách Hàng'}
                </h3>
                <span className="font-mono text-[9.5px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                  KH-{customerId}
                </span>
                {formData.so_dien_thoai && (
                  <span className="text-[11px] font-mono text-stone-600 font-semibold">
                    📞 {formData.so_dien_thoai}
                  </span>
                )}
                {formData.ngay_hen && (
                  <span className="text-[10.5px] font-mono text-[#7D1818] bg-rose-50 px-1.5 py-0.2 border border-rose-200 rounded">
                    🗓️ {formData.ngay_hen.replace('T', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Realtime KPI Bar - Compact Single Line */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3.5 py-1.5 bg-[#FAF7F0] border-b border-[#EAE5D9] text-[11px]">
          <div className="bg-white px-2.5 py-1 rounded border border-[#EAE5D9] flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Tranh quan tâm:</span>
            <span className="text-[12.5px] font-mono font-bold text-[#7D1818]">{calculations.count}</span>
          </div>

          <div className="bg-white px-2.5 py-1 rounded border border-[#EAE5D9] flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Niêm yết:</span>
            <span className="text-[12.5px] font-mono font-semibold text-stone-700">{formatUSD(calculations.totalListed)}</span>
          </div>

          <div className="bg-white px-2.5 py-1 rounded border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Giá Deal:</span>
              {calculations.avgDiscountPercent > 0 && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                  -{calculations.avgDiscountPercent}%
                </span>
              )}
            </div>
            <span className="text-[12.5px] font-mono font-bold text-emerald-800">{formatUSD(calculations.totalDeal)}</span>
          </div>

          <div className="bg-white px-2.5 py-1 rounded border border-[#EAE5D9] flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Chiết khấu:</span>
            <span className="text-[12.5px] font-mono font-semibold text-amber-800">
              {calculations.totalDiscountAmount > 0 ? formatUSD(calculations.totalDiscountAmount) : '$0'}
            </span>
          </div>
        </div>

        {/* Navigation Sub-Tabs - Compact */}
        <div className="flex items-center justify-between px-3.5 pt-1.5 border-b border-[#EAE5D9] bg-white">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('interests')}
              className={`h-[29px] px-3 text-[11px] font-bold rounded-t-md transition-all flex items-center gap-1.5 border-b-2 ${
                activeTab === 'interests'
                  ? 'border-[#7D1818] text-[#7D1818] bg-[#FAF8F5]'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Tranh Quan Tâm & Giá Deal ({interests.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('add_paintings')}
              className={`h-[29px] px-3 text-[11px] font-bold rounded-t-md transition-all flex items-center gap-1.5 border-b-2 ${
                activeTab === 'add_paintings'
                  ? 'border-[#7D1818] text-[#7D1818] bg-[#FAF8F5]'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-[#C58C00]" />
              <span>Thêm Tranh Từ Kho (Chọn Nhiều)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`h-[29px] px-3 text-[11px] font-bold rounded-t-md transition-all flex items-center gap-1.5 border-b-2 ${
                activeTab === 'info'
                  ? 'border-[#7D1818] text-[#7D1818] bg-[#FAF8F5]'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <span>Thông Tin & Lịch Hẹn</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 text-[11.5px] rounded border border-red-200">
              {error}
            </div>
          )}

          {initialLoading ? (
            <div className="py-16 text-center text-stone-500 text-[12px]">
              <div className="animate-spin w-6 h-6 border-2 border-[#C5A059] border-t-transparent rounded-full mx-auto mb-2" />
              <span>Đang tải thông tin chi tiết khách hàng...</span>
            </div>
          ) : activeTab === 'interests' ? (
            /* TAB 1: Danh sách tranh quan tâm & Cột Giá Deal Realtime */
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-stone-800">
                  Danh mục tranh đang đàm phán & tư vấn
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('add_paintings')}
                  className="h-[28px] px-2.5 text-[11px] font-bold text-white bg-[#7D1818] hover:bg-[#691212] rounded flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-[#F4E5B8]" />
                  <span>Chọn Thêm Tranh</span>
                </button>
              </div>

              {interests.length === 0 ? (
                <div className="py-12 text-center bg-[#FAF8F5] border border-dashed border-[#DDD5C4] rounded-lg space-y-2">
                  <Heart className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-[12px] font-semibold text-stone-600">Khách chưa có tranh nào trong danh mục quan tâm</p>
                  <p className="text-[11px] text-stone-400">Bấm tab "Thêm Tranh Từ Kho (Chọn Nhiều)" để chọn tranh và đặt giá deal</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('add_paintings')}
                    className="mt-2 h-[30px] px-3.5 text-[11px] font-bold text-[#7D1818] bg-white border border-[#C58C00] rounded hover:bg-stone-50 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Mở Kho Tranh Để Chọn</span>
                  </button>
                </div>
              ) : (
                <div className="border border-[#EAE5D9] rounded-lg overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-[11.5px] border-collapse">
                    <thead className="bg-[#FAF8F5] border-b border-[#EAE5D9] text-[10.5px] font-bold text-stone-600 uppercase">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">STT</th>
                        <th className="py-2 px-3">Tác Phẩm</th>
                        <th className="py-2 px-2.5">Họa Sĩ</th>
                        <th className="py-2 px-2.5 text-right w-[110px]">Giá Niêm Yết</th>
                        <th className="py-2 px-2.5 w-[190px]">
                          <span className="text-[#7D1818] font-bold">Giá Deal ($ USD)</span>
                        </th>
                        <th className="py-2 px-3">Ghi Chú Đàm Phán</th>
                        <th className="py-2 px-2 text-center w-10">Bỏ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE5D9]">
                      {interests.map((item, idx) => {
                        const p = paintings.find(pt => pt.id === item.painting_id) || {};
                        const thumb = Array.isArray(p.hinh_anh) && p.hinh_anh.length > 0 ? p.hinh_anh[0] : null;
                        const listedPrice = typeof p.gia === 'number' ? p.gia : null;
                        const currentDeal = item.deal_price !== null && item.deal_price !== undefined ? Number(item.deal_price) : null;
                        const diff = listedPrice && currentDeal !== null ? currentDeal - listedPrice : null;
                        const pct = listedPrice && currentDeal !== null && listedPrice > 0 ? Math.round(((listedPrice - currentDeal) / listedPrice) * 100) : 0;

                        return (
                          <tr key={item.id || idx} className="hover:bg-amber-50/20 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-stone-400 font-semibold">
                              {idx + 1}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt={item.painting_id}
                                    onClick={() => onOpenLightbox && onOpenLightbox(thumb, p.ten_tac_pham, p.tac_gia)}
                                    className="w-10 h-10 object-cover rounded border border-stone-200 shrink-0 cursor-pointer hover:opacity-90"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-[9px] text-stone-400 shrink-0 font-mono">
                                    No IMG
                                  </div>
                                )}
                                <div className="truncate max-w-[200px]">
                                  <span className="font-mono font-bold text-[#7D1818] block leading-none">
                                    {item.painting_id}
                                  </span>
                                  <span className="font-semibold text-stone-900 block truncate mt-1">
                                    {p.ten_tac_pham || item.painting_id}
                                  </span>
                                  <span className="text-[10px] text-stone-500 block truncate">
                                    {p.kich_thuoc_tranh || ''}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-2.5 text-stone-700 font-medium">
                              {p.tac_gia || '—'}
                            </td>

                            <td className="py-2.5 px-2.5 font-mono text-stone-600 text-right font-medium">
                              {formatUSD(p.gia)}
                            </td>

                            {/* Cột Nhập Giá Deal Realtime */}
                            <td className="py-2.5 px-2.5">
                              <div className="space-y-1">
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-[11px]">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.deal_price ?? ''}
                                    onChange={(e) => handleUpdateDealPrice(idx, e.target.value)}
                                    placeholder="Thỏa thuận"
                                    className="w-full h-[28px] pl-5 pr-2 font-mono font-bold text-stone-900 bg-amber-50/50 focus:bg-white border border-amber-300 focus:border-[#7D1818] rounded text-[12px] focus:outline-none transition-colors"
                                  />
                                </div>

                                {/* Quick discount percentage pills */}
                                {listedPrice && listedPrice > 0 && (
                                  <div className="flex items-center gap-1 text-[9.5px]">
                                    <span className="text-stone-400">Giảm:</span>
                                    {[5, 10, 15, 20].map(disc => (
                                      <button
                                        key={disc}
                                        type="button"
                                        onClick={() => handleApplyRowDiscountPercent(idx, disc)}
                                        className="px-1 py-0.2 bg-stone-100 hover:bg-[#7D1818] hover:text-white rounded text-stone-600 font-mono font-bold transition-colors"
                                        title={`Áp dụng giảm ${disc}% (còn $${Math.round(listedPrice * (1 - disc/100))})`}
                                      >
                                        -{disc}%
                                      </button>
                                    ))}
                                    {pct > 0 && (
                                      <span className="ml-auto font-mono font-bold text-emerald-800 text-[10px]">
                                        (↓{pct}%)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Ghi Chú Đàm Phán */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={item.note || ''}
                                onChange={(e) => handleUpdateNote(idx, e.target.value)}
                                placeholder="Ghi chú đàm phán, thanh toán..."
                                className="w-full h-[28px] px-2 bg-stone-50 focus:bg-white border border-[#DDD5C4] focus:border-stone-400 rounded text-[11px] focus:outline-none"
                              />
                            </td>

                            {/* Nút Xóa Khỏi List */}
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveInterest(idx)}
                                className="w-7 h-7 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded flex items-center justify-center transition-colors"
                                title="Bỏ tranh này khỏi hồ sơ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'add_paintings' ? (
            /* TAB 2: Kho Tranh Cho Phép Chọn / Bỏ Chọn Nhiều & Đặt Giá Chiết Khấu Tự Động */
            <div className="space-y-3">
              <div className="p-3 bg-[#FAF8F5] border border-[#DFCBAA] rounded-lg space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Tìm theo Mã tranh (DVS-...), tên tác phẩm, họa sĩ..."
                      className="w-full h-[32px] pl-8 pr-3 text-[11.5px] bg-white border border-[#DDD5C4] rounded focus:outline-none focus:border-[#7D1818]"
                    />
                  </div>

                  {/* Chiết khấu tự động cho loạt tranh đang chọn */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 bg-white border border-[#DDD5C4] rounded px-2 h-[32px]">
                      <Percent className="w-3.5 h-3.5 text-stone-400" />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={batchDiscountPercent}
                        onChange={(e) => setBatchDiscountPercent(e.target.value)}
                        placeholder="Chiết khấu %"
                        className="w-20 text-[11.5px] font-mono font-bold focus:outline-none"
                      />
                      <span className="text-[11px] text-stone-400">%</span>
                    </div>

                    <button
                      type="button"
                      disabled={pickerSelectedIds.size === 0}
                      onClick={handleBatchAddSelected}
                      className="h-[32px] px-3.5 text-[11.5px] font-bold text-white bg-[#7D1818] hover:bg-[#691212] rounded transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#F4E5B8]" />
                      <span>Xác Nhận Thêm ({pickerSelectedIds.size})</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-600 pt-1 border-t border-stone-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllFiltered(pickerPaintings)}
                      className="font-bold text-[#7D1818] hover:underline flex items-center gap-1"
                    >
                      {pickerPaintings.length > 0 && pickerPaintings.every(p => pickerSelectedIds.has(p.id)) ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Bỏ chọn tất cả</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5" />
                          <span>Chọn tất cả ({pickerPaintings.length})</span>
                        </>
                      )}
                    </button>
                    <span>• Đang chọn: <strong className="text-emerald-800 font-bold">{pickerSelectedIds.size}</strong> tranh</span>
                  </div>

                  {batchDiscountPercent && (
                    <span className="text-emerald-800 font-semibold">
                      Tự động tính giảm giá {batchDiscountPercent}% cho các tranh được chọn
                    </span>
                  )}
                </div>
              </div>

              {/* Bảng Danh Sách Tranh Trong Kho Để Tích Chọn Nhiều */}
              <div className="border border-[#EAE5D9] rounded-lg overflow-hidden max-h-[380px] overflow-y-auto bg-white shadow-2xs">
                {pickerPaintings.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-[11.5px]">
                    Không tìm thấy tranh phù hợp hoặc toàn bộ tranh đã có trong hồ sơ khách.
                  </div>
                ) : (
                  <table className="w-full text-left text-[11.5px] border-collapse">
                    <thead className="bg-[#FAF8F5] border-b border-[#EAE5D9] text-[10.5px] font-bold text-stone-600 uppercase sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">Tích</th>
                        <th className="py-2 px-3">Tác Phẩm</th>
                        <th className="py-2 px-2.5">Họa Sĩ</th>
                        <th className="py-2 px-2.5 text-right">Giá Niêm Yết</th>
                        <th className="py-2 px-2.5 text-right">Giá Dự Tính</th>
                        <th className="py-2 px-3 text-center w-20">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE5D9]">
                      {pickerPaintings.map((p) => {
                        const isSelected = pickerSelectedIds.has(p.id);
                        const thumb = Array.isArray(p.hinh_anh) && p.hinh_anh.length > 0 ? p.hinh_anh[0] : null;
                        const disc = parseFloat(batchDiscountPercent);
                        const estDeal = typeof p.gia === 'number' && !isNaN(disc) && disc >= 0 && disc <= 100
                          ? Math.round(p.gia * (1 - disc / 100))
                          : p.gia;

                        return (
                          <tr
                            key={p.id}
                            onClick={() => handleTogglePickerSelect(p.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-amber-50/60 font-medium' : 'hover:bg-stone-50'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // Controlled by tr onClick
                                className="w-4 h-4 rounded text-[#7D1818] border-stone-300 focus:ring-0 cursor-pointer"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt={p.id}
                                    className="w-9 h-9 object-cover rounded border border-stone-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-[8px] text-stone-400 shrink-0">
                                    No IMG
                                  </div>
                                )}
                                <div className="truncate max-w-[220px]">
                                  <span className="font-mono font-bold text-[#7D1818] block leading-none">
                                    {p.id}
                                  </span>
                                  <span className="font-semibold text-stone-900 block truncate mt-1">
                                    {p.ten_tac_pham}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-2.5 text-stone-700">
                              {p.tac_gia || '—'}
                            </td>

                            <td className="py-2.5 px-2.5 font-mono text-stone-600 text-right">
                              {formatUSD(p.gia)}
                            </td>

                            <td className="py-2.5 px-2.5 font-mono font-bold text-emerald-800 text-right">
                              {formatUSD(estDeal)}
                              {estDeal !== p.gia && (
                                <span className="block text-[9.5px] text-stone-400">(-{batchDiscountPercent}%)</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                p.tinh_trang === 'da_ban'
                                  ? 'bg-stone-100 text-stone-500'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}>
                                {p.tinh_trang === 'da_ban' ? 'Đã bán' : 'Sẵn sàng'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            /* TAB 3: Chỉnh Sửa Thông Tin Cá Nhân & Lịch Hẹn */
            <div className="bg-[#FAF8F5] p-4 rounded-lg border border-[#EAE5D9] space-y-4">
              <h4 className="text-[12px] font-bold text-stone-800 uppercase tracking-wider">
                Cập nhật thông tin khách & lịch hẹn ghé thăm
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Họ và Tên Khách Hàng <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ho_ten}
                    onChange={(e) => setFormData({ ...formData, ho_ten: e.target.value })}
                    className="w-full h-[32px] px-2.5 text-[12px] bg-white border border-[#DDD5C4] rounded font-medium focus:outline-none focus:border-[#7D1818]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Số Điện Thoại
                  </label>
                  <input
                    type="text"
                    value={formData.so_dien_thoai}
                    onChange={(e) => setFormData({ ...formData, so_dien_thoai: e.target.value })}
                    className="w-full h-[32px] px-2.5 text-[12px] font-mono bg-white border border-[#DDD5C4] rounded focus:outline-none focus:border-[#7D1818]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-[32px] px-2.5 text-[12px] bg-white border border-[#DDD5C4] rounded focus:outline-none focus:border-[#7D1818]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Lịch Hẹn Tới (Ngày & Giờ)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.ngay_hen}
                    onChange={(e) => setFormData({ ...formData, ngay_hen: e.target.value })}
                    className="w-full h-[32px] px-2.5 text-[12px] font-mono bg-white border border-[#DDD5C4] rounded focus:outline-none focus:border-[#7D1818]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Địa Chỉ
                  </label>
                  <input
                    type="text"
                    value={formData.dia_chi}
                    onChange={(e) => setFormData({ ...formData, dia_chi: e.target.value })}
                    className="w-full h-[32px] px-2.5 text-[12px] bg-white border border-[#DDD5C4] rounded focus:outline-none focus:border-[#7D1818]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                    Ghi Chú Đầy Đủ
                  </label>
                  <textarea
                    rows={3}
                    value={formData.ghi_chu}
                    onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                    className="w-full p-2.5 text-[12px] bg-white border border-[#DDD5C4] rounded focus:outline-none focus:border-[#7D1818]"
                    placeholder="Ghi chú sở thích hội họa, gu nghệ thuật, lịch sử giao dịch..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-[#EAE5D9] bg-[#FAF8F5]">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ khách "${formData.ho_ten}"?`)) {
                if (onCustomerDeleted) onCustomerDeleted(customerId);
                onClose();
              }
            }}
            className="h-[28px] px-2.5 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa Khách</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-[28px] px-3 text-[11px] font-semibold text-stone-600 bg-white hover:bg-stone-50 border border-[#EAE5D9] rounded-md transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAll}
              className="h-[28px] px-3.5 text-[11px] font-bold text-white bg-[#7D1818] hover:bg-[#691212] rounded-md transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-[#F4E5B8]" />
              <span>{saving ? 'Đang lưu...' : 'Lưu Hồ Sơ & Giá Deal'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
