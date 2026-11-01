import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getCertPaths, inspectCert, generateSslCert, ensureSslCertificate } from '../server/sslCert.js';

test('SSL Certificate Utility Test Suite', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bma-ssl-test-'));

  t.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await t.test('getCertPaths resolves cert and key under certs directory', () => {
    const paths = getCertPaths(tmpDir);
    assert.equal(paths.certPath, path.join(tmpDir, 'certs', 'cert.pem'));
    assert.equal(paths.keyPath, path.join(tmpDir, 'certs', 'key.pem'));
  });

  await t.test('generateSslCert creates X509v3 cert with SAN and serverAuth EKU', () => {
    const { certPath, keyPath } = getCertPaths(tmpDir);
    const testIps = ['192.168.0.111', '10.0.0.5'];
    generateSslCert({ certPath, keyPath, lanIps: testIps, validDays: 30 });

    assert.ok(fs.existsSync(certPath), 'cert.pem must exist');
    assert.ok(fs.existsSync(keyPath), 'key.pem must exist');

    const info = inspectCert(certPath);
    assert.ok(info !== null, 'Certificate should be inspectable');
    assert.equal(info.isValid, true);
    assert.equal(info.hasSan, true);
    assert.ok(info.subjectAltName.includes('localhost'), 'SAN must include localhost');
    assert.ok(info.subjectAltName.includes('127.0.0.1'), 'SAN must include 127.0.0.1');
    assert.ok(info.subjectAltName.includes('192.168.0.111'), 'SAN must include 192.168.0.111');
    assert.ok(info.subjectAltName.includes('10.0.0.5'), 'SAN must include 10.0.0.5');
  });

  await t.test('ensureSslCertificate reuses valid cert without regenerating', () => {
    const result1 = ensureSslCertificate({ baseDir: tmpDir, extraIps: ['192.168.0.111'] });
    assert.equal(result1.regenerated, false);
  });

  await t.test('ensureSslCertificate regenerates when a new IP is required', () => {
    const result2 = ensureSslCertificate({ baseDir: tmpDir, extraIps: ['192.168.1.99'] });
    assert.equal(result2.regenerated, true);
    const info = inspectCert(result2.certPath);
    assert.ok(info.subjectAltName.includes('192.168.1.99'), 'Updated SAN must include new IP');
  });
});
