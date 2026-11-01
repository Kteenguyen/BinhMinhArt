/**
 * Column definitions for Sub-tab 1: KHO TRANH (Chưa bán)
 * Các cột liên quan đến sản phẩm đã bán (Ngày bán, Mã hoá đơn, Khách hàng) đã được chuyển sang SOLD_COLUMNS (Sub-tab Đã Bán).
 */
export const DEFAULT_COLUMNS = [
  {
    id: 'hinh_anh',
    label: 'Ảnh',
    width: 68,
    minWidth: 60,
    isEditable: false,
    type: 'image',
    description: 'Ảnh đại diện tác phẩm',
    visible: true,
  },
  {
    id: 'id',
    label: 'Mã Tranh',
    width: 115,
    minWidth: 95,
    isEditable: false,
    type: 'text',
    description: 'Mã định danh duy nhất (Nhấn để mở Trang Chi Tiết Tác Phẩm)',
    visible: true,
  },
  {
    id: 'qr_code',
    label: 'Mã QR',
    width: 78,
    minWidth: 70,
    isEditable: false,
    type: 'qr',
    description: 'Mã QR định danh từ Mã Tranh (Quét hoặc nhấn để mở Trang Chi Tiết)',
    visible: true,
  },
  {
    id: 'ten_tac_pham',
    label: 'Tên Tác Phẩm',
    width: 170,
    minWidth: 130,
    isEditable: false,
    type: 'text',
    description: 'Tên bức tranh hội họa',
    visible: true,
  },
  {
    id: 'tac_gia',
    label: 'Tác Giả',
    width: 135,
    minWidth: 110,
    isEditable: false,
    type: 'text',
    description: 'Họa sĩ sáng tác',
    visible: true,
  },
  {
    id: 'chat_lieu',
    label: 'Chất Liệu',
    width: 110,
    minWidth: 90,
    isEditable: false,
    type: 'select',
    options: ['Sơn mài', 'Sơn dầu', 'Lụa', 'Màu nước', 'Khác'],
    description: 'Chất liệu tranh',
    visible: true,
  },
  {
    id: 'location',
    label: 'Vị Trí',
    width: 125,
    minWidth: 100,
    isEditable: false,
    type: 'text',
    description: 'Vị trí hiện tại của tác phẩm (Kho, Khu vực 1, Phòng khách...)',
    visible: true,
  },
  {
    id: 'gia',
    label: 'Giá',
    width: 95,
    minWidth: 80,
    isEditable: false,
    type: 'price',
    description: 'Giá niêm yết bán (USD)',
    visible: true,
  },
  {
    id: 'ngay_cap_nhat_gia_gan_nhat',
    label: 'Cập Nhật Giá',
    width: 115,
    minWidth: 95,
    isEditable: false,
    type: 'date',
    description: 'Ngày đổi giá gần nhất',
    visible: true,
  },
  {
    id: 'kich_thuoc_tranh',
    label: 'KT Tranh',
    width: 115,
    minWidth: 95,
    isEditable: false,
    type: 'text',
    description: 'Kích thước tranh (VD: 80x60cm, H100)',
    visible: true,
  },
  {
    id: 'kich_thuoc_khung_tranh',
    label: 'KT Khung',
    width: 135,
    minWidth: 105,
    isEditable: false,
    type: 'text',
    description: 'Kích thước & mô tả khung tranh',
    visible: true,
  },
  {
    id: 'nam_sang_tac',
    label: 'Năm Sáng Tác',
    width: 105,
    minWidth: 90,
    isEditable: false,
    type: 'text',
    description: 'Năm vẽ (YYYY hoặc YYYY-YYYY)',
    visible: true,
  },
  {
    id: 'ngay_mua_vao',
    label: 'Ngày Mua Vào',
    width: 115,
    minWidth: 95,
    isEditable: false,
    type: 'date',
    description: 'Ngày nhập kho gallery',
    visible: true,
  },
  {
    id: 'giay_chung_nhan',
    label: 'Giấy CN',
    width: 90,
    minWidth: 75,
    isEditable: false,
    type: 'select',
    options: ['Yes', 'No'],
    description: 'Giấy chứng nhận tác quyền',
    visible: true,
  },
  {
    id: 'ngay_them',
    label: 'Ngày Thêm',
    width: 115,
    minWidth: 95,
    isEditable: false,
    type: 'date',
    description: 'Ngày tạo hồ sơ tác phẩm',
    visible: false,
  },
  {
    id: 'ngay_cap_nhat_san_pham',
    label: 'Ngày Cập Nhật SP',
    width: 140,
    minWidth: 125,
    isEditable: false,
    type: 'text',
    description: 'Thời điểm cập nhật sản phẩm gần nhất (DD-MM-YYYY)',
    visible: true,
  },
  {
    id: 'da_in_tag',
    label: 'In Tag',
    width: 95,
    minWidth: 85,
    isEditable: false,
    type: 'tag_status',
    description: 'Trạng thái in tem nhãn tag trưng bày 10x4cm',
    visible: true,
  },
  {
    id: 'actions',
    label: 'Thao Tác',
    width: 120,
    minWidth: 110,
    isEditable: false,
    type: 'action',
    description: 'Nút Cập nhật, Chi tiết & Đã bán',
    visible: true,
  }
];

