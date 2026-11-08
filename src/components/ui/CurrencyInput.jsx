// src/components/ui/CurrencyInput.jsx
/**
 * ==============================================================================
 * BinhMinhArt Gallery Inventory Management System
 * Reusable Thousand-Separator Monetary Input Primitive
 * Standards: Rule 04 (Component-First UI Primitive, High-Density Compact UX)
 * ==============================================================================
 */

import React, { useRef, useLayoutEffect, forwardRef } from 'react';
import {
  formatThousands,
  parseNumericPrice,
  calculatePreservedCursor,
  calculatePositionForDigits
} from '../../utils/currency.js';

export const CurrencyInput = forwardRef(function CurrencyInput({
  value,
  onChange,
  onKeyDown,
  onPaste,
  placeholder = '',
  className = '',
  disabled = false,
  autoFocus = false,
  required = false,
  id,
  'data-testid': dataTestId,
  'data-alias': dataAlias,
  ...restProps
}, ref) {
  const inputRef = useRef(null);
  const cursorRef = useRef(null);

  // Synchronize ref with forwarded ref
  const handleRef = (node) => {
    inputRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  // Derive display string with thousand-separator commas
  const displayValue = formatThousands(value);

  // Restore cursor synchronously before browser paint
  useLayoutEffect(() => {
    if (cursorRef.current !== null && inputRef.current && document.activeElement === inputRef.current) {
      const pos = Math.min(cursorRef.current, inputRef.current.value.length);
      inputRef.current.setSelectionRange(pos, pos);
      cursorRef.current = null;
    }
  });

  const handleChange = (e) => {
    const rawVal = e.target.value;
    const prevCursor = e.target.selectionStart;

    const newFormatted = formatThousands(rawVal);
    const newNumeric = parseNumericPrice(newFormatted);

    // Compute preserved cursor position using digit count
    cursorRef.current = calculatePreservedCursor(rawVal, prevCursor, newFormatted);

    if (onChange) {
      onChange(newNumeric, newFormatted);
    }
  };

  const handleKeyDown = (e) => {
    const input = inputRef.current;
    if (!input) {
      if (onKeyDown) onKeyDown(e);
      return;
    }

    // 1. Backspace directly after a comma: delete the preceding digit
    if (e.key === 'Backspace') {
      const { selectionStart, selectionEnd, value: currentVal } = input;
      if (selectionStart === selectionEnd && selectionStart > 1 && currentVal[selectionStart - 1] === ',') {
        e.preventDefault();
        const before = currentVal.slice(0, selectionStart - 2);
        const after = currentVal.slice(selectionStart);
        const nextRaw = before + after;
        const nextFormatted = formatThousands(nextRaw);
        const nextNumeric = parseNumericPrice(nextFormatted);

        const digitsBefore = (before.match(/\d/g) || []).length;
        cursorRef.current = calculatePositionForDigits(nextFormatted, digitsBefore);

        if (onChange) {
          onChange(nextNumeric, nextFormatted);
        }
        return;
      }
    }

    // 2. Delete directly before a comma: delete the following digit
    if (e.key === 'Delete') {
      const { selectionStart, selectionEnd, value: currentVal } = input;
      if (selectionStart === selectionEnd && selectionStart < currentVal.length - 1 && currentVal[selectionStart] === ',') {
        e.preventDefault();
        const before = currentVal.slice(0, selectionStart);
        const after = currentVal.slice(selectionStart + 2);
        const nextRaw = before + after;
        const nextFormatted = formatThousands(nextRaw);
        const nextNumeric = parseNumericPrice(nextFormatted);

        const digitsBefore = (before.match(/\d/g) || []).length;
        cursorRef.current = calculatePositionForDigits(nextFormatted, digitsBefore);

        if (onChange) {
          onChange(nextNumeric, nextFormatted);
        }
        return;
      }
    }

    // 3. Desktop non-digit keystroke filter
    // Allow navigation keys, delete/backspace, enter, tab, and shortcuts (Cmd/Ctrl + C, V, A, Z)
    if (
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.key.length === 1 &&
      !/\d/.test(e.key)
    ) {
      e.preventDefault();
      return;
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handlePaste = (e) => {
    if (onPaste) onPaste(e);
  };

  return (
    <input
      ref={handleRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck="false"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      autoFocus={autoFocus}
      required={required}
      id={id}
      data-testid={dataTestId}
      data-alias={dataAlias}
      {...restProps}
    />
  );
});

export default CurrencyInput;
