import React from 'react';
import { Layers, CheckCircle2, DollarSign, Clock, Sparkles } from 'lucide-react';

export default function KpiCards({ stats, onFilterStatus }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 lg:gap-3.5 my-2.5">
      {/* 1. Tổng Tác Phẩm */}
      <div 
        onClick={() => onFilterStatus('all')}
        className="bg-white border border-[#EAE5D9] hover:border-stone-400 p-2.5 lg:p-3 rounded-lg shadow-sm cursor-pointer transition-all"
      >
        <div className="flex items-center justify-between text-stone-500 mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Tổng Kho Tranh</span>
          <Layers className="w-4 h-4 text-stone-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-xl lg:text-2xl font-semibold text-stone-900">
            {stats.totalCount || 0}
          </span>
          <span className="text-[11px] text-stone-500">tác phẩm</span>
        </div>
        <div className="text-[10.5px] text-stone-400 mt-1">
          HS. {stats.artistsCount || 1} Họa Sĩ
        </div>
      </div>

      {/* 2. Tranh Chưa Bán & Giá Trị Tồn Kho */}
      <div 
        onClick={() => onFilterStatus('chua_ban')}
        className="bg-white border border-[#EAE5D9] hover:border-emerald-300 p-2.5 lg:p-3 rounded-lg shadow-sm cursor-pointer transition-all"
      >
        <div className="flex items-center justify-between text-emerald-700 mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Đang Trưng Bày</span>
          <Sparkles className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-xl lg:text-2xl font-semibold text-emerald-800">
            {stats.inStockCount || 0}
          </span>
          <span className="text-[11px] font-medium text-emerald-600">chưa bán</span>
        </div>
        <div className="text-[11px] font-semibold text-emerald-700 mt-1">
          Trị giá: ${(stats.inStockValue || 0).toLocaleString()} USD
        </div>
      </div>

      {/* 3. Tranh Đã Bán & Doanh Thu */}
      <div 
        onClick={() => onFilterStatus('da_ban')}
        className="bg-white border border-[#EAE5D9] hover:border-amber-300 p-2.5 lg:p-3 rounded-lg shadow-sm cursor-pointer transition-all"
      >
        <div className="flex items-center justify-between text-amber-800 mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Đã Giao Dịch</span>
          <CheckCircle2 className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-xl lg:text-2xl font-semibold text-amber-900">
            {stats.soldCount || 0}
          </span>
          <span className="text-[11px] font-medium text-amber-700">đã bán</span>
        </div>
        <div className="text-[11px] font-semibold text-amber-800 mt-1">
          Doanh thu: ${(stats.soldRevenue || 0).toLocaleString()} USD
        </div>
      </div>

      {/* 4. Tranh Chờ Định Giá */}
      <div 
        onClick={() => onFilterStatus('pending_price')}
        className="bg-white border border-[#EAE5D9] hover:border-stone-400 p-2.5 lg:p-3 rounded-lg shadow-sm cursor-pointer transition-all"
      >
        <div className="flex items-center justify-between text-stone-500 mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Chờ Định Giá</span>
          <Clock className="w-4 h-4 text-stone-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-xl lg:text-2xl font-semibold text-stone-800">
            {stats.pendingPriceCount || 0}
          </span>
          <span className="text-[11px] text-stone-500">tác phẩm</span>
        </div>
        <div className="text-[10.5px] text-stone-500 mt-1">
          Trực tiếp thỏa thuận
        </div>
      </div>

      {/* 5. Phân Loại Chất Liệu Cốt Lõi */}
      <div className="col-span-2 sm:col-span-1 bg-white border border-[#EAE5D9] p-2.5 lg:p-3 rounded-lg shadow-sm">
        <div className="flex items-center justify-between text-stone-500 mb-1">
          <span className="text-[11px] font-medium tracking-wide uppercase">Chất Liệu Tranh</span>
          <Palette className="w-4 h-4 text-[#C5A059]" />
        </div>
        <div className="flex items-center justify-between text-[11.5px] font-medium text-stone-700 mt-1">
          <span>Sơn mài:</span>
          <span className="font-semibold text-stone-900">{stats.lacquerCount || 0} bức</span>
        </div>
        <div className="flex items-center justify-between text-[11.5px] font-medium text-stone-700 mt-0.5">
          <span>Sơn dầu:</span>
          <span className="font-semibold text-stone-900">{stats.oilCount || 0} bức</span>
        </div>
      </div>
    </div>
  );
}

function Palette(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  );
}
