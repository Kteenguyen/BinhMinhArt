// src/components/deal-workspace/DealCartColumn.jsx
/**
 * ==============================================================================
 * BinhMinhArt Gallery - Deal Cart Column (Left Column)
 * Rapid search with Vietnamese diacritic-insensitive matching
 * Quick-add picker: Strictly filters out sold artworks (tinh_trang === 'da_ban')
 * Artwork cart cards with thumbnail, listed price, CurrencyInput for deal price,
 * quick discount pills (-5%, -10%, -15%, -20%), item notes, remove button,
 * and sold concurrency warning banner.
 * High-Density Compact UX Directive: button height 32-34px, font 11-11.5px (font-weight: 600)
 * ==============================================================================
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Plus,
  Trash2,
  Tag,
  AlertTriangle,
  ShoppingCart,
  Percent
} from 'lucide-react';
import { formatUSD } from '../../types';
import { formatThousands } from '../../utils/currency';
import { matchArtistQuery, removeVietnameseTones } from '../../utils/vietnameseSearch';
import CurrencyInput from '../ui/CurrencyInput';

export default function DealCartColumn({
  cartItems = [],
  paintings = [],
  onAddToCart,
  onUpdateDealPrice,
  onApplyDiscount,
  onUpdateNote,
  onRemoveItem,
  onClearCart,
  onOpenLightbox
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Filter available paintings for quick-add (strictly exclude sold and already in cart)
  const matchingPaintings = useMemo(() => {
    const rawQ = searchQuery.trim().toLowerCase();
    if (!rawQ) return [];

    const cleanQ = removeVietnameseTones(searchQuery);
    const existingCartIds = new Set(cartItems.map(i => String(i.painting_id || '').trim()));

    return paintings
      .filter((p) => {
        // 1. Strictly filter out sold artworks
        if (p.tinh_trang === 'da_ban') return false;

        // 2. Filter out artworks already in cart
        if (existingCartIds.has(String(p.id || '').trim())) return false;

        // 3. Multi-field Vietnamese diacritic-insensitive matching
        const pId = (p.id || '').toLowerCase();
        const pTitle = (p.ten_tac_pham || '').toLowerCase();
        const pArtist = p.tac_gia || '';
        const pMedium = (p.chat_lieu || '').toLowerCase();

        const matchId = pId.includes(rawQ);
        const matchTitle = pTitle.includes(rawQ) || removeVietnameseTones(p.ten_tac_pham).includes(cleanQ);
        const matchArtist = matchArtistQuery(pArtist, rawQ).match;
        const matchMedium = pMedium.includes(rawQ) || removeVietnameseTones(p.chat_lieu).includes(cleanQ);

        return matchId || matchTitle || matchArtist || matchMedium;
      })
      .slice(0, 15); // Show top 15 matches for snappy UI
  }, [searchQuery, paintings, cartItems]);

  return (
    <div className="flex flex-col gap-3 min-w-0" data-testid="customer-deal__cart-column">
      {/* 1. Rapid Inventory Search & Quick-Add Drawer */}
      <div className="bg-[#FAF8F5] border border-[#DFCBAA] rounded-xl p-3 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between text-[11px] font-bold text-stone-700">
          <span>Tìm & thêm tác phẩm vào giỏ hàng:</span>
          <span className="text-[10px] text-stone-500 font-normal">Chỉ hiển thị tranh còn trong kho</span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã tranh (DVS-...), tên tác phẩm, họa sĩ, chất liệu..."
            className="w-full h-[32px] pl-8 pr-8 text-[11.5px] bg-white border border-[#DDD5C4] focus:border-[#7D1818] rounded-md focus:outline-none transition-colors"
            data-testid="customer-deal__search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 w-5 h-5 flex items-center justify-center cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick-Add Matching List Drawer */}
        {searchQuery.trim() && (
          <div className="max-h-[220px] overflow-y-auto divide-y divide-[#EAE5D9] bg-white border border-[#EAE5D9] rounded-lg shadow-inner">
            {matchingPaintings.length === 0 ? (
              <div className="p-3 text-center text-[11px] text-stone-500">
                Không tìm thấy tác phẩm khả dụng khớp với "<strong className="text-stone-700">{searchQuery}</strong>". (Tranh đã bán hoặc đã có trong giỏ sẽ bị ẩn).
              </div>
            ) : (
              matchingPaintings.map((p) => {
                const thumb = p.hinh_anh?.[0];
                return (
                  <div
                    key={p.id}
                    className="p-2 flex items-center justify-between gap-2 hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={p.id}
                          className="w-9 h-9 object-cover rounded border border-stone-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-[8.5px] text-stone-400 font-mono shrink-0">
                          No IMG
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-[#7D1818]">
                            {p.id}
                          </span>
                          <span className="text-[11.5px] font-bold text-stone-900 truncate">
                            {p.ten_tac_pham || 'Không tên'}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-stone-500 truncate">
                          {p.tac_gia || 'Chưa rõ tác giả'} {p.chat_lieu ? `• ${p.chat_lieu}` : ''} •{' '}
                          <span className="font-mono font-bold text-stone-800">
                            {p.gia ? formatUSD(p.gia) : 'Thỏa thuận'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onAddToCart(p);
                        setSearchQuery('');
                      }}
                      className="h-[28px] px-2.5 bg-[#7D1818] hover:bg-[#691212] text-white text-[10.5px] font-bold rounded flex items-center gap-1 transition-colors shrink-0 shadow-2xs cursor-pointer"
                      title="Thêm vào giỏ hàng deal"
                      data-testid={`customer-deal__btn-quick-add-${p.id}`}
                    >
                      <Plus className="w-3 h-3 text-[#F4E5B8]" />
                      <span>Thêm</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 2. Active Cart Items List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11.5px] font-bold text-stone-700 px-1">
          <span>Tác phẩm trong deal ({cartItems.length})</span>
          {cartItems.length > 0 && onClearCart && (
            <button
              type="button"
              onClick={onClearCart}
              className="text-stone-400 hover:text-red-600 text-[10.5px] font-semibold transition-colors cursor-pointer"
              title="Xóa toàn bộ tác phẩm trong giỏ"
            >
              Xóa toàn bộ giỏ
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="p-8 text-center bg-white border border-[#EAE5D9] rounded-xl shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto text-[#C58C00]">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h4 className="text-[12.5px] font-bold text-stone-800">Giỏ hàng deal đang trống</h4>
            <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
              Sử dụng thanh tìm kiếm ở trên để chọn tác phẩm từ kho và đàm phán giá chốt riêng cho khách hàng này.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cartItems.map((item, idx) => {
              const p = paintings.find(pt => String(pt.id || '').trim() === String(item.painting_id || '').trim());
              const isSold = p ? p.tinh_trang === 'da_ban' : false;
              const listedPrice = p && typeof p.gia === 'number' && Number.isFinite(p.gia) && p.gia > 0 ? p.gia : 0;
              const currentDeal = typeof item.deal_price === 'number' && Number.isFinite(item.deal_price) ? item.deal_price : null;
              const discountDiff = listedPrice > 0 && currentDeal !== null && currentDeal < listedPrice
                ? listedPrice - currentDeal
                : 0;
              const thumb = p?.hinh_anh?.[0];

              return (
                <div
                  key={item.painting_id || idx}
                  className={`p-3 rounded-xl border transition-all ${
                    isSold
                      ? 'bg-rose-50/70 border-rose-300 shadow-2xs'
                      : 'bg-white border-[#EAE5D9] hover:border-[#DFCBAA] shadow-2xs'
                  }`}
                  data-testid={`cart-card--${item.painting_id}`}
                >
                  {/* Top: Thumbnail + Metadata + Listed + Remove */}
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.painting_id}
                          onClick={() => onOpenLightbox && onOpenLightbox(thumb, p?.ten_tac_pham, p?.tac_gia)}
                          className="w-12 h-12 object-cover rounded-md border border-stone-200 cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-stone-100 border border-stone-200 flex items-center justify-center text-[9px] text-stone-400 font-mono">
                          No IMG
                        </div>
                      )}
                      {isSold && (
                        <span className="absolute -top-1.5 -left-1.5 px-1 py-0.2 bg-red-600 text-white text-[8.5px] font-bold rounded shadow-2xs">
                          Đã bán
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] font-bold text-[#7D1818]">
                          {item.painting_id}
                        </span>
                        <span className="text-[11px] font-mono font-medium text-stone-500">
                          Niêm yết:{' '}
                          <strong className="text-stone-800">
                            {listedPrice > 0 ? formatUSD(listedPrice) : 'Thỏa thuận'}
                          </strong>
                        </span>
                      </div>

                      <h4 className="text-[12px] font-bold text-stone-900 truncate leading-snug">
                        {p?.ten_tac_pham || item.painting_id}
                      </h4>
                      <p className="text-[10.5px] text-stone-500 truncate">
                        {p?.tac_gia || 'Chưa rõ tác giả'} {p?.chat_lieu ? `• ${p.chat_lieu}` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.painting_id)}
                      className="w-7 h-7 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      title="Xóa khỏi giỏ hàng"
                      data-testid={`cart-card__remove-btn--${item.painting_id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Sold Concurrency Warning Banner */}
                  {isSold && (
                    <div className="mt-2 p-1.5 bg-red-100/90 border border-red-300 rounded-md text-[10.5px] text-red-800 font-semibold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>⚠️ Tác phẩm này đã được bán trước đó, vui lòng loại bỏ!</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.painting_id)}
                        className="text-red-700 underline text-[10px] font-bold hover:text-red-900 cursor-pointer shrink-0"
                      >
                        Loại bỏ
                      </button>
                    </div>
                  )}

                  {/* Negotiation & Quick Discount Row */}
                  <div className="mt-2.5 pt-2 border-t border-[#F0ECE1]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                      <label className="text-[10.5px] font-bold text-stone-700 flex items-center gap-1">
                        <span>Giá thương lượng ($ USD):</span>
                        {discountDiff > 0 && (
                          <span className="text-[9.5px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            -{(discountDiff / listedPrice * 100).toFixed(0)}% (↓{formatUSD(discountDiff)})
                          </span>
                        )}
                      </label>

                      {/* Quick Discount Pills */}
                      {listedPrice > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9.5px] text-stone-400 font-medium">Giảm nhanh:</span>
                          {[5, 10, 15, 20].map((pct) => {
                            const targetDiscounted = Math.round(listedPrice * (1 - pct / 100));
                            const isActive = currentDeal === targetDiscounted;
                            return (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => onApplyDiscount(item.painting_id, pct)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                                  isActive
                                    ? 'bg-[#7D1818] text-white border-[#7D1818]'
                                    : 'bg-[#FAF8F5] text-stone-700 border-[#DDD5C4] hover:bg-amber-100 hover:text-[#7D1818]'
                                }`}
                                title={`Giảm ${pct}% (còn ${formatUSD(targetDiscounted)})`}
                                data-testid={`cart-card__discount-pill-${pct}--${item.painting_id}`}
                              >
                                -{pct}%
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Price Input & Per-Item Note */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-5 relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-[11.5px] font-bold pointer-events-none">
                          $
                        </span>
                        <CurrencyInput
                          value={item.deal_price ?? ''}
                          onChange={(newVal) => onUpdateDealPrice(item.painting_id, newVal)}
                          placeholder={listedPrice ? formatThousands(listedPrice) : 'Thỏa thuận'}
                          className="w-full h-[32px] pl-6 pr-2.5 font-mono text-[12px] font-bold text-stone-900 bg-amber-50/40 focus:bg-white border border-amber-300 focus:border-[#7D1818] rounded-md focus:outline-none transition-colors"
                          data-testid={`cart-card__deal-price-input--${item.painting_id}`}
                        />
                      </div>

                      <div className="sm:col-span-7">
                        <input
                          type="text"
                          value={item.note || ''}
                          onChange={(e) => onUpdateNote(item.painting_id, e.target.value)}
                          placeholder="Ghi chú tác phẩm (khung, ưu đãi...)"
                          className="w-full h-[32px] px-2.5 text-[11px] bg-stone-50 focus:bg-white border border-[#DDD5C4] focus:border-stone-400 rounded-md focus:outline-none transition-colors"
                          data-testid={`cart-card__note-input--${item.painting_id}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
