// server/vietqrService.js
import QRCode from 'qrcode';

export const DEFAULT_BANK_CONFIG = {
  bankId: process.env.VIETQR_BANK_BIN || '970422', // MBBank BIN
  bankName: process.env.VIETQR_BANK_NAME || 'MBBank',
  accountNo: process.env.VIETQR_ACCOUNT_NO || '0901234567',
  accountName: process.env.VIETQR_ACCOUNT_NAME || 'GALLERY BINH MINH',
  exchangeRate: Number(process.env.USD_TO_VND_RATE) || 25400,
  template: process.env.VIETQR_TEMPLATE || 'compact2',
  city: 'HA NOI'
};

/**
 * Format an EMVCo Tag-Length-Value chunk.
 */
export function formatTlv(tag, value) {
  if (value === undefined || value === null || value === '') return '';
  const strVal = String(value);
  const lenStr = String(strVal.length).padStart(2, '0');
  return `${tag}${lenStr}${strVal}`;
}

/**
 * Compute CRC16-CCITT (poly 0x1021, init 0xFFFF, no final XOR, uppercase hex 4 digits).
 */
export function computeCrc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Convert Vietnamese accented text to uppercase ASCII, removing prohibited symbols.
 */
export function sanitizeNapasMemo(rawMemo, maxLength = 50) {
  if (!rawMemo) return '';
  const unaccented = String(rawMemo)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  const sanitized = unaccented
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return sanitized.slice(0, maxLength);
}

/**
 * Sanitize merchant/account name for EMVCo Tag 59 (max 25 chars).
 */
export function sanitizeMerchantName(rawName, maxLength = 25) {
  return sanitizeNapasMemo(rawName, maxLength);
}

/**
 * Currency conversion from USD to integer VND.
 */
export function convertUsdToVnd(amountUsd, rate = DEFAULT_BANK_CONFIG.exchangeRate) {
  const numUsd = Number(amountUsd) || 0;
  const numRate = Number(rate) || DEFAULT_BANK_CONFIG.exchangeRate;
  if (numUsd <= 0) return 0;
  return Math.round(numUsd * numRate);
}

/**
 * Generate standard EMVCo VietQR string for NAPAS 247 fast transfer.
 */
export function generateVietQrEmvcoPayload(options = {}) {
  const bankId = String(options.bankId || DEFAULT_BANK_CONFIG.bankId);
  const accountNo = String(options.accountNo || DEFAULT_BANK_CONFIG.accountNo);
  const amountVnd = Number(options.amountVnd) || 0;
  const memo = sanitizeNapasMemo(options.memo || '', 50);
  const merchantName = sanitizeMerchantName(options.accountName || DEFAULT_BANK_CONFIG.accountName, 25);
  const city = sanitizeMerchantName(options.city || DEFAULT_BANK_CONFIG.city, 15);

  // Tag 00: Payload Format Indicator (01)
  let payload = formatTlv('00', '01');

  // Tag 01: Point of Initiation Method (12 = Dynamic for specific amount/transaction, 11 = Static)
  payload += formatTlv('01', amountVnd > 0 ? '12' : '11');

  // Tag 38: Merchant Account Information (VietQR AID A000000727)
  let sub38 = formatTlv('00', 'A000000727');
  const beneficiary = formatTlv('00', bankId) + formatTlv('01', accountNo);
  sub38 += formatTlv('01', beneficiary);
  sub38 += formatTlv('02', 'QRIBFTTA'); // Fast transfer to Account
  payload += formatTlv('38', sub38);

  // Tag 53: Transaction Currency (704 = VND)
  payload += formatTlv('53', '704');

  // Tag 54: Transaction Amount (integer VND)
  if (amountVnd > 0) {
    payload += formatTlv('54', String(amountVnd));
  }

  // Tag 58: Country Code (VN)
  payload += formatTlv('58', 'VN');

  // Tag 59: Merchant Name
  payload += formatTlv('59', merchantName);

  // Tag 60: Merchant City
  payload += formatTlv('60', city);

  // Tag 62: Additional Data Field (Memo in sub-tag 08)
  if (memo) {
    const sub62 = formatTlv('08', memo);
    payload += formatTlv('62', sub62);
  }

  // Tag 63: CRC16 (Calculated over payload including '6304')
  const payloadBeforeCrc = payload + '6304';
  const crc = computeCrc16(payloadBeforeCrc);
  return payloadBeforeCrc + crc;
}

