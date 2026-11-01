import os from 'os';

/**
 * Network helpers: which address should OTHER devices (phones, family PCs) use to reach this server?
 * "localhost" only works on the server machine itself, so the QR codes and shared links must use
 * the machine's address on the home network.
 */

// Adapters that are never the home-network address (virtual switches, VPNs, containers, Bluetooth...).
const VIRTUAL_INTERFACE =
  /^(vEthernet|WSL|docker|br-|veth|utun|awdl|llw|bridge|vmnet|vboxnet|VirtualBox|VMware|Loopback|Bluetooth|Tailscale|ZeroTier)/i;

const PRIVATE_IPV4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * IPv4 addresses of this machine on real network adapters.
 * @param {Record<string, os.NetworkInterfaceInfo[] | undefined>} interfaces injectable for tests
 * @returns {{interface: string, address: string}[]}
 */
export function listLanIpv4(interfaces = os.networkInterfaces()) {
  const result = [];
  for (const [name, addresses] of Object.entries(interfaces)) {
    if (VIRTUAL_INTERFACE.test(name)) continue;
    for (const entry of addresses || []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      if (entry.address.startsWith('169.254.')) continue; // link-local: no DHCP answer, unusable
      result.push({ interface: name, address: entry.address });
    }
  }
  return result;
}

/** Best guess for the home-network address: first private-range address, else the first one found, else null. */
export function pickPrimaryLanIp(list = listLanIpv4()) {
  const preferred = list.find(entry => PRIVATE_IPV4.test(entry.address));
  const chosen = preferred || list[0];
  return chosen ? chosen.address : null;
}

/** True for hostnames that only mean "this very machine". */
export function isLoopbackHost(hostname) {
  const host = String(hostname || '')
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
  return host === 'localhost' || host === '::1' || host === '0.0.0.0' || host.startsWith('127.');
}

/** Hostname of an origin such as "http://192.168.0.5:5001", or null when it is not a valid URL. */
export function hostnameOfOrigin(origin) {
  try {
    return new URL(origin).hostname;
  } catch {
    return null; // not a URL: the caller treats it as unusable
  }
}
