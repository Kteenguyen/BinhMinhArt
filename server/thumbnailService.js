import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';

const THUMB_DIR = path.resolve('thumbnails');

if (!fs.existsSync(THUMB_DIR)) {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
}

export function getThumbNameForPath(relPath) {
  const hash = crypto.createHash('md5').update(relPath).digest('hex');
  return `thumb_${hash}.jpg`;
}

/**
 * Generate a thumbnail for an image file if it doesn't already exist or if source is newer.
 * @param {string} sourcePath - absolute path to original image
 * @param {string} thumbName - file name for thumbnail
 * @returns {Promise<string>} - thumbnail URL path
 */
export async function ensureThumbnail(sourcePath, thumbName) {
  if (!fs.existsSync(sourcePath)) {
    return null;
  }

  const targetPath = path.join(THUMB_DIR, thumbName);
  
  if (fs.existsSync(targetPath)) {
    const srcStat = fs.statSync(sourcePath);
    const thumbStat = fs.statSync(targetPath);
    if (thumbStat.mtimeMs >= srcStat.mtimeMs) {
      return `/thumbnails/${thumbName}`;
    }
  }

  try {
    await sharp(sourcePath)
      .resize({ width: 360, withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true })
      .toFile(targetPath);
    return `/thumbnails/${thumbName}`;
  } catch (err) {
    console.error(`Error generating thumbnail for ${sourcePath}:`, err.message);
    return null;
  }
}

/**
 * Generate thumbnails for all images in TRANH, ĐÃ BÁN, uploads
 */
export async function generateAllThumbnails() {
  const folders = [
    { dir: 'TRANH', prefix: 'tranh/' },
    { dir: 'ĐÃ BÁN', prefix: 'daban/' },
    { dir: 'uploads', prefix: 'uploads/' }
  ];

  for (const { dir, prefix } of folders) {
    const absDir = path.resolve(dir);
    if (!fs.existsSync(absDir)) continue;

    const files = fs.readdirSync(absDir);
    for (const file of files) {
      if (file.startsWith('.')) continue;
      const srcPath = path.join(absDir, file);
      if (!fs.statSync(srcPath).isFile()) continue;
      const ext = path.extname(file).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.jfif'].includes(ext)) continue;

      const safeName = getThumbNameForPath(prefix + file);
      await ensureThumbnail(srcPath, safeName);
    }
  }
}
