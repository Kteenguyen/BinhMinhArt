import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { createCustomerStore } from './customerStore.js';

const DATA_DIR = path.resolve('data');
export const CUSTOMER_DB_FILE = path.join(DATA_DIR, 'customers.db');
export const CUSTOMER_EXCEL_FILE = path.resolve('exports', 'BinhMinhArt_Customers.xlsx');

let customerStore = null;

function getStore() {
  if (!customerStore) {
    customerStore = createCustomerStore(CUSTOMER_DB_FILE);
  }
  return customerStore;
}

export function listCustomers() {
  return getStore().listCustomers();
}

export function getCustomer(id) {
  return getStore().getCustomer(id);
}

export function createCustomer(data) {
  const c = getStore().createCustomer(data);
  scheduleCustomerExcelExport();
  return c;
}

export function updateCustomer(id, data) {
  const c = getStore().updateCustomer(id, data);
  scheduleCustomerExcelExport();
  return c;
}

export function deleteCustomer(id) {
  const res = getStore().deleteCustomer(id);
  scheduleCustomerExcelExport();
  return res;
}

export function addCustomerInterest(customerId, paintingId, dealPrice, note) {
  const res = getStore().addInterest(customerId, paintingId, dealPrice, note);
  scheduleCustomerExcelExport();
  return res;
}

export function removeCustomerInterest(interestId) {
  const res = getStore().removeInterest(interestId);
  scheduleCustomerExcelExport();
  return res;
}

// Excel Export for Customers
let exportTimer = null;
function scheduleCustomerExcelExport() {
  if (exportTimer) clearTimeout(exportTimer);
  exportTimer = setTimeout(runCustomerExcelExport, 800);
  exportTimer.unref();
}

export function runCustomerExcelExport() {
  try {
    const customers = getStore().listCustomers();
    const wb = buildCustomerExcelWorkbook(customers);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    fs.mkdirSync(path.dirname(CUSTOMER_EXCEL_FILE), { recursive: true });

    const tmpPath = `${CUSTOMER_EXCEL_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, CUSTOMER_EXCEL_FILE);
  } catch (err) {
    console.error('[Customer Excel Export] Failed:', err.message);
  }
}

export function buildCustomerExcelWorkbook(customers) {
  const sheet1Headers = [
    'Mã KH',
    'Họ và Tên',
    'Số Điện Thoại',
    'Email',
    'Địa Chỉ',
    'Lịch Hẹn',
    'Số Tranh Quan Tâm',
    'Tổng Giá Deal ($ USD)',
    'Ghi Chú',
    'Ngày Tạo'
  ];

  const sheet1Rows = customers.map(c => {
    const interestCount = Array.isArray(c.interests) ? c.interests.length : 0;
    const totalDeal = Array.isArray(c.interests)
      ? c.interests.reduce((sum, item) => sum + (Number(item.deal_price) || 0), 0)
      : 0;

    return [
      c.id,
      c.ho_ten,
      c.so_dien_thoai || '—',
      c.email || '—',
      c.dia_chi || '—',
      c.ngay_hen || '—',
      interestCount,
      totalDeal > 0 ? totalDeal : '—',
      c.ghi_chu || '—',
      c.ngay_tao || '—'
    ];
  });

  const wsCustomers = XLSX.utils.aoa_to_sheet([sheet1Headers, ...sheet1Rows]);
  wsCustomers['!cols'] = [
    { wch: 8 },  { wch: 24 }, { wch: 16 }, { wch: 22 }, { wch: 28 },
    { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 32 }, { wch: 14 }
  ];

  const sheet2Headers = [
    'Mã KH',
    'Tên Khách Hàng',
    'Số Điện Thoại',
    'Mã Tranh',
    'Giá Deal ($ USD)',
    'Ghi Chú Đàm Phán',
    'Ngày Thêm'
  ];

  const sheet2Rows = [];
  customers.forEach(c => {
    if (Array.isArray(c.interests)) {
      c.interests.forEach(item => {
        sheet2Rows.push([
          c.id,
          c.ho_ten,
          c.so_dien_thoai || '—',
          item.painting_id,
          item.deal_price !== null && item.deal_price !== undefined ? Number(item.deal_price) : 'Thỏa thuận',
          item.note || '—',
          item.created_at || '—'
        ]);
      });
    }
  });

  const wsInterests = XLSX.utils.aoa_to_sheet([sheet2Headers, ...sheet2Rows]);
  wsInterests['!cols'] = [
    { wch: 8 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 36 }, { wch: 14 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsCustomers, 'DANH SÁCH KHÁCH HÀNG');
  XLSX.utils.book_append_sheet(workbook, wsInterests, 'TRANH QUAN TÂM & DEAL GIÁ');
  return workbook;
}
