import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import { buildExcelWorkbook } from '../server/excelService.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmpDirs = [];
const servers = [];

after(() => {
  for (const s of servers) s.child.kill();
  for (const dir of tmpDirs) {
    const exportsDir = path.join(dir, 'exports');
    if (fs.existsSync(exportsDir)) fs.chmodSync(exportsDir, 0o755); // a failed test may leave it read-only
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- helpers ---------------------------------------------------------------

function makeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bma-api-'));
  tmpDirs.push(dir);
  fs.cpSync(path.join(ROOT, 'server'), path.join(dir, 'server'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'junction');
  return dir;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(check, what, timeoutMs = 15000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = await check();
    if (last) return last;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for: ${what}`);
}

async function startServer(dir) {
  const port = 20000 + Math.floor(Math.random() * 30000);
  const logs = [];
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: dir,
    env: { ...process.env, PORT: String(port), BMA_EXPORT_DEBOUNCE_MS: '100', BMA_EXPORT_RETRY_MS: '300' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', d => logs.push(String(d)));
  child.stderr.on('data', d => logs.push(String(d)));
  const server = { port, child, logs, dir };
  servers.push(server);

  await waitFor(async () => {
    try {
      return (await fetch(`http://127.0.0.1:${port}/api/paintings`)).ok;
    } catch {
      return false; // not listening yet
    }
  }, 'server to answer');
  return server;
}

async function stopServer(server) {
  server.child.kill();
  await new Promise(resolve => server.child.once('exit', resolve));
}

async function api(server, method, url, body) {
  const res = await fetch(`http://127.0.0.1:${server.port}${url}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, json: await res.json() };
}

const listPaintings = async server => (await api(server, 'GET', '/api/paintings')).json.data;

function legacyPainting(id, overrides = {}) {
  return {
    id,
    ten_tac_pham: `Tranh ${id}`,
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    ngay_them: '10-01-2026',
    gia: 2000,
    ngay_cap_nhat_gia_gan_nhat: '10-01-2026',
    kich_thuoc_tranh: '80x60cm',
    kich_thuoc_khung_tranh: '92x72cm',
    nam_sang_tac: '2024',
    tinh_trang: 'chua_ban',
    khach_hang: '',
    ngay_mua_vao: '',
    ngay_ban: null,
    hoa_don: '',
    giay_chung_nhan: '',
    ngay_cap_nhat_san_pham: '10-01-2026',
    ghi_chu: '',
    hinh_anh: [`/images/tranh/${id}.jpg`],
    ...overrides
  };
}

// ---- tests -----------------------------------------------------------------

test('fresh start: seeds 14 paintings, creates the SQLite file and the Excel report', async () => {
  const dir = makeProject();
  const server = await startServer(dir);

  const data = await listPaintings(server);
  assert.equal(data.length, 14);
  assert.ok(fs.existsSync(path.join(dir, 'data', 'binhminhart.db')));
  await waitFor(() => fs.existsSync(path.join(dir, 'exports', 'BinhMinhArt_Inventory.xlsx')), 'Excel report');

  const { json } = await api(server, 'GET', '/api/network-info');
  assert.equal(json.dbStatus.engine, 'sqlite');
  assert.equal(json.dbStatus.paintingCount, 14);
  await stopServer(server);
});

test('create / update / delete persist across a server restart', async () => {
  const dir = makeProject();
  let server = await startServer(dir);

  const created = await api(server, 'POST', '/api/paintings', {
    ten_tac_pham: 'Mùa thu vàng',
    tac_gia: 'Dương Văn Sen',
    chat_lieu: 'Sơn mài',
    gia: 3500,
    kich_thuoc_tranh: '90x70cm',
    nam_sang_tac: '2025'
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const newId = created.json.data.id;

  const before = await listPaintings(server);
  const target = before.find(p => p.id !== newId);
  const updated = await api(server, 'PUT', `/api/paintings/${target.id}`, { gia: 4321 });
  assert.equal(updated.json.success, true);
  const victim = before.filter(p => p.id !== newId && p.id !== target.id)[0];
  assert.equal((await api(server, 'DELETE', `/api/paintings/${victim.id}`)).json.success, true);

  const expected = await listPaintings(server);
  await stopServer(server);
  server = await startServer(dir);
  const after = await listPaintings(server);

  assert.equal(after.length, 14, '14 + 1 created - 1 deleted');
  assert.deepEqual(after.map(p => p.id), expected.map(p => p.id));
  assert.equal(after.find(p => p.id === target.id).gia, 4321);
  assert.ok(after.some(p => p.id === newId));
  assert.ok(!after.some(p => p.id === victim.id));
  await stopServer(server);
});

test('selling a painting persists: status, customer and sale date', async () => {
  const dir = makeProject();
  let server = await startServer(dir);
  const first = (await listPaintings(server))[0];

  const res = await api(server, 'PUT', `/api/paintings/${first.id}`, {
    tinh_trang: 'da_ban',
    khach_hang: 'Anh Tuấn',
    ngay_ban: '20-10-2026',
    hoa_don: 'HD-1'
  });
  assert.equal(res.json.success, true);

  await stopServer(server);
  server = await startServer(dir);
  const reloaded = (await listPaintings(server)).find(p => p.id === first.id);
  assert.equal(reloaded.tinh_trang, 'da_ban');
  assert.equal(reloaded.khach_hang, 'Anh Tuấn');
  assert.equal(reloaded.ngay_ban, '20-10-2026');
  await stopServer(server);
});

test('an edit is NOT lost while the Excel report cannot be written, and the report catches up later', async (t) => {
  if (process.platform === 'win32') return t.skip('simulated with chmod; Windows lock is covered by the same code path');
  const dir = makeProject();
  const server = await startServer(dir);
  const exportsDir = path.join(dir, 'exports');
  const reportFile = path.join(exportsDir, 'BinhMinhArt_Inventory.xlsx');
  await waitFor(() => fs.existsSync(reportFile), 'initial Excel report');

  fs.chmodSync(exportsDir, 0o555); // report cannot be written (same effect as Excel locking the file)
  try {
    const first = (await listPaintings(server))[0];
    const res = await api(server, 'PUT', `/api/paintings/${first.id}`, { ghi_chu: 'LOCKED-EDIT-123' });
    assert.equal(res.json.success, true);

    // The edit is visible immediately: the database, not the Excel file, is the source of truth.
    assert.equal((await listPaintings(server)).find(p => p.id === first.id).ghi_chu, 'LOCKED-EDIT-123');

    // The failure is reported, not hidden.
    const failed = await waitFor(async () => {
      const { json } = await api(server, 'GET', '/api/network-info');
      return json.dbStatus.excelReport.ok === false ? json.dbStatus.excelReport : null;
    }, 'export failure to be reported');
    assert.match(failed.lastError, /EACCES|EPERM|permission/i);
  } finally {
    fs.chmodSync(exportsDir, 0o755);
  }

  // Once the file is writable again the report is regenerated by itself, including the edit.
  await waitFor(async () => {
    const { json } = await api(server, 'GET', '/api/network-info');
    return json.dbStatus.excelReport.ok === true;
  }, 'export to recover');
  const workbook = XLSX.read(fs.readFileSync(reportFile), { type: 'buffer' });
  assert.ok(JSON.stringify(workbook.Sheets).includes('LOCKED-EDIT-123'));
  assert.deepEqual(fs.readdirSync(exportsDir).filter(n => n.endsWith('.tmp')), [], 'no temp files left behind');
  await stopServer(server);
});

test('legacy Excel + JSON data is imported once, archived, and never re-imported', async () => {
  const dir = makeProject();
  const legacy = [
    legacyPainting('DVS-SM-01'),
    legacyPainting('DVS-SM-02', {
      tinh_trang: 'da_ban',
      khach_hang: 'Chị Hạnh (Đức)',
      ngay_ban: '15-01-2026',
      hoa_don: 'HD-2026-0089',
      gia: 1800
    }),
    legacyPainting('DVS-SD-01', { gia: null, chat_lieu: 'Sơn dầu' })
  ];
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'data', 'paintings.json'), JSON.stringify(legacy));
  const wb = buildExcelWorkbook(legacy);
  fs.writeFileSync(path.join(dir, 'BinhMinhArt_Inventory.xlsx'), XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

  let server = await startServer(dir);
  const data = await listPaintings(server);
  assert.deepEqual(data.map(p => p.id).sort(), ['DVS-SD-01', 'DVS-SM-01', 'DVS-SM-02']);
  const sold = data.find(p => p.id === 'DVS-SM-02');
  assert.equal(sold.tinh_trang, 'da_ban');
  assert.equal(sold.khach_hang, 'Chị Hạnh (Đức)');
  assert.equal(sold.ngay_ban, '15-01-2026');
  assert.equal(sold.gia, 1800);
  assert.equal(data.find(p => p.id === 'DVS-SD-01').gia, null);

  assert.ok(!fs.existsSync(path.join(dir, 'BinhMinhArt_Inventory.xlsx')), 'old Excel database moved away');
  assert.ok(fs.existsSync(path.join(dir, 'data', 'legacy', 'BinhMinhArt_Inventory.pre-sqlite.xlsx')));
  assert.ok(fs.existsSync(path.join(dir, 'data', 'legacy', 'paintings.pre-sqlite.json')));

  // Delete one, restart: must stay deleted (the old files must not be imported again).
  await api(server, 'DELETE', '/api/paintings/DVS-SM-01');
  fs.copyFileSync(
    path.join(dir, 'data', 'legacy', 'paintings.pre-sqlite.json'),
    path.join(dir, 'data', 'paintings.json')
  );
  await stopServer(server);
  server = await startServer(dir);
  assert.deepEqual((await listPaintings(server)).map(p => p.id).sort(), ['DVS-SD-01', 'DVS-SM-02']);
  await stopServer(server);
});

test('Excel export then import round-trips without changing the data', async () => {
  const dir = makeProject();
  const server = await startServer(dir);
  const before = await listPaintings(server);

  const exported = await fetch(`http://127.0.0.1:${server.port}/api/export-excel`);
  assert.equal(exported.status, 200);
  const buffer = Buffer.from(await exported.arrayBuffer());

  const form = new FormData();
  form.append('file', new Blob([buffer]), 'report.xlsx');
  const imported = await fetch(`http://127.0.0.1:${server.port}/api/import-excel`, { method: 'POST', body: form });
  const importedJson = await imported.json();
  assert.equal(importedJson.success, true, JSON.stringify(importedJson));

  const after = await listPaintings(server);
  assert.equal(after.length, before.length);
  for (const original of before) {
    const now = after.find(p => p.id === original.id);
    assert.ok(now, `${original.id} still exists`);
    assert.equal(now.gia, original.gia, `${original.id} price`);
    assert.equal(now.tinh_trang, original.tinh_trang, `${original.id} status`);
    assert.equal(now.ten_tac_pham, original.ten_tac_pham, `${original.id} title`);
  }
  await stopServer(server);
});

test('reset-seed takes a backup first and restores the 14 original paintings', async () => {
  const dir = makeProject();
  const server = await startServer(dir);
  const first = (await listPaintings(server))[0];
  await api(server, 'DELETE', `/api/paintings/${first.id}`);
  assert.equal((await listPaintings(server)).length, 13);

  assert.equal((await api(server, 'POST', '/api/reset-seed')).json.success, true);
  assert.equal((await listPaintings(server)).length, 14);

  const backups = fs.readdirSync(path.join(dir, 'data', 'backups'));
  assert.ok(backups.some(name => name.endsWith('-pre-reset.db')), `pre-reset backup exists: ${backups}`);
  await stopServer(server);
});
