import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import { listLanIpv4 } from './network.js';

/**
 * Returns standard SSL certificate and key paths.
 */
export function getCertPaths(baseDir = process.cwd()) {
  const certsDir = path.resolve(baseDir, 'certs');
  const certPath = path.join(certsDir, 'cert.pem');
  const keyPath = path.join(certsDir, 'key.pem');
  return { certsDir, certPath, keyPath };
}

/**
 * Inspect an existing certificate file and extract SAN and validity.
 */
export function inspectCert(certPath) {
  if (!fs.existsSync(certPath)) return null;
  try {
    const raw = fs.readFileSync(certPath);
    const cert = new X509Certificate(raw);
    const validToDate = new Date(cert.validTo);
    const isNotExpired = validToDate.getTime() > Date.now() + 24 * 60 * 60 * 1000; // at least 24h remaining
    const san = cert.subjectAltName || '';
    return {
      isValid: isNotExpired,
      subjectAltName: san,
      validTo: validToDate,
      hasSan: Boolean(san && san.length > 0)
    };
  } catch (err) {
    return null;
  }
}

export function findOpenssl() {
  const candidates = [
    '/usr/bin/openssl',
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
    'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs\\Git\\usr\\bin\\openssl.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git\\usr\\bin\\openssl.exe'),
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  try {
    execSync('openssl version', { stdio: 'pipe' });
    return 'openssl';
  } catch {
    return null;
  }
}

/**
 * Generates modern self-signed X509v3 certificate with Subject Alternative Names (SAN)
 * compliant with Apple iOS 13+ / macOS 10.15+ and modern Chrome requirements.
 */
export function generateSslCert({ certPath, keyPath, lanIps = [], validDays = 825 }) {
  const certsDir = path.dirname(certPath);
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  const dnsNames = ['localhost', '*.local'];
  const ipList = ['127.0.0.1'];

  for (const ip of lanIps) {
    if (ip && !ipList.includes(ip) && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      ipList.push(ip);
    }
  }

  const sanParts = [
    ...dnsNames.map(d => `DNS:${d}`),
    ...ipList.map(ip => `IP:${ip}`)
  ];
  const sanString = sanParts.join(',');

  const opensslBin = findOpenssl() || 'openssl';

  const args = [
    opensslBin,
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    keyPath,
    '-out',
    certPath,
    '-days',
    String(validDays),
    '-subj',
    '/CN=localhost/O=BinhMinhGallery',
    '-addext',
    `subjectAltName=${sanString}`,
    '-addext',
    'extendedKeyUsage=serverAuth',
    '-addext',
    'basicConstraints=critical,CA:TRUE,pathlen:0',
    '-addext',
    'keyUsage=critical,digitalSignature,keyCertSign,cRLSign'
  ];

  const quotedCmd = args.map(arg => `"${arg}"`).join(' ');
  execSync(quotedCmd, { stdio: 'pipe' });

  try {
    fs.chmodSync(keyPath, 0o600);
    fs.chmodSync(certPath, 0o644);
  } catch {
    // best-effort chmod on non-posix or restricted environments
  }

  return { certPath, keyPath, sanString };
}

/**
 * Ensures SSL certificate exists, is non-expired, and contains SAN for localhost and all active LAN IPs.
 * Automatically regenerates if missing, expired, or missing any active LAN IP.
 */
export function ensureSslCertificate({ baseDir = process.cwd(), extraIps = [], force = false } = {}) {
  const { certsDir, certPath, keyPath } = getCertPaths(baseDir);

  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  const activeLanIps = listLanIpv4().map(e => e.address);
  const targetIps = Array.from(new Set([...activeLanIps, ...extraIps].filter(Boolean)));

  const existingCertValid = fs.existsSync(certPath) && fs.existsSync(keyPath);
  let certInfo = null;

  if (existingCertValid) {
    certInfo = inspectCert(certPath);
    if (!force && certInfo && certInfo.isValid && certInfo.hasSan) {
      const allIpsCovered = targetIps.every(ip => certInfo.subjectAltName.includes(ip));
      const localhostCovered = certInfo.subjectAltName.includes('localhost') && certInfo.subjectAltName.includes('127.0.0.1');

      if (allIpsCovered && localhostCovered) {
        return {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
          certPath,
          keyPath,
          regenerated: false,
          san: certInfo.subjectAltName
        };
      }
    }
  }

  // Check if OpenSSL is available to regenerate
  const opensslBin = findOpenssl();
  if (!opensslBin && existingCertValid && certInfo && certInfo.isValid) {
    console.log('[SSL] OpenSSL CLI not found, using valid pre-existing certificate with SAN:', certInfo.subjectAltName);
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      certPath,
      keyPath,
      regenerated: false,
      san: certInfo.subjectAltName
    };
  }

  try {
    // Generate updated X509v3 certificate with full SAN
    console.log('[SSL] Generating modern X509v3 self-signed certificate with SAN for IPs:', targetIps);
    const result = generateSslCert({ certPath, keyPath, lanIps: targetIps });

    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      certPath,
      keyPath,
      regenerated: true,
      san: result.sanString
    };
  } catch (err) {
    if (existingCertValid && certInfo && certInfo.isValid) {
      console.warn('[SSL] Certificate regeneration failed, falling back to existing valid certificate:', err.message);
      return {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
        certPath,
        keyPath,
        regenerated: false,
        san: certInfo.subjectAltName
      };
    }
    throw err;
  }
}
