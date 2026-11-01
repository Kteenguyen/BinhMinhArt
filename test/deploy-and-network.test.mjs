import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { X509Certificate } from 'node:crypto';
import { listLanIpv4, pickPrimaryLanIp } from '../server/network.js';

test('Deployment Scripts & Network Hardening Test Suite', async (t) => {
  const lanIp = pickPrimaryLanIp(listLanIpv4()) || '192.168.0.111';
  const targetPlist = path.join(process.env.HOME, 'Library/LaunchAgents/com.binhminhart.server.plist');

  await t.test('1. install.sh is idempotent and brings port 5001 online with HTTPS', () => {
    // Run install.sh twice in succession
    const out1 = execSync('bash deploy/macos/install.sh', { encoding: 'utf-8' });
    assert.ok(out1.includes('✅ BinhMinhArt daemon'), 'First install must succeed');

    const out2 = execSync('bash deploy/macos/install.sh', { encoding: 'utf-8' });
    assert.ok(out2.includes('✅ BinhMinhArt daemon'), 'Second install must succeed idempotently');

    assert.ok(fs.existsSync(targetPlist), 'LaunchAgent plist must exist');

    // Verify port 5001 is listening
    const lsof = execSync('lsof -i :5001', { encoding: 'utf-8' });
    assert.ok(lsof.includes('node'), 'Node must be listening on port 5001');
  });

  await t.test('2. uninstall.sh cleanly stops daemon, removes plist, and is idempotent', () => {
    const out1 = execSync('bash deploy/macos/uninstall.sh', { encoding: 'utf-8' });
    assert.ok(out1.includes('✅ Đã gỡ bỏ'), 'First uninstall must succeed');
    assert.equal(fs.existsSync(targetPlist), false, 'Target plist must be deleted');

    // Verify port 5001 is completely freed
    const portCheck = execSync('lsof -ti :5001 || true', { encoding: 'utf-8' }).trim();
    assert.equal(portCheck, '', 'Port 5001 must be free after uninstall');

    // Second uninstall run
    const out2 = execSync('bash deploy/macos/uninstall.sh', { encoding: 'utf-8' });
    assert.ok(out2.includes('✅ Đã gỡ bỏ'), 'Second uninstall must be idempotent');
  });

  await t.test('3. start_app.command recovers uninstalled daemon and brings server back online', () => {
    // Run start_app.command with stdin from /dev/null so it exits immediately
    const out = execSync('./start_app.command < /dev/null', { encoding: 'utf-8' });
    assert.ok(out.includes('HTTPS Cổng 5001'), 'start_app.command must report server ready');

    // Verify port 5001 is listening again
    const lsof = execSync('lsof -i :5001', { encoding: 'utf-8' });
    assert.ok(lsof.includes('node'), 'Node must be listening on port 5001');
  });

  await t.test('4. HTTP requests receive 301 redirect to HTTPS with preserved port and query', () => {
    // Test standard HTTP redirect on localhost
    const res1 = execSync('curl -sI http://localhost:5001/api/paintings?status=available', { encoding: 'utf-8' });
    assert.ok(res1.includes('301 Moved Permanently'), 'Must return 301 status');
    assert.ok(res1.includes('Location: https://localhost:5001/api/paintings?status=available'), 'Must redirect to HTTPS localhost with port');

    // Test Host header without port preserves port 5001
    const res2 = execSync(`curl -sI -H "Host: ${lanIp}" "http://localhost:5001/tranh/test"`, { encoding: 'utf-8' });
    assert.ok(res2.includes('301 Moved Permanently'), 'Must return 301 status');
    assert.ok(res2.includes(`Location: https://${lanIp}:5001/tranh/test`), 'Must redirect to LAN IP with port 5001');
  });

  await t.test('5. HTTPS requests respond with 200 OK and security headers without X-Powered-By leak', () => {
    const headers = execSync('curl -skI https://localhost:5001/', { encoding: 'utf-8' });
    assert.ok(headers.includes('200 OK'), 'Must return 200 OK');
    assert.equal(headers.toLowerCase().includes('x-powered-by: express'), false, 'X-Powered-By must be disabled');
    assert.ok(headers.includes('X-Content-Type-Options: nosniff'), 'Must include nosniff');
    assert.ok(headers.includes('X-Frame-Options: SAMEORIGIN'), 'Must include SAMEORIGIN');
    assert.ok(headers.includes('Referrer-Policy: strict-origin-when-cross-origin'), 'Must include Referrer-Policy');
  });

  await t.test('6. SSL certificate contains valid SAN matching localhost and current LAN IP', () => {
    const certPath = path.resolve('certs', 'cert.pem');
    assert.ok(fs.existsSync(certPath), 'certs/cert.pem must exist');

    const cert = new X509Certificate(fs.readFileSync(certPath));
    const san = cert.subjectAltName || '';
    assert.ok(san.includes('localhost'), 'SAN must contain localhost');
    assert.ok(san.includes('127.0.0.1'), 'SAN must contain 127.0.0.1');
    assert.ok(san.includes(lanIp), `SAN must contain LAN IP: ${lanIp}`);

    // Verify curl with --cacert cert.pem succeeds without cert errors
    const code = execSync(`curl -s -o /dev/null -w "%{http_code}" --cacert certs/cert.pem https://${lanIp}:5001/api/network-info`, { encoding: 'utf-8' });
    assert.equal(code.trim(), '200', 'Curl with cacert must succeed with 200 OK without host mismatch');
  });

  await t.test('7. Core APIs return valid data over HTTPS', () => {
    const networkInfoRaw = execSync('curl -sk https://localhost:5001/api/network-info', { encoding: 'utf-8' });
    const networkInfo = JSON.parse(networkInfoRaw);
    assert.equal(networkInfo.success, true);
    assert.equal(String(networkInfo.config.port), '5001');
    assert.ok(networkInfo.config.effectiveHttpsUrl.startsWith('https://'));

    const paintingsRaw = execSync('curl -sk https://localhost:5001/api/paintings', { encoding: 'utf-8' });
    const paintings = JSON.parse(paintingsRaw);
    assert.equal(paintings.success, true);
    assert.ok(Array.isArray(paintings.data), 'paintings.data must be an array');

    const customersRaw = execSync('curl -sk https://localhost:5001/api/customers', { encoding: 'utf-8' });
    const customers = JSON.parse(customersRaw);
    assert.equal(customers.success, true);
    assert.ok(Array.isArray(customers.data), 'customers.data must be an array');
  });

  await t.test('8. Mobile User-Agents receive proper 301 HTTP redirects and 200 HTTPS responses', () => {
    const iosUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
    const androidUa = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

    // iOS Safari HTTP -> HTTPS
    const iosHttp = execSync(`curl -sI -A "${iosUa}" "http://localhost:5001/tranh/test"`, { encoding: 'utf-8' });
    assert.ok(iosHttp.includes('301 Moved Permanently'), 'iOS UA must receive 301');
    assert.ok(iosHttp.includes('Location: https://localhost:5001/tranh/test'), 'iOS UA redirected to HTTPS');

    // Android Chrome HTTP -> HTTPS on LAN IP
    const androidHttp = execSync(`curl -sI -A "${androidUa}" -H "Host: ${lanIp}" "http://localhost:5001/api/paintings"`, { encoding: 'utf-8' });
    assert.ok(androidHttp.includes('301 Moved Permanently'), 'Android UA must receive 301');
    assert.ok(androidHttp.includes(`Location: https://${lanIp}:5001/api/paintings`), 'Android UA redirected to LAN HTTPS');

    // iOS Safari HTTPS 200
    const iosHttps = execSync(`curl -sk -A "${iosUa}" -o /dev/null -w "%{http_code}" https://localhost:5001/`, { encoding: 'utf-8' });
    assert.equal(iosHttps.trim(), '200', 'iOS UA must receive 200 OK over HTTPS');

    // Android Chrome HTTPS 200 on LAN IP
    const androidHttps = execSync(`curl -sk -A "${androidUa}" -o /dev/null -w "%{http_code}" https://${lanIp}:5001/`, { encoding: 'utf-8' });
    assert.equal(androidHttps.trim(), '200', 'Android UA must receive 200 OK over HTTPS on LAN IP');
  });

  await t.test('9. Frontend assets and build bundle enforce HTTPS without mixed content or stale port 5002', () => {
    const distHtmlPath = path.resolve('dist', 'index.html');
    assert.ok(fs.existsSync(distHtmlPath), 'dist/index.html must exist');
    const htmlContent = fs.readFileSync(distHtmlPath, 'utf-8');

    // Check no unencrypted http:// script or stylesheet links in HTML
    assert.equal(/src=["']http:\/\//i.test(htmlContent), false, 'No insecure HTTP scripts allowed');
    assert.equal(/href=["']http:\/\//i.test(htmlContent), false, 'No insecure HTTP stylesheets allowed');

    // Check bundle has no stale port 5002
    const distAssets = fs.readdirSync(path.resolve('dist', 'assets'));
    const jsAsset = distAssets.find(f => f.endsWith('.js'));
    assert.ok(jsAsset, 'JavaScript bundle must exist in dist/assets');
    const jsContent = fs.readFileSync(path.resolve('dist', 'assets', jsAsset), 'utf-8');
    assert.equal(jsContent.includes('localhost:5002'), false, 'JS bundle must not contain stale localhost:5002');
  });

  await t.test('10. QR code SVG and PNG endpoints generate valid HTTPS targets over LAN IP', async () => {
    // Test SVG generation over HTTPS
    const svgRes = execSync(`curl -sk "https://${lanIp}:5001/api/qr/test-artwork-123"`, { encoding: 'utf-8' });
    assert.ok(svgRes.includes('<svg'), 'QR endpoint must return SVG');
    assert.ok(svgRes.includes('viewBox='), 'SVG must have valid viewBox');

    // Test PNG generation over HTTPS
    const pngHeader = execSync(`curl -skI "https://${lanIp}:5001/api/qr/test-artwork-123?format=png"`, { encoding: 'utf-8' });
    assert.ok(pngHeader.includes('image/png'), 'QR endpoint must return image/png');

    // Verify target URL inside QR points to HTTPS and current LAN IP
    const { getArtworkQrTargetUrl } = await import('../server/excelService.js');
    const targetUrl = getArtworkQrTargetUrl('test-artwork-123');
    assert.ok(targetUrl.startsWith(`https://${lanIp}:5001/tranh/test-artwork-123`), `Target URL must be HTTPS on LAN IP: ${targetUrl}`);
  });
});

