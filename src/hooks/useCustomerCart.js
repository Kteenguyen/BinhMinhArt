// src/hooks/useCustomerCart.js
/**
 * ==============================================================================
 * BinhMinhArt Gallery - Customer Cart & Deal Workspace State Hook
 * Dual-layer persistence: localStorage + debounced backend API PUT /api/customers/:id/cart
 * Real-time financial calculations (total listed, total deal, discount amount, discount %, VND preview)
 * Quick discount math: Math.round(listed * (1 - pct / 100))
 * ==============================================================================
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { parseNumericPrice } from '../utils/currency';

export function useCustomerCart({ customerId, isOpen, paintings = [] }) {
  const [cartItems, setCartItems] = useState([]);
  const [invoiceCode, setInvoiceCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('vietqr');
  const [dealNotes, setDealNotes] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const isInitialHydratedRef = useRef(false);

  const storageKey = customerId ? `binhminhart_cart_customer_${customerId}` : null;

  // 1. Initial Hydration (LocalStorage + Backend Sync)
  useEffect(() => {
    if (!isOpen || !customerId) {
      setCartItems([]);
      setInvoiceCode('');
      setPaymentMethod('vietqr');
      setDealNotes('');
      isInitialHydratedRef.current = false;
      return;
    }

    let isMounted = true;
    let localFound = false;

    // Layer 1: LocalStorage instant recovery
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
        if (Array.isArray(items) && items.length > 0) {
          setCartItems(
            items.map(it => ({
              painting_id: String(it.painting_id || '').trim(),
              deal_price: parseNumericPrice(it.deal_price),
              note: String(it.note || '').trim()
            }))
          );
          if (!Array.isArray(parsed)) {
            if (parsed.invoice_code) setInvoiceCode(parsed.invoice_code);
            if (parsed.payment_method) setPaymentMethod(parsed.payment_method);
            if (parsed.notes) setDealNotes(parsed.notes);
          }
          localFound = true;
        }
      }
    } catch (e) {
      console.warn('[useCustomerCart] LocalStorage read warning:', e);
    }

    // Layer 2: Backend API sync
    const fetchServerCart = async () => {
      try {
        const res = await fetch(`/api/customers/${customerId}/cart`);
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          const serverItems = (json.data.items || []).map(it => ({
            painting_id: String(it.painting_id || '').trim(),
            deal_price: it.deal_price !== null && it.deal_price !== undefined ? Number(it.deal_price) : null,
            note: String(it.note || '').trim()
          }));

          // If no local edits were cached, seed from server
          if (!localFound && serverItems.length > 0) {
            setCartItems(serverItems);
            try {
              const draft = {
                customerId,
                items: serverItems,
                invoice_code: '',
                payment_method: 'vietqr',
                notes: '',
                updated_at: new Date().toISOString()
              };
              localStorage.setItem(storageKey, JSON.stringify(draft));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('[useCustomerCart] Server cart fetch warning:', err);
      } finally {
        if (isMounted) isInitialHydratedRef.current = true;
      }
    };

    fetchServerCart();

    return () => {
      isMounted = false;
    };
  }, [isOpen, customerId, storageKey]);

  // 2. Debounced Persistence (LocalStorage + PUT /api/customers/:id/cart)
  useEffect(() => {
    if (!isOpen || !customerId || !isInitialHydratedRef.current) return;

    // Instant Layer 1 Sync to LocalStorage
    try {
      const cleanItems = cartItems.map(it => ({
        painting_id: it.painting_id,
        deal_price: parseNumericPrice(it.deal_price),
        note: it.note || ''
      }));
      const draft = {
        customerId,
        items: cleanItems,
        invoice_code: invoiceCode,
        payment_method: paymentMethod,
        notes: dealNotes,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (e) {
      console.warn('[useCustomerCart] LocalStorage write warning:', e);
    }

    // Debounced Layer 2 Sync (600ms) to backend
    const timer = setTimeout(async () => {
      try {
        setIsSyncing(true);
        const payload = {
          items: cartItems.map(it => ({
            painting_id: it.painting_id,
            deal_price: parseNumericPrice(it.deal_price),
            note: it.note || ''
          }))
        };
        await fetch(`/api/customers/${customerId}/cart`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('[useCustomerCart] Background cart PUT warning:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [cartItems, invoiceCode, paymentMethod, dealNotes, customerId, isOpen, storageKey]);

  // 3. Actions
  const addToCart = (painting) => {
    if (!painting || !painting.id) return false;
    if (painting.tinh_trang === 'da_ban') return false; // Strictly reject sold artworks

    let added = false;
    setCartItems(prev => {
      const exists = prev.some(it => String(it.painting_id).trim() === String(painting.id).trim());
      if (exists) return prev; // Duplicate blocked

      added = true;
      const initialDealPrice = typeof painting.gia === 'number' && Number.isFinite(painting.gia) && painting.gia >= 0
        ? painting.gia
        : null;

      return [
        ...prev,
        {
          painting_id: painting.id,
          deal_price: initialDealPrice,
          note: ''
        }
      ];
    });
    return added;
  };

  const removeFromCart = (paintingId) => {
    setCartItems(prev => prev.filter(it => it.painting_id !== paintingId));
  };

  const updateDealPrice = (paintingId, newPrice) => {
    const cleanNum = parseNumericPrice(newPrice);
    setCartItems(prev => prev.map(it => (
      it.painting_id === paintingId ? { ...it, deal_price: cleanNum } : it
    )));
  };

  const applyDiscountPercent = (paintingId, percent) => {
    setCartItems(prev => prev.map(it => {
      if (it.painting_id !== paintingId) return it;
      const p = paintings.find(pt => String(pt.id).trim() === String(paintingId).trim());
      const listed = p && typeof p.gia === 'number' && Number.isFinite(p.gia) && p.gia > 0 ? p.gia : 0;
      if (listed > 0) {
        const discounted = Math.round(listed * (1 - percent / 100));
        return { ...it, deal_price: discounted };
      }
      return it;
    }));
  };

  const updateItemNote = (paintingId, note) => {
    setCartItems(prev => prev.map(it => (
      it.painting_id === paintingId ? { ...it, note: note || '' } : it
    )));
  };

  const clearCart = () => {
    setCartItems([]);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {
        console.warn('[useCustomerCart] LocalStorage remove warning:', e);
      }
    }
  };

  // 4. Real-time Financial Calculations Engine
  const calculations = useMemo(() => {
    let totalListed = 0;
    let totalDeal = 0;
    let availableCount = 0;
    let soldCount = 0;
    let hasUnpricedWithoutDeal = false;

    cartItems.forEach((item) => {
      const p = paintings.find((pt) => String(pt.id).trim() === String(item.painting_id).trim());
      const isSold = p ? p.tinh_trang === 'da_ban' : false;
      const listed = p && typeof p.gia === 'number' && Number.isFinite(p.gia) && p.gia > 0 ? p.gia : 0;

      if (isSold) {
        soldCount++;
      } else {
        availableCount++;
        totalListed += listed;

        const dealVal = typeof item.deal_price === 'number' && Number.isFinite(item.deal_price) && item.deal_price >= 0
          ? item.deal_price
          : null;

        if (dealVal !== null) {
          totalDeal += dealVal;
        } else if (listed > 0) {
          totalDeal += listed;
        } else {
          hasUnpricedWithoutDeal = true;
        }
      }
    });

    const totalDiscountAmount = totalListed > 0 && totalDeal < totalListed ? totalListed - totalDeal : 0;
    const avgDiscountPercent = totalListed > 0 && totalDiscountAmount > 0
      ? Math.round((totalDiscountAmount / totalListed) * 100)
      : 0;

    const canCheckout = cartItems.length > 0 && soldCount === 0 && availableCount > 0 && !hasUnpricedWithoutDeal;

    const exchangeRate = 25400;
    const totalDealVnd = Math.round(totalDeal * exchangeRate);

    return {
      totalListed,
      totalDeal,
      totalListedPrice: totalListed,
      totalDealPrice: totalDeal,
      discountAmount: totalDiscountAmount,
      totalDiscountAmount,
      discountPercent: avgDiscountPercent,
      avgDiscountPercent,
      count: cartItems.length,
      itemCount: cartItems.length,
      availableCount,
      soldCount,
      canCheckout,
      hasUnpricedWithoutDeal,
      exchangeRate,
      totalDealVnd
    };
  }, [cartItems, paintings]);

  return {
    cartItems,
    setCartItems,
    invoiceCode,
    setInvoiceCode,
    paymentMethod,
    setPaymentMethod,
    dealNotes,
    setDealNotes,
    isSyncing,
    calculations,
    addToCart,
    removeFromCart,
    updateDealPrice,
    applyDiscountPercent,
    updateItemNote,
    clearCart
  };
}

export default useCustomerCart;
