import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore, StoreValidationError, SCHEMA_VERSION } from '../server/sqliteStore.js';

const tmpDirs = [];
after(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function tmpDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bma-store-'));
  tmpDirs.push(dir);
  return { dir, file: path.join(dir, 'test.db') };
}

function painting(id, overrides = {}) {
  return {
    id,
    ten_tac_pham: `Tranh ${id}`,
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    tinh_trang: 'chua_ban',
    gia: 1500,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '80x60cm',
    kich_thuoc_khung_tranh: '92x72cm',
    nam_sang_tac: '2025',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_them: '10-01-2026',
    ngay_cap_nhat_san_pham: '10-01-2026',
    ghi_chu: '',
    hinh_anh: ['/images/tranh/a.jpg'],
    ...overrides
  };
}

test('round trip keeps order, values and exact types', () => {
  const { file } = tmpDbPath();
  const store = createStore(file);
  const input = [
    painting('B-02', { gia: null }),
    painting('A-01', { tinh_trang: 'da_ban', ngay_ban: '15-01-2026', khach_hang: 'Chị Hạnh (Đức)', gia: 1800.5 }),
    painting('C-03', { hinh_anh: [] })
  ];
  assert.equal(store.replaceAll(input), 3);

  const out = store.list();
  assert.deepEqual(out.map(p => p.id), ['B-02', 'A-01', 'C-03'], 'display order is preserved');
  assert.equal(out[0].gia, null);
  assert.equal(typeof out[1].gia, 'number');
  assert.equal(out[1].gia, 1800.5);
  assert.equal(out[1].ngay_ban, '15-01-2026');
  assert.equal(out[0].ngay_ban, null);
  assert.deepEqual(out[2].hinh_anh, []);
  assert.deepEqual(out[0].hinh_anh, ['/images/tranh/a.jpg']);
  assert.equal(out[1].khach_hang, 'Chị Hạnh (Đức)');
  store.close();
});

test('replaceAll inserts, updates and deletes in one call', () => {
  const { file } = tmpDbPath();
  const store = createStore(file);
  store.replaceAll([painting('A'), painting('B'), painting('C')]);
  store.replaceAll([painting('C', { gia: 99 }), painting('D'), painting('A')]);

  const out = store.list();
  assert.deepEqual(out.map(p => p.id), ['C', 'D', 'A']);
  assert.equal(out[0].gia, 99);
  assert.equal(store.count(), 3);
  store.close();
});

test('data survives close/reopen and schema version is set', () => {
  const { file } = tmpDbPath();
  const first = createStore(file);
  first.replaceAll([painting('A'), painting('B')]);
  first.setMeta('hello', 'world');
  first.close();

  const second = createStore(file);
  assert.equal(second.count(), 2);
  assert.equal(second.getMeta('hello'), 'world');
  assert.equal(second.getMeta('missing'), null);
  assert.equal(second.raw.prepare('PRAGMA user_version').get().user_version, SCHEMA_VERSION);
  assert.equal(second.integrityCheck(), 'ok');
  second.close();
});

const INVALID_CASES = [
  ['tinh_trang outside the allowed values', { tinh_trang: 'abc' }],
  ['missing tinh_trang', { tinh_trang: undefined }],
  ['negative price', { gia: -1 }],
  ['price given as text', { gia: '1500' }],
  ['price NaN', { gia: NaN }],
  ['price Infinity', { gia: Infinity }],
  ['blank id', { id: '   ' }],
  ['images not an array', { hinh_anh: '/x.jpg' }],
  ['images contain non-text', { hinh_anh: ['/x.jpg', 5] }],
  ['text field is an object', { ten_tac_pham: { a: 1 } }],
  ['sale date is a number', { ngay_ban: 20260115 }]
];

