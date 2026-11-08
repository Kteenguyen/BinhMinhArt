/**
 * Utility functions for smart Vietnamese search:
 * - Accent removal (bỏ dấu tiếng Việt)
 * - Initials / Acronym extraction (viết tắt chữ cái đầu)
 * - Smart multi-factor ranking matching
 */

export function removeVietnameseTones(str) {
  if (!str) return '';
  let s = String(str).trim();
  s = s.replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a');
  s = s.replace(/[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ]/g, 'A');
  s = s.replace(/[èéẹẻẽêềếệểễ]/g, 'e');
  s = s.replace(/[ÈÉẸẺẼÊỀẾỆỂỄ]/g, 'E');
  s = s.replace(/[ìíịỉĩ]/g, 'i');
  s = s.replace(/[ÌÍỊỈĨ]/g, 'I');
  s = s.replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o');
  s = s.replace(/[ÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ]/g, 'O');
  s = s.replace(/[ùúụủũưừứựửữ]/g, 'u');
  s = s.replace(/[ÙÚỤỦŨƯỪỨỰỬỮ]/g, 'U');
  s = s.replace(/[ỳýỵỷỹ]/g, 'y');
  s = s.replace(/[ỲÝỴỶỸ]/g, 'Y');
  s = s.replace(/đ/g, 'd');
  s = s.replace(/Đ/g, 'D');
  // Combining diacritical marks
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.toLowerCase();
}

/**
 * Returns matching score and matched segments for highlighting.
 * Score:
 *  100: Exact match
 *  95: Acronym / initials exact match (e.g. "thm" -> "Trần Hải Minh", "dvs" -> "Dương Văn Sen")
 *  90: Name starts with query
 *  85: Any word in original name starts with query
 *  80: Any word in normalized name starts with query
 *  60: Substring match
 *  0: No match
 */
export function matchArtistQuery(artistName, query) {
  if (!query || !query.trim()) {
    return { match: true, score: 100, isMatch: true };
  }

  const rawQ = query.trim().toLowerCase();
  const cleanQ = removeVietnameseTones(query);

  const rawName = (artistName || '').trim().toLowerCase();
  const cleanName = removeVietnameseTones(artistName);

  if (!rawName) return { match: false, score: 0, isMatch: false };

  // 1. Exact match
  if (rawName === rawQ || cleanName === cleanQ) {
    return { match: true, score: 100, isMatch: true };
  }

  // 2. Acronym / Initials match (e.g. "thm", "dvs", "dh", "hht", "bqa", "lvx", "na")
  const words = cleanName.split(/\s+/).filter(Boolean);
  const initials = words.map(w => w[0]).join('');
  if (initials === cleanQ || initials.startsWith(cleanQ)) {
    return { match: true, score: 95, isMatch: true };
  }

  // 3. Name starts with query
  if (rawName.startsWith(rawQ) || cleanName.startsWith(cleanQ)) {
    return { match: true, score: 90, isMatch: true };
  }

  // 4. Any raw word starts with raw query (accented)
  const rawWords = rawName.split(/\s+/).filter(Boolean);
  if (rawWords.some(w => w.startsWith(rawQ))) {
    return { match: true, score: 85, isMatch: true };
  }

  // 5. Any clean word starts with clean query (e.g. "minh", "sen", "hong", "thu")
  if (words.some(w => w.startsWith(cleanQ))) {
    return { match: true, score: 80, isMatch: true };
  }

  // 6. Substring match
  if (rawName.includes(rawQ) || cleanName.includes(cleanQ)) {
    return { match: true, score: 60, isMatch: true };
  }

  return { match: false, score: 0, isMatch: false };
}