/**
 * Column definitions for Sub-tab 2: ĐÃ BÁN (Chứa các cột thông tin sản phẩm đã bán: Ngày Bán, Mã Hoá Đơn, Giá Bán, Khách Hàng)
 */
export const SOLD_COLUMNS = [
  {
    id: 'hinh_anh',
    label: 'Ảnh',
    width: 68,
    minWidth: 60,
    isEditable: false,
    type: 'image',
    description: 'Ảnh đại diện tác phẩm đã bán',
    visible: true,
  },
  {
    id: 'id',
    label: 'Mã Tranh',
    width: 115,
    minWidth: 95,
    isEditable: false,
    type: 'text',
    description: 'Mã định danh duy nhất',
    visible: true,
  },
  {
    id: 'qr_code',
    label: 'Mã QR',
    width: 78,
    minWidth: 70,
    isEditable: false,
    type: 'qr',
    description: 'Mã QR tra cứu nhanh tác phẩm',
    visible: true,
  },
  {
    id: 'ten_tac_pham',
    label: 'Tên Tác Phẩm',
    width: 170,
    minWidth: 130,
    isEditable: false,
    type: 'text',
    description: 'Tên bức tranh đã bán',
    visible: true,
  },
  {
    id: 'tac_gia',
    label: 'Tác Giả',
    width: 135,
    minWidth: 110,
    isEditable: false,
    type: 'text',
    description: 'Họa sĩ sáng tác',
    visible: true,
  },
  {
    id: 'chat_lieu',
    label: 'Chất Liệu',
    width: 105,
    minWidth: 90,
    isEditable: false,
    type: 'select',
    options: ['Sơn mài', 'Sơn dầu', 'Lụa', 'Màu nước', 'Khác'],
    description: 'Chất liệu tranh',
    visible: true,
  },
  {
    id: 'location',
    label: 'Vị Trí',
    width: 125,
    minWidth: 100,
    isEditable: false,
    type: 'text',
    description: 'Vị trí hiện tại của tác phẩm',
    visible: true,
  },
  {
    id: 'kich_thuoc_tranh',
    label: 'KT Tranh',
    width: 110,
    minWidth: 90,
    isEditable: false,
    type: 'text',
    description: 'Kích thước tranh',
    visible: true,
  },
  {
    id: 'nam_sang_tac',
    label: 'Năm Sáng Tác',
    width: 100,
    minWidth: 85,
    isEditable: false,
    type: 'text',
    description: 'Năm sáng tác',
    visible: true,
  },
  {
    id: 'gia',
    label: 'Giá',
    width: 95,
    minWidth: 80,
    isEditable: false,
    type: 'price',
    description: 'Giá chốt bán thực tế ($ USD)',
    visible: true,
  },
  {
    id: 'ngay_ban',
    label: 'Ngày Bán',
    width: 120,
    minWidth: 105,
    isEditable: false,
    type: 'date',
    description: 'Ngày xuất bán tác phẩm (DD-MM-YYYY)',
    visible: true,
  },
  {
    id: 'hoa_don',
    label: 'Mã Hoá Đơn',
    width: 130,
    minWidth: 110,
    isEditable: false,
    type: 'text',
    description: 'Mã hoá đơn giao dịch',
    visible: true,
  },
  {
    id: 'khach_hang',
    label: 'Khách Hàng',
    width: 150,
    minWidth: 120,
    isEditable: false,
    type: 'text',
    description: 'Khách hàng / Nhà sưu tập mua tranh',
    visible: true,
  },
  {
    id: 'giay_chung_nhan',
    label: 'Giấy CN',
    width: 90,
    minWidth: 75,
    isEditable: false,
    type: 'select',
    options: ['Yes', 'No'],
    description: 'Giấy chứng nhận tác quyền',
    visible: true,
  },
  {
    id: 'ngay_cap_nhat_san_pham',
    label: 'Ngày Cập Nhật SP',
    width: 140,
    minWidth: 125,
    isEditable: false,
    type: 'text',
    description: 'Ngày cập nhật sản phẩm (DD-MM-YYYY)',
    visible: true,
  },
  {
    id: 'da_in_tag',
    label: 'In Tag',
    width: 95,
    minWidth: 85,
    isEditable: false,
    type: 'tag_status',
    description: 'Trạng thái in tem nhãn tag trưng bày 10x4cm',
    visible: true,
  },
  {
    id: 'actions',
    label: 'Thao Tác',
    width: 120,
    minWidth: 110,
    isEditable: false,
    type: 'action',
    description: 'Hoàn kho, Chi tiết & Cập nhật',
    visible: true,
  }
];

