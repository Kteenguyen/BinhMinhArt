import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {
  parseWordDocxBuffer,
  reconcileWordAndFolderItems,
  extractArtistFromNameOrText,
  parsePriceLine,
  parseMetadataTokens,
  estimateFrameSize
} from '../server/wordFolderParser.js';

describe('Word Folder Ingestion Engine', () => {
  test('extractArtistFromNameOrText identifies known artists and prefixes', () => {
    assert.strictEqual(extractArtistFromNameOrText('Họa sĩ Hồ Hữu Thủ'), 'Hồ Hữu Thủ');
    assert.strictEqual(extractArtistFromNameOrText('HS. Đoàn Hồng'), 'Đoàn Hồng');
    assert.strictEqual(extractArtistFromNameOrText('CỦA HS HỒ HỮU THỦ'), 'Hồ Hữu Thủ');
    // Stop-word check: "Nghệ sĩ với cây đàn" should not parse "Với Cây Đàn"
    assert.strictEqual(extractArtistFromNameOrText('Nghệ sĩ với cây đàn'), '');
  });

  test('parsePriceLine correctly parses dot-separated VND/USD and handles currency signs', () => {
    assert.strictEqual(parsePriceLine('Giá: 15.000'), 15000);
    assert.strictEqual(parsePriceLine('Giá: $ 9.500'), 9500);
    assert.strictEqual(parsePriceLine('Giá: $ 280.000'), 280000);
    assert.strictEqual(parsePriceLine('Giá: $'), null);
  });

  test('parseMetadataTokens normalizes typos and extracts medium, size, year', () => {
    const meta1 = parseMetadataTokens('Sơn dầu. 29x39cm, 2019');
    assert.strictEqual(meta1.chat_lieu, 'Sơn dầu');
    assert.strictEqual(meta1.kich_thuoc_tranh, '29x39cm');
    assert.strictEqual(meta1.nam_sang_tac, '2019');

    const meta2 = parseMetadataTokens('Sơn dầu, 150xx150cm, 2001');
    assert.strictEqual(meta2.chat_lieu, 'Sơn dầu');
    assert.strictEqual(meta2.kich_thuoc_tranh, '150x150cm');
    assert.strictEqual(meta2.nam_sang_tac, '2001');
  });

  test('estimateFrameSize calculates standard padding', () => {
    assert.strictEqual(estimateFrameSize('41x51cm'), '51x61cm');
    assert.strictEqual(estimateFrameSize('100x100cm'), '112x112cm');
  });

  const sampleDocx = '/Users/mac/.gemini/antigravity/brain/d2ba6a73-5c95-43bd-993c-b11bcc3aa410/.user_uploaded/media_1793508165085_f0e4768c.docx';
  if (fs.existsSync(sampleDocx)) {
    test('parses Ho Huu Thu price list docx with 100% precision', async () => {
      const buf = fs.readFileSync(sampleDocx);
      const parsed = await parseWordDocxBuffer(buf, 'BẢNG GIÁ.docx');

      assert.strictEqual(parsed.detectedArtist, 'Hồ Hữu Thủ');
      assert.strictEqual(parsed.detectedPeriod, '01/2026');
      assert.strictEqual(parsed.items.length, 73);
      assert.strictEqual(parsed.totalEmbeddedImages, 73);

      const merged = reconcileWordAndFolderItems(parsed, [], []);
      assert.strictEqual(merged.length, 73);
      assert.strictEqual(merged.filter(m => m.tinh_trang === 'da_ban').length, 29);
      assert.strictEqual(merged.filter(m => m.tinh_trang === 'chua_ban').length, 44);
    });
  }
});