for (const [label, override] of INVALID_CASES) {
  test(`rejects invalid data (${label}) and leaves the database unchanged`, () => {
    const { file } = tmpDbPath();
    const store = createStore(file);
    store.replaceAll([painting('A', { ghi_chu: 'original' }), painting('B')]);
    const before = JSON.stringify(store.list());

    // The bad item sits in the MIDDLE of an otherwise valid batch: nothing may be saved.
    const batch = [painting('A', { ghi_chu: 'changed' }), painting('BAD', override), painting('Z')];
    assert.throws(() => store.replaceAll(batch), StoreValidationError);
    assert.equal(JSON.stringify(store.list()), before);
    store.close();
  });
}

test('rejects duplicate ids instead of silently merging them', () => {
  const { file } = tmpDbPath();
  const store = createStore(file);
  store.replaceAll([painting('A')]);
  assert.throws(() => store.replaceAll([painting('X'), painting('X')]), /trùng/);
  assert.deepEqual(store.list().map(p => p.id), ['A']);
  store.close();
});

test('rejects a non-array payload', () => {
  const { file } = tmpDbPath();
  const store = createStore(file);
  assert.throws(() => store.replaceAll({ id: 'A' }), StoreValidationError);
  store.close();
});

test('unknown keys (e.g. thumbnail_url) are ignored, not stored', () => {
  const { file } = tmpDbPath();
  const store = createStore(file);
  store.replaceAll([painting('A', { thumbnail_url: '/thumbnails/x.jpg', extra: 1 })]);
  const out = store.list()[0];
  assert.equal('thumbnail_url' in out, false);
  assert.equal('extra' in out, false);
  store.close();
});

test('database CHECK constraints hold even when validation is bypassed', () => {
  const { file } = tmpDbPath();
  const store = createStore(file);
  const insert = (id, status, gia, images) =>
    store.raw
      .prepare('INSERT INTO paintings (id, position, tinh_trang, gia, hinh_anh) VALUES (?, 0, ?, ?, ?)')
      .run(id, status, gia, images);

  assert.throws(() => insert('x1', 'abc', 1, '[]'), /CHECK/);
  assert.throws(() => insert('x2', 'chua_ban', -5, '[]'), /CHECK/);
  assert.throws(() => insert('x3', 'chua_ban', 1, '{"a":1}'), /CHECK/);
  assert.throws(() => insert('x4', 'chua_ban', 1, 'not json'), /CHECK/);
  assert.throws(() => insert('   ', 'chua_ban', 1, '[]'), /CHECK/);
  assert.doesNotThrow(() => insert('ok', 'da_ban', null, '[]'));
  store.close();
});

test('a failure in the middle of a write rolls the whole write back', () => {
  const { file } = tmpDbPath();
  const store = createStore(file);
  store.replaceAll([painting('A', { ghi_chu: 'original' }), painting('B')]);

  // Make the database itself fail on one specific row, after earlier rows were already written.
  store.raw.exec(
    "CREATE TRIGGER fail_on_boom BEFORE INSERT ON paintings WHEN NEW.id = 'BOOM' BEGIN SELECT RAISE(ABORT, 'boom'); END;"
  );
  assert.throws(() => store.replaceAll([painting('A', { ghi_chu: 'CHANGED' }), painting('BOOM')]), /boom/);

  const out = store.list();
  assert.deepEqual(out.map(p => p.id), ['A', 'B'], 'B was not deleted');
  assert.equal(out[0].ghi_chu, 'original', 'A was not updated');
  store.close();
});

test('backupTo creates a complete, valid copy', () => {
  const { dir, file } = tmpDbPath();
  const store = createStore(file);
  store.replaceAll([painting('A'), painting('B')]);
  const backupFile = path.join(dir, 'nested', 'backup.db');
  store.backupTo(backupFile);
  store.replaceAll([painting('Z')]);

  const copy = createStore(backupFile);
  assert.deepEqual(copy.list().map(p => p.id), ['A', 'B']);
  assert.equal(copy.integrityCheck(), 'ok');
  copy.close();
  store.close();
});

test('refuses a database written by a newer app version', () => {
  const { file } = tmpDbPath();
  const store = createStore(file);
  store.raw.exec('PRAGMA user_version = 99');
  store.close();
  assert.throws(() => createStore(file), /newer than this app supports/);
});
