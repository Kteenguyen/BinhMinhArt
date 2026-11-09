/**
 * ==============================================================================
 * BinhMinhArt Gallery Inventory Management System
 * Two-Tier Location Utilities (Pure Functions, SSOT)
 * Standards: Rule 04 (Strict Typing, Boundary Value Resilience)
 * ==============================================================================
 */

/**
 * Formats Level 1 and Level 2 into backward-compatible compound string.
 * @param {string|null|undefined} level1 Primary gallery or warehouse area (defaults to 'Kho')
 * @param {string|null|undefined} level2 Optional granular placement (e.g. shelf, tray)
 * @returns {string} Formatted composite string
 */
export function formatCompoundLocation(level1, level2) {
  const rawL1 = level1 !== null && level1 !== undefined ? String(level1).trim() : '';
  const finalL1 = rawL1 || 'Kho';
  const rawL2 = level2 !== null && level2 !== undefined ? String(level2).trim() : '';
  return rawL2 ? `${finalL1} - ${rawL2}` : finalL1;
}

/**
 * Decomposes compound location string or explicit level fields into 2-tier structure.
 * Delimiter is the first occurrence of " - ".
 * @param {string|null|undefined} compoundLocation Composite location string
 * @param {string|null|undefined} [explicitLevel1] Optional explicit Level 1 override
 * @param {string|null|undefined} [explicitLevel2] Optional explicit Level 2 override
 * @returns {{ location_level1: string, location_level2: string }}
 */
export function parseCompoundLocation(compoundLocation, explicitLevel1, explicitLevel2) {
  if (explicitLevel1 !== undefined && explicitLevel1 !== null && String(explicitLevel1).trim() !== '') {
    return {
      location_level1: String(explicitLevel1).trim(),
      location_level2: explicitLevel2 !== undefined && explicitLevel2 !== null ? String(explicitLevel2).trim() : ''
    };
  }

  const raw = String(compoundLocation ?? '').trim();
  if (!raw) {
    return { location_level1: 'Kho', location_level2: '' };
  }

  const sepIdx = raw.indexOf(' - ');
  if (sepIdx !== -1) {
    const l1 = raw.slice(0, sepIdx).trim() || 'Kho';
    const l2 = raw.slice(sepIdx + 3).trim();
    return { location_level1: l1, location_level2: l2 };
  }

  return { location_level1: raw, location_level2: '' };
}