export const STORAGE_KEY_COLUMNS = 'binhminhart_column_order_v4';
export const STORAGE_KEY_SOLD_COLUMNS = 'binhminhart_column_order_sold_v4';
export const STORAGE_KEY_VISIBILITY = 'binhminhart_column_visibility_v4';

/**
 * Loads columns with saved order & visibility from storage, with rock-solid fallback
 * and guarantee that 'actions' is always the last column and always visible.
 */
export function loadColumns(presetColumns, orderStorageKey, visibilityStorageKey, customStorage) {
  if (!Array.isArray(presetColumns)) return [];
  try {
    const storage = customStorage || (typeof window !== 'undefined' ? window.localStorage : null);
    let savedOrder = null;
    let savedVisibility = null;
    if (storage) {
      try {
        savedOrder = storage.getItem(orderStorageKey);
      } catch {
        savedOrder = null;
      }
      try {
        savedVisibility = storage.getItem(visibilityStorageKey);
      } catch {
        savedVisibility = null;
      }
    }
    let cols = presetColumns.map(c => ({ ...c }));

    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        if (Array.isArray(orderIds)) {
          const colMap = new Map(cols.map(c => [c.id, c]));
          const reordered = [];
          orderIds.forEach(id => {
            if (colMap.has(id)) {
              reordered.push(colMap.get(id));
              colMap.delete(id);
            }
          });
          colMap.forEach(c => reordered.push(c));
          cols = reordered;
        }
      } catch {
        // Keep preset column order if savedOrder is corrupted or not an array
      }
    }

    if (savedVisibility) {
      try {
        const visMap = JSON.parse(savedVisibility);
        if (visMap && typeof visMap === 'object' && !Array.isArray(visMap)) {
          cols = cols.map(c => ({
            ...c,
            visible: c.id === 'actions' ? true : (visMap[c.id] !== undefined ? Boolean(visMap[c.id]) : (c.visible !== false))
          }));
        }
      } catch {
        // Keep existing visibility if savedVisibility is corrupted
      }
    }

    // Guarantee actions column is always the very last column and visible
    const nonActions = cols.filter(c => c.id !== 'actions');
    const actionCol = cols.find(c => c.id === 'actions') || presetColumns.find(c => c.id === 'actions') || {
      id: 'actions',
      label: 'Thao Tác',
      width: 120,
      minWidth: 110,
      isEditable: false,
      type: 'action',
      description: 'Nút Cập nhật, Chi tiết & Đã bán',
      visible: true
    };
    return [...nonActions, { ...actionCol, visible: true }];
  } catch {
    return Array.isArray(presetColumns) ? presetColumns.map(c => ({ ...c })) : [];
  }
}

export function formatUSD(value, emptyFallback = 'Đang cập nhật') {
  if (value === null || value === undefined || value === '') {
    return emptyFallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) return emptyFallback;
  return `$${num.toLocaleString('en-US')}`;
}

export function formatDateVN(dateStr, emptyFallback = 'Đang cập nhật') {
  if (!dateStr || String(dateStr).trim() === '') return emptyFallback;
  const rawStr = String(dateStr).trim();
  const datePart = rawStr.split(/[T\s]+/)[0];
  // Standardize to DD-MM-YYYY
  if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> DD-MM-YYYY
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else if (parts[2].length === 2) {
        // DD-MM-YY -> DD-MM-YYYY
        return `${parts[0]}-${parts[1]}-20${parts[2]}`;
      }
      return datePart;
    }
  } else if (datePart.includes('/')) {
    const parts = datePart.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD -> DD-MM-YYYY
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else if (parts[2].length === 4) {
        // DD/MM/YYYY -> DD-MM-YYYY
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
    }
  }
  return datePart;
}
