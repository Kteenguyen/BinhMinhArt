import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Calendar,
  Phone,
  Heart,
  DollarSign,
  Download,
  Filter,
  Eye,
  Trash2,
  Clock,
  Sparkles,
  ChevronRight,
  ArrowUpDown,
  CheckCircle2,
  X
} from 'lucide-react';
import { formatUSD } from '../types';
import SmartArtistDropdown from './SmartArtistDropdown';

export default function CustomerManagementView({
  customers = [],
  allPaintings = [],
  paintings = [],
  onOpenQuickAdd,
  onOpenDetail,
  onExportExcel,
  isExporting
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [appointmentFilter, setAppointmentFilter] = useState('all'); // 'all' | 'today' | 'upcoming' | 'past'
  const [artistFilter, setArtistFilter] = useState('all');

  const rawPaintings = (paintings && paintings.length > 0) ? paintings : allPaintings;

  // Extract artists and count how many customers are interested in each artist
  const artistStats = useMemo(() => {
    const pArtistMap = new Map();
    for (const p of rawPaintings) {
      if (p.id) pArtistMap.set(p.id, (p.tac_gia || 'Dương Văn Sen').trim());
    }

    const artistCustMap = new Map();
    for (const c of customers) {
      const cArtists = new Set();
      if (Array.isArray(c.interests)) {
        for (const i of c.interests) {
          const a = pArtistMap.get(i.painting_id);
          if (a) cArtists.add(a);
        }
      }
      for (const a of cArtists) {
        artistCustMap.set(a, (artistCustMap.get(a) || 0) + 1);
      }
    }

    const uniqueArtists = Array.from(new Set(rawPaintings.map(p => (p.tac_gia || 'Dương Văn Sen').trim()))).filter(Boolean);
    return uniqueArtists
      .map(name => ({
        name,
        count: artistCustMap.get(name) || 0
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
  }, [rawPaintings, customers]);

  // Appointment Status helper
  const getAppointmentStatus = (dateStr) => {
    if (!dateStr || !dateStr.trim()) return null;
    const appDate = new Date(dateStr);
    if (isNaN(appDate.getTime())) return null;

    const now = new Date();
    const isToday =
      appDate.getDate() === now.getDate() &&
      appDate.getMonth() === now.getMonth() &&
      appDate.getFullYear() === now.getFullYear();

    if (isToday) return { type: 'today', label: 'Hôm nay', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (appDate > now) return { type: 'upcoming', label: 'Sắp tới', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { type: 'past', label: 'Đã qua', color: 'bg-stone-100 text-stone-600 border-stone-200' };
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Search by name, phone, note, or painting ID in interests
      const key = searchTerm.trim().toLowerCase();
      let matchSearch = true;
      if (key) {
        const inName = String(c.ho_ten || '').toLowerCase().includes(key);
        const inPhone = String(c.so_dien_thoai || '').toLowerCase().includes(key);
        const inNote = String(c.ghi_chu || '').toLowerCase().includes(key);
        const inPaintings = Array.isArray(c.interests) && c.interests.some(i => String(i.painting_id || '').toLowerCase().includes(key));
        matchSearch = inName || inPhone || inNote || inPaintings;
      }

      // Artist Filter (Customers interested in this artist)
      if (artistFilter !== 'all') {
        const interestedInArtist = Array.isArray(c.interests) && c.interests.some(i => {
          const p = rawPaintings.find(paint => paint.id === i.painting_id);
          return p && (p.tac_gia || 'Dương Văn Sen').trim() === artistFilter;
        });
        if (!interestedInArtist) return false;
      }

      // Appointment Filter
      let matchApp = true;
      const status = getAppointmentStatus(c.ngay_hen);
      if (appointmentFilter === 'today') {
        matchApp = status && status.type === 'today';
      } else if (appointmentFilter === 'upcoming') {
        matchApp = status && (status.type === 'today' || status.type === 'upcoming');
      } else if (appointmentFilter === 'past') {
        matchApp = status && status.type === 'past';
      }

      return matchSearch && matchApp;
    });
  }, [customers, searchTerm, appointmentFilter, artistFilter, rawPaintings]);

  // Statistics
  const totalCustomers = customers.length;
  const todayAppointments = customers.filter(c => {
    const s = getAppointmentStatus(c.ngay_hen);
    return s && s.type === 'today';
  }).length;
  const upcomingAppointments = customers.filter(c => {
    const s = getAppointmentStatus(c.ngay_hen);
    return s && (s.type === 'today' || s.type === 'upcoming');
  }).length;
  const totalInterests = customers.reduce((sum, c) => sum + (Array.isArray(c.interests) ? c.interests.length : 0), 0);

  return (
    <div className="flex-1 flex flex-col space-y-3 pb-8">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white border border-[#EAE5D9] rounded-lg shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Tổng Số Khách Hàng
          </span>
          <span className="text-xl font-bold text-stone-900 font-mono mt-0.5 block">
            {totalCustomers}
          </span>
        </div>

        <div className="p-3 bg-white border border-[#EAE5D9] rounded-lg shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Hẹn Hôm Nay</span>
          </span>
          <span className="text-xl font-bold text-emerald-700 font-mono mt-0.5 block">
            {todayAppointments}
          </span>
        </div>

        <div className="p-3 bg-white border border-[#EAE5D9] rounded-lg shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
            Lịch Hẹn Sắp Tới
          </span>
          <span className="text-xl font-bold text-amber-700 font-mono mt-0.5 block">
            {upcomingAppointments}
          </span>
        </div>

        <div className="p-3 bg-white border border-[#EAE5D9] rounded-lg shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Tranh Đang Quan Tâm
          </span>
          <span className="text-xl font-bold text-[#7D1818] font-mono mt-0.5 block">
            {totalInterests}
          </span>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Action Buttons */}
      <div className="bg-white border border-[#EAE5D9] rounded-lg p-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên khách, số điện thoại, ghi chú, mã tranh..."
              className="w-full h-[32px] pl-8 pr-7 text-[12px] bg-[#FAF8F5] border border-[#EAE5D9] rounded-md focus:outline-none focus:border-stone-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Smart Artist Filter Dropdown (Portal-based, immune to clipping) */}
          <SmartArtistDropdown
            selectedArtist={artistFilter}
            onSelectArtist={setArtistFilter}
            artists={artistStats}
            allCount={customers.length}
            allOptionLabel="Tất cả khách hàng"
            placeholder="Lọc khách hàng theo họa sĩ quan tâm"
            className="w-[145px] sm:w-[175px] shrink-0"
            dropdownWidth={280}
          />

          {/* Appointment Filter Pills */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setAppointmentFilter('all')}
              className={`h-[30px] px-2.5 text-[11px] font-semibold rounded transition-colors ${
                appointmentFilter === 'all'
                  ? 'bg-[#7D1818] text-white'
                  : 'bg-[#FAF8F5] text-stone-600 hover:bg-stone-100 border border-[#EAE5D9]'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setAppointmentFilter('today')}
              className={`h-[30px] px-2.5 text-[11px] font-semibold rounded transition-colors flex items-center gap-1 ${
                appointmentFilter === 'today'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-[#FAF8F5] text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <span>Hẹn hôm nay</span>
              {todayAppointments > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {todayAppointments}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setAppointmentFilter('upcoming')}
              className={`h-[30px] px-2.5 text-[11px] font-semibold rounded transition-colors ${
                appointmentFilter === 'upcoming'
                  ? 'bg-amber-800 text-white'
                  : 'bg-[#FAF8F5] text-amber-800 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              Sắp tới
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting}
            className="h-[32px] px-3 text-[11.5px] font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-[#DFCBAA] rounded-md transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>{isExporting ? 'Đang xuất...' : 'Tải File Excel Khách'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenQuickAdd}
            className="h-[32px] px-3.5 text-[11.5px] font-bold text-white bg-[#7D1818] hover:bg-[#691212] rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#F4E5B8]" />
            <span>Tạo Khách Nhanh</span>
          </button>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="bg-white border border-[#EAE5D9] rounded-lg overflow-hidden shadow-2xs flex-1">
        {filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-stone-400 space-y-2">
            <Users className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-[13px] font-medium">Chưa có khách hàng nào trong danh sách</p>
            <p className="text-[11px]">Bấm nút "+ Tạo Khách Nhanh" để thêm khách ghé thăm gallery</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11.5px] border-collapse">
              <thead className="bg-[#FAF8F5] border-b border-[#EAE5D9] text-[10.5px] font-bold text-stone-700 uppercase">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Số Điện Thoại</th>
                  <th className="py-2.5 px-3">Lịch Hẹn Tới</th>
                  <th className="py-2.5 px-3">Tranh Đang Quan Tâm & Giá Deal</th>
                  <th className="py-2.5 px-3">Ghi Chú Nhu Cầu</th>
                  <th className="py-2.5 px-3 w-20 text-center">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE5D9]">
                {filteredCustomers.map((c, idx) => {
                  const appStatus = getAppointmentStatus(c.ngay_hen);
                  const interestList = Array.isArray(c.interests) ? c.interests : [];

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onOpenDetail(c)}
                      className="hover:bg-[#FAF8F5] cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-stone-400 font-semibold">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-bold text-stone-900 group-hover:text-[#7D1818] transition-colors text-[12px] block">
                          {c.ho_ten}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">ID: KH-{c.id}</span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-stone-700">
                        {c.so_dien_thoai ? (
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Phone className="w-3 h-3 text-stone-400" />
                            <span>{c.so_dien_thoai}</span>
                          </span>
                        ) : (
                          <span className="italic text-stone-400">Chưa có</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {c.ngay_hen ? (
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <span className="font-mono text-stone-800 font-medium whitespace-nowrap">
                              {c.ngay_hen.replace('T', ' ')}
                            </span>
                            {appStatus && (
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap shrink-0 ${appStatus.color}`}>
                                {appStatus.label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="italic text-stone-400">Chưa hẹn</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {interestList.length === 0 ? (
                          <span className="italic text-stone-400">Chưa chọn tranh</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {interestList.map((item, iIdx) => (
                              <span
                                key={iIdx}
                                className="inline-flex items-center gap-1 bg-[#FAF8F5] border border-[#DDD5C4] px-1.5 py-0.5 rounded text-[10.5px]"
                              >
                                <strong className="font-mono text-[#7D1818]">{item.painting_id}</strong>
                                {item.deal_price !== null && item.deal_price !== undefined && (
                                  <span className="font-mono font-bold text-emerald-800">
                                    (${Number(item.deal_price).toLocaleString()})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-stone-600 max-w-[200px] truncate">
                        {c.ghi_chu || <span className="italic text-stone-400">—</span>}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetail(c);
                          }}
                          className="w-7 h-7 bg-[#FAF8F5] hover:bg-[#7D1818] text-stone-600 hover:text-white rounded border border-[#EAE5D9] mx-auto flex items-center justify-center transition-colors shadow-2xs"
                          title="Xem hồ sơ chi tiết & deal giá"
                        >
                          <Eye className="w-3.5 h-3.5" />
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
    </div>
  );
}
