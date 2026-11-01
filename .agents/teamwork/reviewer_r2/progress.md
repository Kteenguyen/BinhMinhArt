# Progress - Round 2 Review & QA Refinement

## Tasks & Investigations
- [x] Initial workspace state & running processes inspection (PID 6892 listening on port 5001).
- [x] Deep audit of SSL certificate & security headers:
  - Discovered existing cert was X509v1 without Subject Alternative Name (SAN), violating iOS 13+ and Chrome RFC 2818 requirements.
  - Discovered `X-Powered-By: Express` leakage and missing standard defense-in-depth headers.
  - Discovered silent fallback to plain HTTP if cert files were missing or corrupted.
- [x] Deep audit of HTTP -> HTTPS redirection:
  - Discovered bug where requests with `Host: <ip>` without explicit port were redirected to port 443 instead of 5001.
- [x] Deep audit of deployment scripts (`install.sh`, `uninstall.sh`, `start_app.command`):
  - Discovered `uninstall.sh` failed to unregister daemon if plist was removed beforehand, causing launchd respawn loops.
  - Discovered missing port 5001 cleanup and synchronization before launchd registration in `install.sh`.
  - Discovered missing PATH exports and unbuffered sleeps in `start_app.command`.
- [x] Implemented `server/sslCert.js` for automatic X509v3 certificate generation and validation with full SAN coverage (`localhost`, `127.0.0.1`, active LAN IPs, `*.local`) and Apple `serverAuth` compliance.
- [x] Enhanced `server/index.js` with `app.disable('x-powered-by')`, security headers, automated `ensureSslCertificate()`, socket timeout protection, and robust redirect host formatting.
- [x] Hardened `deploy/macos/install.sh`, `deploy/macos/uninstall.sh`, and `start_app.command`.
- [x] Created unit tests `test/sslCert.test.mjs` and end-to-end integration tests `test/deploy-and-network.test.mjs`.
- [x] Verified full test suite (36/36 tests passing) and production build (`npm run build`).
- [x] Documented all findings, fixes, and instructions in `handoff.md`.
