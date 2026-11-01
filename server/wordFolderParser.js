import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { ensureThumbnail, getThumbNameForPath } from './thumbnailService.js';

const WORD_MEDIA_DIR = path.resolve('uploads', 'word_media');
if (!fs.existsSync(WORD_MEDIA_DIR)) {
  fs.mkdirSync(WORD_MEDIA_DIR, { recursive: true });
}

/**
 * Pure Node.js ZIP reader using Central Directory (handles all .docx files reliably)
 */
export function unzipBuffer(buffer) {
  const entries = {};

  // Find End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    const cdCount = buffer.readUInt16LE(eocdOffset + 10);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
    let ptr = cdOffset;

    for (let i = 0; i < cdCount && ptr + 46 <= buffer.length; i++) {
      if (buffer.readUInt32LE(ptr) !== 0x02014b50) break;
      const method = buffer.readUInt16LE(ptr + 10);
      const compSize = buffer.readUInt32LE(ptr + 20);
      const nameLen = buffer.readUInt16LE(ptr + 28);
      const extraLen = buffer.readUInt16LE(ptr + 30);
      const commentLen = buffer.readUInt16LE(ptr + 32);
      const localHeaderOffset = buffer.readUInt32LE(ptr + 42);

      const name = buffer.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8');
      ptr += 46 + nameLen + extraLen + commentLen;

      if (localHeaderOffset + 30 <= buffer.length && buffer.readUInt32LE(localHeaderOffset) === 0x04034b50) {
        const lNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
        const lExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
        const rawData = buffer.subarray(dataStart, dataStart + compSize);
        try {
          entries[name] = method === 8 ? zlib.inflateRawSync(rawData) : rawData;
        } catch {
          // ignore corrupted entry
        }
      }
    }
    return entries;
  }

  // Fallback sequential local header scan
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    const rawData = buffer.subarray(dataStart, dataStart + compSize);
    try {
      entries[name] = method === 8 ? zlib.inflateRawSync(rawData) : rawData;
    } catch {
      break;
    }
    offset = dataStart + compSize;
  }

  return entries;
}

/**
 * Normalize Vietnamese string to NFC and clean spaces
 */