/**
 * Generate VietQR QuickLink image URL.
 */
export function generateVietQrQuickLinkUrl(options = {}) {
  const bankId = String(options.bankId || DEFAULT_BANK_CONFIG.bankId);
  const accountNo = String(options.accountNo || DEFAULT_BANK_CONFIG.accountNo);
  const template = String(options.template || DEFAULT_BANK_CONFIG.template);
  const amountVnd = Number(options.amountVnd) || 0;
  const memo = sanitizeNapasMemo(options.memo || '', 50);
  const accountName = sanitizeMerchantName(options.accountName || DEFAULT_BANK_CONFIG.accountName, 25);

  const baseUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png`;
  const params = new URLSearchParams();
  if (amountVnd > 0) params.append('amount', String(amountVnd));
  if (memo) params.append('addInfo', memo);
  if (accountName) params.append('accountName', accountName);

  const queryString = params.toString().replace(/\+/g, '%20');
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Generate local offline QR code Base64 Data URL using `qrcode` library.
 */
export async function generateLocalQrDataUrl(emvcoString) {
  try {
    return await QRCode.toDataURL(emvcoString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
  } catch (err) {
    console.error('❌ [vietqrService] Local QR generation error:', err.message);
    return null;
  }
}

/**
 * High-level payment generation service for Checkout API.
 */
export async function generateVietQrPayment(params = {}) {
  const bankId = String(params.bankId || params.bank_id || DEFAULT_BANK_CONFIG.bankId);
  const bankName = String(params.bankName || params.bank_name || DEFAULT_BANK_CONFIG.bankName);
  const accountNo = String(params.accountNo || params.account_no || DEFAULT_BANK_CONFIG.accountNo);
  const accountName = String(params.accountName || params.account_name || DEFAULT_BANK_CONFIG.accountName);
  const exchangeRate = Number(params.exchangeRate || params.exchange_rate || DEFAULT_BANK_CONFIG.exchangeRate);

  const dealAmountUsd = Number(params.dealTotalUsd ?? params.amountUsd ?? params.amount_usd ?? params.total_deal_price) || 0;
  const amountVnd = convertUsdToVnd(dealAmountUsd, exchangeRate);

  // Format standard transfer memo referencing invoice code
  const invoiceCode = String(params.invoiceCode || params.invoice_code || '').trim();
  const rawMemo = params.memo || (invoiceCode ? `THANH TOAN ${invoiceCode.replace(/-/g, ' ')}` : 'THANH TOAN TRANH');
  const memo = sanitizeNapasMemo(rawMemo, 50);

  const emvcoPayload = generateVietQrEmvcoPayload({
    bankId,
    accountNo,
    amountVnd,
    memo,
    accountName
  });

  const qrImageUrl = generateVietQrQuickLinkUrl({
    bankId,
    accountNo,
    amountVnd,
    memo,
    accountName,
    template: params.template || DEFAULT_BANK_CONFIG.template
  });

  const qrDataUrl = await generateLocalQrDataUrl(emvcoPayload);

  return {
    bank_id: bankId,
    bank_name: bankName,
    account_no: accountNo,
    account_name: accountName,
    amount_usd: dealAmountUsd,
    exchange_rate: exchangeRate,
    amount_vnd: amountVnd,
    memo,
    qr_image_url: qrImageUrl,
    qr_data_url: qrDataUrl,
    emvco_payload: emvcoPayload
  };
}

export default {
  DEFAULT_BANK_CONFIG,
  formatTlv,
  computeCrc16,
  sanitizeNapasMemo,
  sanitizeMerchantName,
  convertUsdToVnd,
  generateVietQrEmvcoPayload,
  generateVietQrQuickLinkUrl,
  generateLocalQrDataUrl,
  generateVietQrPayment
};
