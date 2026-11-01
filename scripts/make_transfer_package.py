#!/usr/bin/env python3
"""
Build a zip of this project to copy onto the Windows PC (run this on the Mac).

    python3 scripts/make_transfer_package.py

What it does
  - Includes source, images, the SQLite database and the deploy scripts.
  - The database is copied with SQLite's online backup API, so the copy is consistent
    even if the server is running. (Never copy data/binhminhart.db by hand while it runs.)
  - Leaves out things the PC regenerates itself: node_modules, dist, logs, the Excel report
    (exports/), QR codes (thumbnails/qr - they must encode the PC's IP, not this Mac's) and
    data/network_config.json (holds this Mac's IP). Old backups and pre-SQLite files stay here.
  - Writes every file name in Unicode NFC. macOS can store Vietnamese names
    decomposed (NFD); Windows looks files up by exact characters, so NFD names
    would break image links. This also covers the "BẢNG GIÁ.docx" file.
"""
import datetime
import os
import sqlite3
import sys
import tempfile
import unicodedata
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_RELATIVE = 'data/binhminhart.db'
CUSTOMER_DB_RELATIVE = 'data/customers.db'


def nfc(text):
    return unicodedata.normalize('NFC', text)


INCLUDE_DIRS = {nfc(n) for n in [
    'server', 'src', 'public', 'data', 'TRANH', 'ĐÃ BÁN', 'uploads', 'thumbnails', 'deploy', 'docs', 'scripts',
]}
INCLUDE_FILES = {nfc(n) for n in [
    'package.json', 'package-lock.json', 'index.html', 'vite.config.js',
    'tailwind.config.js', 'postcss.config.js', 'README.md',
    'start_windows.bat', 'install_startup_windows.bat',
]}
SKIP_DIR_NAMES = {'node_modules', 'dist', 'logs', '.git', '__pycache__'}
SKIP_RELATIVE = {
    'thumbnails/qr', 'data/network_config.json', 'data/legacy', 'data/backups', 'data/paintings.json',
}
STORE_ONLY_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.xlsx', '.docx', '.zip'}


def should_skip(rel_posix, name):
    if name in SKIP_DIR_NAMES or name == '.DS_Store' or name.startswith('._'):
        return True
    if rel_posix.startswith('data/') and (name.startswith('binhminhart.db') or name.startswith('customers.db')):
        return True  # live databases (and their -wal/-shm) are added separately as safe snapshots
    return rel_posix in SKIP_RELATIVE


def snapshot_database(rel_db_path, target_path):
    """Consistent single-file copy of a live database. Returns False if there is no database yet."""
    source_path = os.path.join(ROOT, *rel_db_path.split('/'))
    if not os.path.exists(source_path):
        return False
    source = sqlite3.connect(source_path)
    destination = sqlite3.connect(target_path)
    try:
        source.backup(destination)
        destination.execute('PRAGMA journal_mode = DELETE')  # one self-contained file, no -wal/-shm
        check = destination.execute('PRAGMA integrity_check').fetchone()[0]
        if check != 'ok':
            raise RuntimeError(f'Database copy failed integrity check: {check}')
    finally:
        destination.close()
        source.close()
    return True


def collect():
    """Yield (absolute_path, archive_name) for everything to ship."""
    for top in sorted(os.listdir(ROOT)):
        top_nfc = nfc(top)
        abs_top = os.path.join(ROOT, top)
        is_docx = os.path.isfile(abs_top) and top.lower().endswith('.docx')
        if os.path.isdir(abs_top) and top_nfc in INCLUDE_DIRS:
            for dirpath, dirnames, filenames in os.walk(abs_top):
                rel_dir = nfc(os.path.relpath(dirpath, ROOT)).replace(os.sep, '/')
                dirnames[:] = [d for d in dirnames if not should_skip(f'{rel_dir}/{nfc(d)}', d)]
                for fn in sorted(filenames):
                    rel = f'{rel_dir}/{nfc(fn)}'
                    if should_skip(rel, fn):
                        continue
                    yield os.path.join(dirpath, fn), rel
        elif os.path.isfile(abs_top) and (top_nfc in INCLUDE_FILES or is_docx):
            yield abs_top, top_nfc


def main():
    stamp = datetime.date.today().strftime('%Y%m%d')
    out_path = os.path.join(ROOT, f'BinhMinhArt_transfer_{stamp}.zip')
    if os.path.exists(out_path):
        os.remove(out_path)

    count = 0
    total = 0
    with tempfile.TemporaryDirectory() as tmp_dir:
        snapshot_path = os.path.join(tmp_dir, 'binhminhart.db')
        if not snapshot_database(DB_RELATIVE, snapshot_path):
            print(f'ERROR: {DB_RELATIVE} not found. Start the server once (npm start) so the database exists.')
            return 1

        with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            zf.write(snapshot_path, DB_RELATIVE, compress_type=zipfile.ZIP_DEFLATED)
            count += 1
            total += os.path.getsize(snapshot_path)

            # Also snapshot customer database if it exists
            customer_snapshot_path = os.path.join(tmp_dir, 'customers.db')
            if snapshot_database(CUSTOMER_DB_RELATIVE, customer_snapshot_path):
                zf.write(customer_snapshot_path, CUSTOMER_DB_RELATIVE, compress_type=zipfile.ZIP_DEFLATED)
                count += 1
                total += os.path.getsize(customer_snapshot_path)
            for abs_path, arcname in collect():
                ext = os.path.splitext(arcname)[1].lower()
                method = zipfile.ZIP_STORED if ext in STORE_ONLY_EXT else zipfile.ZIP_DEFLATED
                zf.write(abs_path, arcname, compress_type=method)
                count += 1
                total += os.path.getsize(abs_path)

    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f'Created: {out_path}')
    print(f'Files: {count} | Source size: {total / (1024 * 1024):.0f} MB | Zip: {size_mb:.0f} MB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