export function normNFC(str) {
  return String(str || '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

/**
 * Normalize for fuzzy comparison (lowercase, NFC, strip Vietnamese accents if needed)
 */
export function normKey(str) {
  return normNFC(str).toLowerCase();
}

export function stripAccents(str) {
  return normNFC(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Normalize dimensions like "75 x 43 cm" -> "75x43cm", "H 100" -> "h100"
 */
export function normalizeSizeKey(sizeStr) {
  if (!sizeStr) return '';
  return normNFC(sizeStr)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/×/g, 'x');
}

export const KNOWN_ARTISTS = [
  'Hồ Hữu Thủ',
  'Dương Văn Sen',
  'Đoàn Hồng',
  'Nam Anh',
  'Phan Kế An',
  'Bùi Xuân Phái',
  'Nguyễn Gia Trí',
  'Tô Ngọc Vân',
  'Trần Văn Cẩn',
  'Nguyễn Tư Nghiêm',
  'Nguyễn Sáng'
];

/**
 * Intelligent Artist detection from filename, paragraph, table header, or text line
 */
export function extractArtistFromNameOrText(text) {
  if (!text) return '';
  const clean = normNFC(text);

  // 1. Check known artists from gallery SSOT
  const strippedClean = stripAccents(clean);
  for (const ka of KNOWN_ARTISTS) {
    if (strippedClean.includes(stripAccents(ka))) {
      return ka;
    }
  }

  // 2. Regex matching: "HS.", "Họa sĩ", "Hoạ sĩ", "Họa sỹ", "Hoạ sỹ", "Tác giả", "Của"
  const m = clean.match(/(?:HS\.?|HỌA\s*S[ĨỸ]|HOẠ\s*S[ĨỸ]|TÁC\s*GIẢ|CỦA\s+HS\.?|CỦA\s+HỌA\s*S[ĨỸ]|CỦA)\s*[:\-]?\s*([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐa-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]+)/i);
  if (m) {
    let name = m[1].replace(/^(?:HS\.?|HỌA\s*S[ĨỸ]|HOẠ\s*S[ĨỸ]|TÁC\s*GIẢ)\s*[:\-]?\s*/i, '').trim();
    name = name.split(/[\-\(,\n|]/)[0].trim();
    if (/^(với|và|bên|trong|cùng|ngồi|đang|ở|tại)\b/i.test(name)) {
      return '';
    }
    if (name.length >= 3 && name.length <= 40) {
      return name
        .toLowerCase()
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  return '';
}

/**
 * Parse a metadata line or token list containing Medium, Size, Year
 * Examples:
 * - "Sơn dầu, 75x43cm, 2012"
 * - "100x110cm, sơn dầu, 2012"
 * - "Sơn mài, H100"
 * - "Sơn mài - Lacquer, 80x90cm, 2018"
 */
export function parseMetadataTokens(text) {
  const clean = normNFC(text)
    .replace(/[xX×]{2,}/g, 'x')
    .replace(/(sơn dầu|sơn mài|lụa|màu nước|acrylic|tổng hợp)\./gi, '$1,');
  const parts = clean.split(',').map(s => s.trim()).filter(Boolean);

  let chat_lieu = '';
  let kich_thuoc_tranh = '';
  let nam_sang_tac = '';
  const extraNotes = [];

  for (const part of parts) {
    // Check if year (e.g. 2012, 2023-2025)
    if (/^(19\d{2}|20\d{2})(\s*-\s*(19\d{2}|20\d{2}))?$/.test(part)) {
      nam_sang_tac = part.replace(/\s+/g, '');
      continue;
    }

    // Check if size (e.g. 75x43cm, 100x110cm, H100, D80cm)
    const sizeMatch = part.match(/^(\d+\s*[xX×]\s*\d+\s*(?:cm|mm|m)?|[hHdD]\s*\d+(?:\s*(?:cm|mm|m))?)$/);
    if (sizeMatch) {
      let sz = sizeMatch[1].replace(/\s+/g, '').replace(/×/g, 'x');
      if (/^\d+x\d+$/i.test(sz)) sz += 'cm';
      kich_thuoc_tranh = sz;
      continue;
    }

    // Check if medium (Sơn mài, Sơn dầu, Lụa, Màu nước, Acrylic, Giấy dó...)
    const pLow = part.toLowerCase();
    if (
      pLow.includes('sơn mài') ||
      pLow.includes('lacquer') ||
      pLow.includes('sơn dầu') ||
      pLow.includes('oil') ||
      pLow.includes('lụa') ||
      pLow.includes('silk') ||
      pLow.includes('màu nước') ||
      pLow.includes('watercolor') ||
      pLow.includes('acrylic') ||
      pLow.includes('bột màu') ||
      pLow.includes('giấy dó') ||
      pLow.includes('tổng hợp')
    ) {
      if (pLow.includes('sơn mài') || pLow.includes('lacquer')) chat_lieu = 'Sơn mài';
      else if (pLow.includes('sơn dầu') || pLow.includes('oil')) chat_lieu = 'Sơn dầu';
      else if (pLow.includes('lụa') || pLow.includes('silk')) chat_lieu = 'Lụa';
      else if (pLow.includes('màu nước') || pLow.includes('watercolor')) chat_lieu = 'Màu nước';
      else if (pLow.includes('acrylic')) chat_lieu = 'Acrylic';
      else chat_lieu = part.split('-')[0].trim();

      if (part.includes('-')) {
        extraNotes.push(part);
      }

      // Inline fallback for size and year attached to medium token
      const inlineSize = part.match(/\b(\d+\s*[xX×]\s*\d+\s*(?:cm)?|[hHdD]\d+)\b/);
      if (inlineSize && !kich_thuoc_tranh) {
        kich_thuoc_tranh = inlineSize[1].replace(/\s+/g, '');
      }
      const inlineYear = part.match(/\b(19\d{2}|20\d{2})\b/);
      if (inlineYear && !nam_sang_tac) {
        nam_sang_tac = inlineYear[1];
      }
      continue;
    }

    // Inline fallback search inside a combined token
    const inlineYear = part.match(/\b(19\d{2}|20\d{2})\b/);
    if (inlineYear && !nam_sang_tac) {
      nam_sang_tac = inlineYear[1];
    }
    const inlineSize = part.match(/\b(\d+\s*[xX×]\s*\d+\s*(?:cm)?|[hHdD]\d+)\b/);
    if (inlineSize && !kich_thuoc_tranh) {
      kich_thuoc_tranh = inlineSize[1].replace(/\s+/g, '');
    }
  }

    return {
      chat_lieu: chat_lieu || '',
      kich_thuoc_tranh,
      nam_sang_tac,
      extraNotes
    };
  }

  /**
   * Parse price line from Word cell (e.g. "Giá: 1.500", "Giá : 18.000", "Giá:")
   */
  export function parsePriceLine(text) {
    const clean = normNFC(text);
    const afterColon = clean.replace(/^giá\s*:?\s*/i, '').trim();
    if (!afterColon) return null;

    // Remove USD/$/spaces
    const numStr = afterColon.replace(/[$usdUSD\s]/g, '');
    if (!numStr) return null;

    // In Vietnamese price lists, "1.500" or "18.000" uses dot as thousands separator
    const normalizedNum = numStr.replace(/\./g, '').replace(/,/g, '');
    const val = parseFloat(normalizedNum);
    return isNaN(val) ? null : val;
  }

  /**
   * Estimate standard frame size if not explicitly provided
   */
  export function estimateFrameSize(kichThuocTranh) {
    if (!kichThuocTranh) return '';
    const clean = kichThuocTranh.trim();
    if (/^[hHdD](\d+)/.test(clean)) {
      const d = parseInt(clean.slice(1), 10);
      if (!isNaN(d)) return `${d + 10}x${d + 10}cm`;
    }
    const m = clean.match(/^(\d+)\s*[xX×]\s*(\d+)/);
    if (m) {
      const w = parseInt(m[1], 10);
      const h = parseInt(m[2], 10);
      const pad = w >= 100 || h >= 100 ? 12 : 10;
      return `${w + pad}x${h + pad}cm`;
    }
    return '';
  }

  /**
   * Parse Word (.docx) Buffer:
   * Extracts:
   * - Document Header (Artist Name & Catalogue Date)
   * - Embedded Images from word/media/*
   * - Table cells (paired image row + text row, or combined cell)
   */
  export async function parseWordDocxBuffer(buffer, sourceFileName = 'BANG_GIA.docx') {
    const entries = unzipBuffer(buffer);
    const docXmlBuf = entries['word/document.xml'];
    if (!docXmlBuf) {
      throw new Error('File Word (.docx) không hợp lệ hoặc không chứa word/document.xml');
    }

    const docXml = docXmlBuf.toString('utf8');
    const relsXml = entries['word/_rels/document.xml.rels']
      ? entries['word/_rels/document.xml.rels'].toString('utf8')
      : '';

    // 1. Map rId -> media target path
    const relMap = {};
    const relRegex = /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>/g;
    let relMatch;
    while ((relMatch = relRegex.exec(relsXml)) !== null) {
      relMap[relMatch[1]] = relMatch[2];
    }

    // Also handle case where Target appears before Id in Relationship tag
    const relRegexAlt = /<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*\bId="([^"]+)"[^>]*\/?>/g;
    while ((relMatch = relRegexAlt.exec(relsXml)) !== null) {
      relMap[relMatch[2]] = relMatch[1];
    }

    // 2. Save embedded media files to uploads/word_media/ (ONLY actual image files in media/)
    const savedMediaMap = {}; // rId -> public URL '/uploads/word_media/...'
    const batchPrefix = Date.now().toString(36);

    for (const [rId, target] of Object.entries(relMap)) {
      if (!target.includes('media/') || !/\.(jpe?g|png|webp|gif|bmp)$/i.test(target)) {
        continue;
      }
      const zipKey = target.startsWith('word/') ? target : `word/${target.replace(/^\.\.\//, '')}`;
      const mediaBuf = entries[zipKey];
      if (mediaBuf) {
        const ext = path.extname(zipKey) || '.jpeg';
        const base = path.basename(zipKey, ext);
        const outName = `word_${batchPrefix}_${rId}_${base}${ext}`;
        const absOut = path.join(WORD_MEDIA_DIR, outName);
        fs.writeFileSync(absOut, mediaBuf);
        const pubUrl = `/uploads/word_media/${outName}`;
        savedMediaMap[rId] = pubUrl;

        // Pre-generate thumbnail
        const safeThumb = getThumbNameForPath(pubUrl);
        await ensureThumbnail(absOut, safeThumb);
      }
    }

  // Helper to extract paragraphs & image rIds from an XML fragment
  const extractParasAndImages = (xmlChunk) => {
    const paras = [];
    const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    let pMatch;
    while ((pMatch = pRegex.exec(xmlChunk)) !== null) {
      const pContent = pMatch[1];
      const texts = [];
      const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
      let tMatch;
      while ((tMatch = tRegex.exec(pContent)) !== null) {
        texts.push(tMatch[1]);
      }
      const line = normNFC(texts.join(''));
      if (line) paras.push(line);
    }

    const rIds = [];
    const blipRegex = /<a:blip\b[^>]*\br:embed="([^"]+)"/g;
    let bMatch;
    while ((bMatch = blipRegex.exec(xmlChunk)) !== null) {
      rIds.push(bMatch[1]);
    }
    return { paras, rIds };
  };

  // 3. Detect Artist Name & Header Date from filename & paragraphs outside tables
  const xmlWithoutTables = docXml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, '');
  const { paras: headerParas } = extractParasAndImages(xmlWithoutTables);

  const artistFromFileName = extractArtistFromNameOrText(sourceFileName);
  let detectedArtist = artistFromFileName || '';
  let detectedPeriod = '01/2026';

  for (const hp of headerParas) {
    const artistFromHeader = extractArtistFromNameOrText(hp);
    if (artistFromHeader && !detectedArtist) {
      detectedArtist = artistFromHeader;
    }
    const periodMatch = hp.match(/\(?\s*(\d{1,2}\s*\/\s*\d{4})\s*\)?/);
    if (periodMatch) {
      detectedPeriod = periodMatch[1].replace(/\s+/g, '');
    }
  }

  // 4. Parse Tables inside word/document.xml
  const wordItems = [];
  const tblRegex = /<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>/g;
  let tblMatch;
  let currentSectionArtist = detectedArtist;
  let currentSectionMedium = '';

  while ((tblMatch = tblRegex.exec(docXml)) !== null) {
    const tblXml = tblMatch[1];
    const rows = [];
    const trRegex = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
    let trMatch;

    while ((trMatch = trRegex.exec(tblXml)) !== null) {
      const trXml = trMatch[1];
      const cells = [];
      const tcRegex = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
      let tcMatch;
      while ((tcMatch = tcRegex.exec(trXml)) !== null) {
        cells.push(extractParasAndImages(tcMatch[1]));
      }
      rows.push(cells);
    }

    if (rows.length === 0) continue;

    // Check if table has standard column headers in Row 0 or Row 1
    let headerRowIdx = -1;
    let colMap = null;

    for (let testR = 0; testR < Math.min(3, rows.length); testR++) {
      const row = rows[testR];
      let matchCount = 0;
      const testMap = {};

      row.forEach((cell, cIdx) => {
        const cText = cell.paras.join(' ').toLowerCase();
        if (/\b(stt|tt|no\.?)\b/i.test(cText)) { testMap.stt = cIdx; matchCount++; }
        else if (/\b(ảnh|hình|image|photo)\b/i.test(cText)) { testMap.image = cIdx; matchCount++; }
        else if (/\b(tên\s*tác\s*phẩm|tên\s*tranh|tên|tác\s*phẩm|title)\b/i.test(cText)) { testMap.title = cIdx; matchCount++; }
        else if (/\b(tác\s*giả|họa\s*s[ĩỹ]|hoạ\s*s[ĩỹ]|artist)\b/i.test(cText)) { testMap.artist = cIdx; matchCount++; }
        else if (/\b(chất\s*liệu|medium|material)\b/i.test(cText)) { testMap.medium = cIdx; matchCount++; }
        else if (/\b(kích\s*thước|quy\s*cách|size|dimension)\b/i.test(cText)) { testMap.size = cIdx; matchCount++; }
        else if (/\b(năm|year)\b/i.test(cText)) { testMap.year = cIdx; matchCount++; }
        else if (/\b(giá|đơn\s*giá|price)\b/i.test(cText)) { testMap.price = cIdx; matchCount++; }
        else if (/\b(ghi\s*chú|note|tình\s*trạng)\b/i.test(cText)) { testMap.notes = cIdx; }
      });

      if (matchCount >= 2 || (testMap.title !== undefined && (testMap.size !== undefined || testMap.medium !== undefined || testMap.price !== undefined))) {
        headerRowIdx = testR;
        colMap = testMap;
        break;
      }
    }

    if (headerRowIdx !== -1 && colMap) {
      // TABULAR FORMAT: Row-by-Row parsing
      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];
        if (row.length === 0) continue;

        // Check if row is a section divider (e.g. "I. HỌA SĨ ĐOÀN HỒNG")
        const combinedRowText = row.map(c => c.paras.join(' ')).join(' ').trim();
        const sectionArtist = extractArtistFromNameOrText(combinedRowText);
        const nonEmptyCells = row.filter(c => c.paras.length > 0 || c.rIds.length > 0);

        if (sectionArtist && nonEmptyCells.length <= 2) {
          currentSectionArtist = sectionArtist;
          continue;
        }

        // Extract Title
        let title = '';
        if (colMap.title !== undefined && row[colMap.title]) {
          title = row[colMap.title].paras.join(' ').trim();
        } else {
          for (let c = 0; c < row.length; c++) {
            if (c === colMap.stt || c === colMap.price || c === colMap.size || c === colMap.image) continue;
            const t = row[c]?.paras.join(' ').trim();
            if (t && t.length > 1 && !/^\d+$/.test(t)) {
              title = t;
              break;
            }
          }
        }

        if (!title) continue; // Skip empty row

        // Extract Artist
        let artist = currentSectionArtist;
        if (colMap.artist !== undefined && row[colMap.artist]) {
          const aText = row[colMap.artist].paras.join(' ').trim();
          if (aText) {
            artist = extractArtistFromNameOrText(aText) || aText;
          }
        }

        // Extract Medium
        let medium = '';
        if (colMap.medium !== undefined && row[colMap.medium]) {
          const mText = row[colMap.medium].paras.join(' ').trim();
          const meta = parseMetadataTokens(mText);
          medium = meta.chat_lieu || mText;
        }

        // Extract Size
        let size = '';
        if (colMap.size !== undefined && row[colMap.size]) {
          const sText = row[colMap.size].paras.join(' ').trim();
          const meta = parseMetadataTokens(sText);
          size = meta.kich_thuoc_tranh || sText;
        }

        // Extract Year
        let year = '';
        if (colMap.year !== undefined && row[colMap.year]) {
          const yText = row[colMap.year].paras.join(' ').trim();
          const ym = yText.match(/\b(19\d{2}|20\d{2})\b/);
          if (ym) year = ym[1];
        }

        // Extract Price
        let price = null;
        if (colMap.price !== undefined && row[colMap.price]) {
          const pText = row[colMap.price].paras.join(' ').trim();
          price = parsePriceLine(pText);
        }

        // Fallback scan across other cells if properties missing
        if (!medium || !size || !year) {
          for (let c = 0; c < row.length; c++) {
            if (c === colMap.title || c === colMap.stt) continue;
            const text = row[c]?.paras.join(' ').trim() || '';
            const meta = parseMetadataTokens(text);
            if (!medium && meta.chat_lieu) medium = meta.chat_lieu;
            if (!size && meta.kich_thuoc_tranh) size = meta.kich_thuoc_tranh;
            if (!year && meta.nam_sang_tac) year = meta.nam_sang_tac;
          }
        }

        // Extract Image
        const rowRIds = [];
        row.forEach(c => rowRIds.push(...c.rIds));
        const embeddedImgs = rowRIds.map(id => savedMediaMap[id]).filter(Boolean);

        wordItems.push({
          ten_tac_pham: title,
          tac_gia: artist || detectedArtist || '',
          chat_lieu: medium || 'Sơn mài',
          kich_thuoc_tranh: size,
          kich_thuoc_khung_tranh: estimateFrameSize(size),
          nam_sang_tac: year,
          gia: price,
          word_embedded_image: embeddedImgs[0] || null,
          raw_lines: row.map(c => c.paras.join(' ')).filter(Boolean),
          grid_row: r + 1,
          grid_col: 1
        });
      }
    } else {
      // GRID / PAIRED ROW FORMAT
      for (let r = 0; r < rows.length; r++) {
        const currentRow = rows[r];
        const nextRow = r + 1 < rows.length ? rows[r + 1] : null;

        // Check if currentRow is a section divider (e.g. "SƠN MÀI", "SƠN DẦU", "I. HỌA SĨ...")
        const combinedRowText = currentRow.map(c => c.paras.join(' ')).join(' ').trim();
        const nonEmptyCells = currentRow.filter(c => c.paras.length > 0 || c.rIds.length > 0);
        if (nonEmptyCells.length <= 1 && combinedRowText) {
          const rowTextLow = combinedRowText.toLowerCase();
          if (/sơn\s*mài/i.test(rowTextLow)) {
            currentSectionMedium = 'Sơn mài';
            continue;
          } else if (/sơn\s*dầu/i.test(rowTextLow)) {
            currentSectionMedium = 'Sơn dầu';
            continue;
          } else if (/lụa/i.test(rowTextLow)) {
            currentSectionMedium = 'Lụa';
            continue;
          } else if (/màu\s*nước/i.test(rowTextLow)) {
            currentSectionMedium = 'Màu nước';
            continue;
          } else if (/acrylic/i.test(rowTextLow)) {
            currentSectionMedium = 'Acrylic';
            continue;
          } else if (/tổng\s*hợp/i.test(rowTextLow)) {
            currentSectionMedium = 'Tổng hợp';
            continue;
          }
          const sectionArtist = extractArtistFromNameOrText(combinedRowText);
          if (sectionArtist) {
            currentSectionArtist = sectionArtist;
            continue;
          }
        }

        const isImageOnlyRow =
          currentRow.some(c => c.rIds.length > 0) &&
          currentRow.every(c => c.paras.length === 0);

        if (isImageOnlyRow && nextRow) {
          const colCount = Math.max(currentRow.length, nextRow.length);
          for (let c = 0; c < colCount; c++) {
            const imgCell = currentRow[c] || { rIds: [] };
            const txtCell = nextRow[c] || { paras: [] };
            if (txtCell.paras.length === 0 && imgCell.rIds.length === 0) continue;

            const parsed = buildWordItemFromCell(txtCell.paras, imgCell.rIds, savedMediaMap, currentSectionArtist || detectedArtist, currentSectionMedium);
            if (parsed) {
              wordItems.push({
                ...parsed,
                grid_row: Math.floor(r / 2) + 1,
                grid_col: c + 1
              });
            }
          }
          r++; // Skip nextRow since consumed
        } else {
          // Check single cells
          for (let c = 0; c < currentRow.length; c++) {
            const cell = currentRow[c];
            if (cell.paras.length >= 1 && (cell.rIds.length > 0 || cell.paras.length >= 2)) {
              const parsed = buildWordItemFromCell(cell.paras, cell.rIds, savedMediaMap, currentSectionArtist || detectedArtist, currentSectionMedium);
              if (parsed) {
                wordItems.push({
                  ...parsed,
                  grid_row: r + 1,
                  grid_col: c + 1
                });
              }
            }
          }
        }
      }
    }
  }

  // Derive final detectedArtist from parsed items if available
  const parsedArtists = Array.from(new Set(wordItems.map(i => i.tac_gia).filter(Boolean)));
  if (parsedArtists.length === 1) {
    detectedArtist = parsedArtists[0];
  } else if (parsedArtists.length > 1) {
    detectedArtist = `Nhiều họa sĩ (${parsedArtists.slice(0, 3).join(', ')}${parsedArtists.length > 3 ? '...' : ''})`;
  }

  return {
    sourceFileName: normNFC(sourceFileName),
    detectedArtist,
    detectedPeriod,
    headerLines: headerParas,
    totalEmbeddedImages: Object.keys(savedMediaMap).length,
    items: wordItems
  };
}

