// src/utils/currency.js
/**
 * ==============================================================================
 * BinhMinhArt Gallery Inventory Management System
 * High-Performance, Zero-Dependency Currency Utilities
 * Standards: Rule 04 (Strict Typing, Pure Functions, Boundary Value Resilience)
 * ==============================================================================
 */

/**
 * Formats a number or string into a thousand-separated comma representation (e.g. 2109 -> "2,109").
 * 
 * @param {number|string|null|undefined} val - Input price/monetary value
 * @returns {string} Formatted comma string or empty string
 */
export function formatThousands(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val === 0 || val === '0') return '0';

  const str = String(val).trim();
  if (str === '') return '';

  // Strip non-digits
  const digits = str.replace(/[^\d]/g, '');
  if (digits === '') return '';

  // Normalize leading zeros (e.g. "05" -> "5", "00" -> "0")
  const normalized = digits.replace(/^0+(?=\d)/, '');

  // Inject thousand-separator commas
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Extracts a clean integer numeric value from formatted or raw strings (e.g. "2,109" -> 2109).
 * Returns null if input is empty, null, undefined, pure non-numeric, or negative.
 * 
 * @param {number|string|null|undefined} val - Raw or formatted input
 * @returns {number|null} Clean numeric integer or null
 */
export function parseNumericPrice(val) {
  if (val === null || val === undefined || val === '') return null;

  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val < 0) return null;
    return Math.round(val);
  }

  const str = String(val).trim();
  if (str === '') return null;

  // Reject negative numbers in art gallery inventory
  if (/^\s*-/.test(str)) return null;

  const digits = str.replace(/[^\d]/g, '');
  if (digits === '') return null;

  const num = Number(digits);
  if (!Number.isFinite(num) || num < 0) return null;

  return num;
}

/**
 * Finds the index in formattedStr after encountering targetDigits digits.
 * 
 * @param {string} formattedStr - Target formatted string
 * @param {number} targetDigits - Count of digits to traverse
 * @returns {number} Character index in formattedStr
 */
export function calculatePositionForDigits(formattedStr, targetDigits) {
  if (!formattedStr || targetDigits <= 0) return 0;
  let count = 0;
  for (let i = 0; i < formattedStr.length; i++) {
    if (/\d/.test(formattedStr[i])) count++;
    if (count === targetDigits) return i + 1;
  }
  return formattedStr.length;
}

/**
 * Mathematical implementation of the Digit-Count Cursor Preservation algorithm.
 * 
 * @param {string} rawVal - Value before formatting
 * @param {number} prevCursor - Cursor position before formatting
 * @param {string} newFormatted - New formatted string
 * @returns {number} Preserved cursor index in newFormatted
 */
export function calculatePreservedCursor(rawVal, prevCursor, newFormatted) {
  if (!rawVal || prevCursor <= 0) return 0;
  const digitsBefore = (rawVal.slice(0, prevCursor).match(/\d/g) || []).length;
  return calculatePositionForDigits(newFormatted, digitsBefore);
}
