// server/customerStore.js
import sheetDB from './googleSheetSingleton.js';

/**
 * Google Sheets storage for Customers & CRM (tabs: customers & customer_interests).
 */
export const CUSTOMER_SCHEMA_VERSION = 1;

export function createCustomerStore(_dbPath) {
  function getInterestsForCustomer(customerId) {
    return sheetDB
      .getAll('customer_interests')
      .filter(ci => Number(ci.customer_id) === Number(customerId))
      .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
  }

  return {
    raw: sheetDB,

    listCustomers() {
      const customers = [...sheetDB.getAll('customers')].sort(
        (a, b) => (Number(b.id) || 0) - (Number(a.id) || 0)
      );
      return customers.map(c => ({
        ...c,
        interests: getInterestsForCustomer(c.id)
      }));
    },

    getCustomer(id) {
      const targetId = Number(id);
      const c = sheetDB.getById('customers', targetId, 'id');
      if (!c) return null;
      return {
        ...c,
        interests: getInterestsForCustomer(targetId)
      };
    },

    createCustomer(data) {
      const hoTen = String(data.ho_ten || '').trim();
      if (!hoTen) {
        throw new Error('Tên khách hàng không được để trống');
      }
      const sdt = String(data.so_dien_thoai || '').trim();
      const email = String(data.email || '').trim();
      const diaChi = String(data.dia_chi || '').trim();
      const ngayHen = String(data.ngay_hen || '').trim();
      const ghiChu = String(data.ghi_chu || '').trim();
      const today = new Date().toISOString().slice(0, 10);
      const ngayTao = data.ngay_tao || today;
      const ngayCapNhat = data.ngay_cap_nhat || today;

      const created = sheetDB.insert('customers', {
        ho_ten: hoTen,
        so_dien_thoai: sdt,
        email,
        dia_chi: diaChi,
        ngay_hen: ngayHen,
        ghi_chu: ghiChu,
        ngay_tao: ngayTao,
        ngay_cap_nhat: ngayCapNhat
      });

      const customerId = created.id;

      if (Array.isArray(data.interests) && data.interests.length > 0) {
        for (const item of data.interests) {
          if (!item.painting_id) continue;
          let dp = null;
          if (item.deal_price !== null && item.deal_price !== undefined && item.deal_price !== '') {
            const num = Number(item.deal_price);
            if (!isNaN(num) && num >= 0) dp = num;
          }
          sheetDB.insert('customer_interests', {
            customer_id: customerId,
            painting_id: String(item.painting_id).trim(),
            deal_price: dp,
            note: String(item.note || '').trim(),
            created_at: item.created_at || today
          });
        }
      }

      return this.getCustomer(customerId);
    },

    updateCustomer(id, data) {
      const targetId = Number(id);
      const existing = sheetDB.getById('customers', targetId, 'id');
      if (!existing) {
        throw new Error(`Không tìm thấy khách hàng với ID ${targetId}`);
      }

      const hoTen = data.ho_ten !== undefined ? String(data.ho_ten).trim() : existing.ho_ten;
      if (!hoTen) {
        throw new Error('Tên khách hàng không được để trống');
      }
      const sdt = data.so_dien_thoai !== undefined ? String(data.so_dien_thoai).trim() : existing.so_dien_thoai;
      const email = data.email !== undefined ? String(data.email).trim() : existing.email;
      const diaChi = data.dia_chi !== undefined ? String(data.dia_chi).trim() : existing.dia_chi;
      const ngayHen = data.ngay_hen !== undefined ? String(data.ngay_hen).trim() : existing.ngay_hen;
      const ghiChu = data.ghi_chu !== undefined ? String(data.ghi_chu).trim() : existing.ghi_chu;
      const today = new Date().toISOString().slice(0, 10);

      sheetDB.update('customers', targetId, {
        ho_ten: hoTen,
        so_dien_thoai: sdt,
        email,
        dia_chi: diaChi,
        ngay_hen: ngayHen,
        ghi_chu: ghiChu,
        ngay_cap_nhat: today
      });

      if (Array.isArray(data.interests)) {
        // Xóa các interests cũ của khách hàng này và cập nhật danh sách mới
        const remainingInterests = sheetDB
          .getAll('customer_interests')
          .filter(ci => Number(ci.customer_id) !== targetId);

        let maxId = remainingInterests.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
        const newCustomerInterests = [];

        for (const item of data.interests) {
          if (!item.painting_id) continue;
          let dp = null;
          if (item.deal_price !== null && item.deal_price !== undefined && item.deal_price !== '') {
            const num = Number(item.deal_price);
            if (!isNaN(num) && num >= 0) dp = num;
          }
          maxId += 1;
          newCustomerInterests.push({
            id: maxId,
            customer_id: targetId,
            painting_id: String(item.painting_id).trim(),
            deal_price: dp,
            note: String(item.note || '').trim(),
            created_at: item.created_at || today
          });
        }

        sheetDB.replaceAll('customer_interests', [...remainingInterests, ...newCustomerInterests]);
      }

      return this.getCustomer(targetId);
    },

    deleteCustomer(id) {
      const targetId = Number(id);
      sheetDB.delete('customers', targetId, 'id');
      return true;
    },

    addInterest(customerId, paintingId, dealPrice = null, note = '') {
      const today = new Date().toISOString().slice(0, 10);
      let dp = null;
      if (dealPrice !== null && dealPrice !== undefined && dealPrice !== '') {
        const num = Number(dealPrice);
        if (!isNaN(num) && num >= 0) dp = num;
      }
      sheetDB.insert('customer_interests', {
        customer_id: Number(customerId),
        painting_id: String(paintingId).trim(),
        deal_price: dp,
        note: String(note || '').trim(),
        created_at: today
      });
      return this.getCustomer(Number(customerId));
    },

    removeInterest(interestId) {
      sheetDB.delete('customer_interests', Number(interestId), 'id');
      return true;
    },

    close() { }
  };
}