function buildWordItemFromCell(paras, rIds, savedMediaMap, defaultArtist, defaultMedium) {
  if (!paras || paras.length === 0) return null;

  // Filter out empty lines
  const lines = paras.map(p => normNFC(p)).filter(Boolean);
  if (lines.length === 0) return null;

  let ten_tac_pham = (lines[0] || 'Không tiêu đề').replace(/[,;.\s]+$/, '');
  let tac_gia = defaultArtist || '';
  let chat_lieu = defaultMedium || '';
  let kich_thuoc_tranh = '';
  let nam_sang_tac = '';
  let gia = null;
  let tinh_trang = 'chua_ban';

  // 1. Detect if sold in any line
  for (const line of lines) {
    const stripped = stripAccents(line).toLowerCase();
    if (stripped.includes('daban') || stripped.includes('sold')) {
      tinh_trang = 'da_ban';
    }
  }

  // 2. Check if first line is metadata rather than a title (e.g. "Sơn mài, 123x241cm, 2022")
  const firstMeta = parseMetadataTokens(lines[0]);
  if (firstMeta.kich_thuoc_tranh || /^(sơn mài|sơn dầu|lụa|màu nước|acrylic|tổng hợp)/i.test(lines[0])) {
    const cleanL0 = lines[0]
      .replace(/^(sơn mài|sơn dầu|lụa|màu nước|acrylic|tổng hợp)[\s,.]*/i, '')
      .replace(/\b\d+\s*x\s*\d+\s*(?:cm)?\b/i, '')
      .replace(/\b(19\d{2}|20\d{2})\b/g, '')
      .replace(/[,.\-\s]+/g, '').trim();
    if (!cleanL0) {
      ten_tac_pham = 'Không tiêu đề';
      if (firstMeta.chat_lieu) chat_lieu = firstMeta.chat_lieu;
      if (firstMeta.kich_thuoc_tranh) kich_thuoc_tranh = firstMeta.kich_thuoc_tranh;
      if (firstMeta.nam_sang_tac) nam_sang_tac = firstMeta.nam_sang_tac;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line indicates artist explicitly
    const lineArtist = extractArtistFromNameOrText(line);
    if (lineArtist && (/(?:hs\.?|họa\s*s[ĩỹ]|hoạ\s*s[ĩỹ]|tác\s*giả)\s*[:\-]/i.test(line) || KNOWN_ARTISTS.includes(lineArtist))) {
      tac_gia = lineArtist;
      if (i === 0 && lines.length > 1) {
        ten_tac_pham = lines[1].replace(/[,;.\s]+$/, '');
      }
      continue;
    }

    if (/^giá(?:\s|:|$)/i.test(line)) {
      gia = parsePriceLine(line);
    } else if (i > 0 || /^(sơn mài|sơn dầu|lụa|màu nước|acrylic|tổng hợp|\d+x\d+)/i.test(line)) {
      const meta = parseMetadataTokens(line);
      if (meta.chat_lieu) chat_lieu = meta.chat_lieu;
      if (meta.kich_thuoc_tranh) kich_thuoc_tranh = meta.kich_thuoc_tranh;
      if (meta.nam_sang_tac) nam_sang_tac = meta.nam_sang_tac;
    }
  }

  if (!chat_lieu) chat_lieu = defaultMedium || 'Sơn mài';

  const embeddedImgs = rIds
    .map(id => savedMediaMap[id])
    .filter(Boolean);

  return {
    ten_tac_pham,
    tac_gia,
    chat_lieu,
    kich_thuoc_tranh,
    kich_thuoc_khung_tranh: estimateFrameSize(kich_thuoc_tranh),
    nam_sang_tac,
    gia,
    tinh_trang,
    word_embedded_image: embeddedImgs[0] || null,
    raw_lines: lines
  };
}

/**
 * Parse an image filename and its folder path into structured painting metadata
 * Example filenames:
 * - "Dương Văn Sen, Thiếu nữ - Young girl, Sơn dầu - Oil on canvas, 75x43cm, 2012.jpg"
 * - "Dương Văn Sen, Thiếu nữ, Sơn mài, 60x40cm, 2025 - Chị Hạnh (Đức).jpg"
 */
export function parseImageFileMetadata(originalName, relativePath = '', publicUrl = '') {
  const cleanFileName = normNFC(path.basename(originalName, path.extname(originalName)));
  const cleanRelPath = normNFC(relativePath || originalName);

  // Determine status from folder path or filename
  const pathLower = cleanRelPath.toLowerCase();
  const isSoldFolder =
    pathLower.includes('đã bán') ||
    pathLower.includes('da ban') ||
    pathLower.includes('daban') ||
    pathLower.includes('sold');

  let tinh_trang = isSoldFolder ? 'da_ban' : 'chua_ban';
  let khach_hang = '';

  // Check if there is a buyer suffix after " - " at the end (e.g. "2025 - Chị Hạnh (Đức)")
  const segments = cleanFileName.split(',').map(s => s.trim()).filter(Boolean);
  if (segments.length > 0) {
    const lastSeg = segments[segments.length - 1];
    const dashParts = lastSeg.split(/\s+-\s+/);
    if (dashParts.length >= 2) {
      const possibleYearOrSize = dashParts[0].trim();
      const possibleBuyer = dashParts.slice(1).join(' - ').trim();
      if (/^(19\d{2}|20\d{2}|\d+x\d+)/i.test(possibleYearOrSize) && possibleBuyer) {
        segments[segments.length - 1] = possibleYearOrSize;
        khach_hang = possibleBuyer;
        tinh_trang = 'da_ban';
      }
    }
  }

  let tac_gia = '';
  let ten_tac_pham = cleanFileName;
  let englishTitleNote = '';

  if (segments.length >= 2) {
    tac_gia = segments[0];
    const rawTitle = segments[1];
    if (rawTitle.includes(' - ')) {
      const [vnTitle, enTitle] = rawTitle.split(/\s+-\s+/);
      ten_tac_pham = vnTitle.trim();
      englishTitleNote = enTitle ? enTitle.trim() : '';
    } else {
      ten_tac_pham = rawTitle.trim();
    }
  }

  if (!tac_gia) {
    const fromPath = extractArtistFromNameOrText(cleanRelPath);
    if (fromPath) {
      tac_gia = fromPath;
    } else {
      const fromName = extractArtistFromNameOrText(cleanFileName);
      if (fromName) tac_gia = fromName;
    }
  }

  const metaRest = segments.slice(2).join(', ');
  const { chat_lieu, kich_thuoc_tranh, nam_sang_tac } = parseMetadataTokens(metaRest);

  return {
    ten_tac_pham,
    tac_gia,
    chat_lieu,
    kich_thuoc_tranh,
    kich_thuoc_khung_tranh: estimateFrameSize(kich_thuoc_tranh),
    nam_sang_tac,
    tinh_trang,
    khach_hang,
    ghi_chu: englishTitleNote ? `Tên tiếng Anh: ${englishTitleNote}` : '',
    image_url: publicUrl,
    relative_path: cleanRelPath,
    file_name: normNFC(originalName)
  };
}

/**
 * Find duplicate painting in existingPaintings by SKU (id) OR by (Title + Size + Artist/Medium)
 */
export function findDuplicatePainting(candidate, existingPaintings = []) {
  if (!Array.isArray(existingPaintings) || existingPaintings.length === 0) return null;

  const candId = normNFC(candidate.id).toUpperCase();
  if (candId) {
    const byId = existingPaintings.find(p => normNFC(p.id).toUpperCase() === candId);
    if (byId) return byId;
  }

  const tKey = stripAccents(candidate.ten_tac_pham);
  const aKey = stripAccents(candidate.tac_gia);
  const mKey = stripAccents(candidate.chat_lieu);
  const sKey = normalizeSizeKey(candidate.kich_thuoc_tranh);

  if (!tKey) return null;

  return (
    existingPaintings.find(p => {
      const pt = stripAccents(p.ten_tac_pham);
      const pa = stripAccents(p.tac_gia);
      const pm = stripAccents(p.chat_lieu);
      const ps = normalizeSizeKey(p.kich_thuoc_tranh);

      if (pt !== tKey) return false;
      if (sKey && ps && sKey !== ps) return false;
      if (aKey && pa && aKey !== pa) return false;
      if (mKey && pm && mKey !== pm) return false;
      return Boolean(sKey && ps && sKey === ps);
    }) || null
  );
}

/**
 * Reconcile Word items and Folder Image items into a unified list of paintings
 */
export function reconcileWordAndFolderItems(wordResult, folderImageItems, existingPaintings = []) {
  const now = new Date();
  const todayStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

  const usedImageIndices = new Set();
  const mergedPaintings = [];

  const buildExistingSnapshot = (existing) => {
    if (!existing) return null;
    return {
      id: existing.id,
      ten_tac_pham: existing.ten_tac_pham,
      tac_gia: existing.tac_gia,
      chat_lieu: existing.chat_lieu,
      kich_thuoc_tranh: existing.kich_thuoc_tranh,
      kich_thuoc_khung_tranh: existing.kich_thuoc_khung_tranh || '',
      nam_sang_tac: existing.nam_sang_tac || '',
      gia: existing.gia,
      tinh_trang: existing.tinh_trang,
      ngay_them: existing.ngay_them || '',
      ngay_cap_nhat_san_pham: existing.ngay_cap_nhat_san_pham || '',
      hinh_anh: existing.hinh_anh || []
    };
  };

  // Map existing paintings by composite signature to preserve custom fields (e.g. hoa_don, kich_thuoc_khung_tranh)
  const findExistingMatch = (title, medium, size, artist = '') => {
    return findDuplicatePainting(
      { ten_tac_pham: title, chat_lieu: medium, kich_thuoc_tranh: size, tac_gia: artist },
      existingPaintings
    );
  };

  const wordItems = wordResult ? wordResult.items : [];

  // 1. Match each Word item to the best Folder Image
  for (const wItem of wordItems) {
    let bestIdx = -1;
    let bestScore = 0;

    const wTitle = stripAccents(wItem.ten_tac_pham);
    const wSize = normalizeSizeKey(wItem.kich_thuoc_tranh);
    const wMed = stripAccents(wItem.chat_lieu);
    const wYear = normNFC(wItem.nam_sang_tac);

    folderImageItems.forEach((fImg, idx) => {
      if (usedImageIndices.has(idx)) return;

      const fTitle = stripAccents(fImg.ten_tac_pham);
      const fSize = normalizeSizeKey(fImg.kich_thuoc_tranh);
      const fMed = stripAccents(fImg.chat_lieu);
      const fYear = normNFC(fImg.nam_sang_tac);

      let score = 0;
      if (wSize && fSize && wSize === fSize) score += 60;
      if (wTitle && fTitle && (wTitle === fTitle || fTitle.includes(wTitle) || wTitle.includes(fTitle))) score += 45;
      if (wMed && fMed && wMed === fMed) score += 25;
      if (wYear && fYear && wYear === fYear) score += 15;

      // Require strong match if there are duplicate titles like "Thiếu nữ"
      if (wSize && fSize && wSize !== fSize) {
        score -= 50;
      }

      if (score > bestScore && score >= 55) {
        bestScore = score;
        bestIdx = idx;
      }
    });

    const matchedFolderImg = bestIdx !== -1 ? folderImageItems[bestIdx] : null;
    if (bestIdx !== -1) {
      usedImageIndices.add(bestIdx);
    }

    const existing = findExistingMatch(
      wItem.ten_tac_pham,
      wItem.chat_lieu,
      wItem.kich_thuoc_tranh,
      wItem.tac_gia || (matchedFolderImg && matchedFolderImg.tac_gia) || ''
    );

    const images = [];
    if (matchedFolderImg && matchedFolderImg.image_url) {
      images.push(matchedFolderImg.image_url);
    }
    if (wItem.word_embedded_image && !images.includes(wItem.word_embedded_image)) {
      images.push(wItem.word_embedded_image);
    }
    if (images.length === 0 && existing && Array.isArray(existing.hinh_anh)) {
      images.push(...existing.hinh_anh);
    }

    const tinh_trang = (wItem.tinh_trang === 'da_ban')
      ? 'da_ban'
      : matchedFolderImg
      ? matchedFolderImg.tinh_trang
      : existing
      ? existing.tinh_trang
      : (wItem.tinh_trang || 'chua_ban');

    const khach_hang =
      (matchedFolderImg && matchedFolderImg.khach_hang) ||
      (existing && existing.khach_hang) ||
      '';

    const resolvedSize = wItem.kich_thuoc_tranh || (matchedFolderImg && matchedFolderImg.kich_thuoc_tranh) || '';

    mergedPaintings.push({
      id: existing ? existing.id : null, // Assigned sequentially below if null
      ten_tac_pham: wItem.ten_tac_pham || '',
      tac_gia: wItem.tac_gia || (matchedFolderImg && matchedFolderImg.tac_gia) || '',
      chat_lieu: wItem.chat_lieu || (matchedFolderImg && matchedFolderImg.chat_lieu) || '',
      ngay_them: (existing && existing.ngay_them) || todayStr,
      gia: wItem.gia !== undefined ? wItem.gia : existing ? existing.gia : null,
      ngay_cap_nhat_gia_gan_nhat: wItem.gia !== undefined && wItem.gia !== null ? todayStr : '',
      kich_thuoc_tranh: resolvedSize,
      kich_thuoc_khung_tranh:
        (existing && existing.kich_thuoc_khung_tranh) ||
        wItem.kich_thuoc_khung_tranh ||
        (matchedFolderImg && matchedFolderImg.kich_thuoc_khung_tranh) ||
        estimateFrameSize(resolvedSize),
      nam_sang_tac: wItem.nam_sang_tac || (matchedFolderImg && matchedFolderImg.nam_sang_tac) || '',
      tinh_trang,
      khach_hang,
      vi_tri: (existing && (existing.vi_tri || existing.location)) || (tinh_trang === 'da_ban' ? 'Đã bán' : 'Kho'),
      ngay_mua_vao: (existing && existing.ngay_mua_vao) || '',
      ngay_ban: tinh_trang === 'da_ban' ? ((existing && existing.ngay_ban) || '') : null,
      hoa_don: (existing && existing.hoa_don) || '',
      giay_chung_nhan: (existing && existing.giay_chung_nhan) || '',
      ngay_cap_nhat_san_pham: existing ? (existing.ngay_cap_nhat_san_pham || todayStr) : todayStr,
      hinh_anh: images,
      ghi_chu:
        (existing && existing.ghi_chu) ||
        (matchedFolderImg && matchedFolderImg.ghi_chu) ||
        '',
      is_duplicate: Boolean(existing),
      duplicate_resolution: existing ? 'overwrite' : 'new',
      existing_snapshot: buildExistingSnapshot(existing),
      match_source: matchedFolderImg
        ? 'word_and_folder'
        : wItem.word_embedded_image
        ? 'word_embedded_only'
        : 'word_text_only',
      matched_file_name: matchedFolderImg ? matchedFolderImg.file_name : null
    });
  }

  // 2. Include any remaining Folder Images that were NOT in the Word file
  folderImageItems.forEach((fImg, idx) => {
    if (usedImageIndices.has(idx)) return;
    const existing = findExistingMatch(
      fImg.ten_tac_pham,
      fImg.chat_lieu,
      fImg.kich_thuoc_tranh,
      fImg.tac_gia
    );

    const fTinhTrang = fImg.tinh_trang || 'chua_ban';

    mergedPaintings.push({
      id: existing ? existing.id : null,
      ten_tac_pham: fImg.ten_tac_pham || '',
      tac_gia: fImg.tac_gia || '',
      chat_lieu: fImg.chat_lieu || '',
      ngay_them: (existing && existing.ngay_them) || todayStr,
      gia: existing ? existing.gia : null,
      ngay_cap_nhat_gia_gan_nhat: '',
      kich_thuoc_tranh: fImg.kich_thuoc_tranh || '',
      kich_thuoc_khung_tranh:
        (existing && existing.kich_thuoc_khung_tranh) ||
        fImg.kich_thuoc_khung_tranh ||
        estimateFrameSize(fImg.kich_thuoc_tranh),
      nam_sang_tac: fImg.nam_sang_tac || '',
      tinh_trang: fTinhTrang,
      khach_hang: fImg.khach_hang || (existing && existing.khach_hang) || '',
      vi_tri: (existing && (existing.vi_tri || existing.location)) || (fTinhTrang === 'da_ban' ? 'Đã bán' : 'Kho'),
      ngay_mua_vao: (existing && existing.ngay_mua_vao) || '',
      ngay_ban: fTinhTrang === 'da_ban' ? ((existing && existing.ngay_ban) || '') : null,
      hoa_don: (existing && existing.hoa_don) || '',
      giay_chung_nhan: (existing && existing.giay_chung_nhan) || '',
      ngay_cap_nhat_san_pham: existing ? (existing.ngay_cap_nhat_san_pham || todayStr) : todayStr,
      hinh_anh: fImg.image_url ? [fImg.image_url] : [],
      ghi_chu: (existing && existing.ghi_chu) || fImg.ghi_chu || '',
      is_duplicate: Boolean(existing),
      duplicate_resolution: existing ? 'overwrite' : 'new',
      existing_snapshot: buildExistingSnapshot(existing),
      match_source: 'folder_only',
      matched_file_name: fImg.file_name
    });
  });

  // 3. Generate deterministic SKUs (e.g. DVS-SD-01, DVS-SM-01) for any item without an ID
  const counters = {};
  const usedIds = new Set([
    ...existingPaintings.map(p => p.id).filter(Boolean),
    ...mergedPaintings.map(p => p.id).filter(Boolean)
  ]);

  for (const item of mergedPaintings) {
    if (item.id) continue;
    const aInit = (item.tac_gia || 'BMA')
      .trim()
      .split(/\s+/)
      .map(w => (w[0] ? w[0].toUpperCase() : ''))
      .join('')
      .replace(/Đ/g, 'D') || 'BMA';

    const mLow = (item.chat_lieu || '').toLowerCase();
    let mInit = 'SM';
    if (mLow.includes('dầu')) mInit = 'SD';
    else if (mLow.includes('mài')) mInit = 'SM';
    else if (mLow.includes('lụa')) mInit = 'LU';
    else if (mLow.includes('nước')) mInit = 'MN';

    const prefix = `${aInit}-${mInit}`;
    counters[prefix] = (counters[prefix] || 0) + 1;
    let candidate = `${prefix}-${String(counters[prefix]).padStart(2, '0')}`;
    while (usedIds.has(candidate)) {
      counters[prefix]++;
      candidate = `${prefix}-${String(counters[prefix]).padStart(2, '0')}`;
    }
    item.id = candidate;
    usedIds.add(candidate);
  }

  return mergedPaintings;
}
