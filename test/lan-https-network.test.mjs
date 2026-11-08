import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { X509Certificate } from 'node:crypto';
import { listLanIpv4, pickPrimaryLanIp } from '../server/network.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Active LAN IP HTTPS Verification Suite', async () => {
  const detectedList = listLanIpv4();
  const lanIp = pickPrimaryLanIp(detectedList);
  const BACKEND_PORT = process.env.PORT || 5001;

  test('NET-1: Active LAN IP interface is detected and belongs to a private network', () => {
    assert.ok(lanIp, 'Primary LAN IP must be detected on active interface');
    assert.match(
      lanIp,
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/,
      `LAN IP (${lanIp}) must be a valid private IPv4 address`
    );
  });

  test('NET-2: SSL certificate Subject Alternative Name (SAN) covers localhost and active LAN IP', () => {
    const certPath = path.resolve(ROOT, 'certs', 'cert.pem');
    assert.ok(fs.existsSync(certPath), 'certs/cert.pem must exist');

    const cert = new X509Certificate(fs.readFileSync(certPath));
    const san = cert.subjectAltName || '';
    assert.ok(san.includes('localhost'), 'SAN must cover localhost');
    assert.ok(san.includes('127.0.0.1'), 'SAN must cover 127.0.0.1');
    assert.ok(san.includes(lanIp), `SAN must cover active LAN IP: ${lanIp}`);
  });

  test('NET-3: Backend HTTPS endpoint returns HTTP 200 over active LAN IP without host mismatch', () => {
    // Probing root endpoint
    const rootCode = execSync(
      `curl -sk -o /dev/null -w "%{http_code}" https://${lanIp}:${BACKEND_PORT}/`,
      { encoding: 'utf-8' }
    ).trim();
    assert.equal(rootCode, '200', `HTTPS root on LAN IP must return 200 OK, got: ${rootCode}`);

    // Probing network info API
    const apiCode = execSync(
      `curl -sk -o /dev/null -w "%{http_code}" https://${lanIp}:${BACKEND_PORT}/api/network-info`,
      { encoding: 'utf-8' }
    ).trim();
    assert.equal(apiCode, '200', `API /api/network-info on LAN IP must return 200 OK, got: ${apiCode}`);

    // Probing core paintings API
    const paintingsRaw = execSync(
      `curl -sk https://${lanIp}:${BACKEND_PORT}/api/paintings`,
      { encoding: 'utf-8' }
    );
    const json = JSON.parse(paintingsRaw);
    assert.equal(json.success, true, 'Paintings API must return success: true over LAN IP HTTPS');
    assert.ok(Array.isArray(json.data), 'Paintings data must be an array');
  });

  test('NET-4: Plain HTTP requests on LAN IP port receive 301 redirect to HTTPS preserving port', () => {
    const header = execSync(
      `curl -sI -H "Host: ${lanIp}:${BACKEND_PORT}" "http://localhost:${BACKEND_PORT}/api/paintings"`,
      { encoding: 'utf-8' }
    );
    assert.ok(header.includes('301 Moved Permanently'), 'Plain HTTP must return 301');
    assert.ok(
      header.includes(`Location: https://${lanIp}:${BACKEND_PORT}/api/paintings`),
      'Redirect must target HTTPS on LAN IP with preserved port'
    );
  });

  test('NET-5: Frontend development server HTTPS configuration check', () => {
    const viteConfigCode = fs.readFileSync(path.resolve(ROOT, 'vite.config.js'), 'utf8');

    // Host binding check
    assert.ok(
      viteConfigCode.includes('host: true') || viteConfigCode.includes("host: '0.0.0.0'"),
      'Vite must bind to 0.0.0.0 or host: true'
    );

    // HTTPS configuration check
    assert.ok(
      viteConfigCode.includes('https:'),
      'Vite config must declare https configuration with SSL cert & key'
    );
  });
});
