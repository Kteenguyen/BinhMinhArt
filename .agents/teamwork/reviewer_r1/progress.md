# Progress Log - Reviewer Round 1

## Status
- **Current Phase**: Completed Verification & Hardening
- **Timestamp**: 2026-11-01T10:50:00+07:00

## Completed Actions
1. **Rigorously Tested & Verified Prior Work**:
   - Tested crash recovery (`kill -9` on node process): launchd KeepAlive automatically and immediately restarted the server within ~1 second.
   - Tested single-port TCP multiplexer: Plain HTTP traffic gets 301 Moved Permanently redirect to HTTPS across all paths and queries; HTTPS connections get 200 OK.
   - Tested LAN IP binding (`192.168.0.111:5001`) and localhost (`localhost:5001`).
   - Tested core REST APIs (`/api/paintings`, `/api/customers`, `/api/network-info`, `/api/qr/:id`, `/tranh/:id`) with live Google Sheets backend.
   - Ran `test/table-readonly-sticky-columns.test.mjs` (23/23 tests passed).
   - Ran `npm run build` (Clean production build in 4.29s).

2. **Identified Deficiencies in Prior Attempt**:
   - LaunchAgent plist was missing `ThrottleInterval`: A crash loop could cause high CPU without launchd throttling.
   - `install.sh` used static hardcoded paths instead of dynamic resolution of `$PROJECT_DIR` and `$NODE_BIN`.
   - `start_app.command` exited immediately when daemon was detected, without printing the LAN IP or mobile instructions for users wanting to connect from phone/tablet.
   - SSL warning documentation omitted the iOS Safari Passcode/Biometrics confirmation step and Chrome's emergency keyword bypass (`thisisunsafe`).
   - `README.md` was still stating `http://localhost:5001` and `http://localhost:3000` with no mention of HTTPS or daemon service.

3. **Applied In-Place Defect Fixes**:
   - `deploy/macos/com.binhminhart.server.plist`: Added `ThrottleInterval: 5`.
   - `deploy/macos/install.sh`: Dynamic pathing for `$PROJECT_DIR` and `$NODE_BIN`, defensive `mkdir -p data`.
   - `deploy/macos/uninstall.sh`: Guaranteed cleanup of lingering port 5001 node process.
   - `start_app.command`: Added automatic LAN IP detection, LaunchAgent daemon verification, and clear user connection banner.
   - `README.md`: Updated to HTTPS, daemon management instructions, and SSL bypass guidance.

4. **Re-verified System End-to-End**:
   - Daemon running cleanly (PID 6892).
   - `start_app.command` tested and working.
   - All acceptance criteria satisfied.
