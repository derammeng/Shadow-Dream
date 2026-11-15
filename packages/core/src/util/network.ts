import os from 'node:os';

/** 监听通配地址时，用来判断哪些地址可以在浏览器里打开。 */
const WILDCARD_HOSTS = new Set(['', '0.0.0.0', '::', '[::]', '*']);

/** 这些通常是虚拟网卡，优先级排在真实网卡后面。 */
const VIRTUAL_INTERFACE = /(vEthernet|WSL|Docker|VMware|VirtualBox|Hyper-?V|Loopback|Tailscale|ZeroTier|WireGuard|OpenVPN|TAP|TUN|utun|bridge|virbr|vboxnet|Npcap|Hamachi|Radmin|VPN|podman|cni|flannel|cali)/i;

const PREFERRED_INTERFACE = /(^|[\s_-])(en|eth|wlan|wi-?fi|ethernet|以太网|无线|本地连接)/i;

export interface HostCandidate {
  name: string;
  address: string;
  score: number;
}

export function isWildcardHost(host: string): boolean {
  return WILDCARD_HOSTS.has(host.trim().toLowerCase());
}

export function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4) return false;
  if (parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
}

function scoreCandidate(name: string, address: string): number {
  let score = 0;
  if (isPrivateIPv4(address)) score += 100;
  if (address.startsWith('192.168.')) score += 30;
  else if (address.startsWith('10.')) score += 20;
  else if (address.startsWith('172.')) score += 10;
  if (VIRTUAL_INTERFACE.test(name)) score -= 200;
  if (PREFERRED_INTERFACE.test(name)) score += 40;
  return score;
}

/**
 * 列出可展示的外部 IPv4 地址，优先真实网卡 + 私有网段。
 * 通过参数注入网络接口，方便测试。
 */
export function listHostCandidates(
  interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces(),
): HostCandidate[] {
  const candidates: HostCandidate[] = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      candidates.push({
        name,
        address: entry.address,
        score: scoreCandidate(name, entry.address),
      });
    }
  }
  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter(item => {
      if (seen.has(item.address)) return false;
      seen.add(item.address);
      return true;
    });
}

/**
 * 监听地址转成可访问地址。
 *
 * `0.0.0.0` / `::` 本身不是浏览器能访问的主机名，优先换成当前机器
 * 真实的局域网 IPv4；找不到时退回 `127.0.0.1`。
 */
export function displayHost(
  host: string,
  interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces(),
): string {
  if (!isWildcardHost(host)) return host;
  const candidates = listHostCandidates(interfaces);
  const best = candidates.find(item => item.score >= 0) ?? candidates[0];
  return best?.address ?? '127.0.0.1';
}

/** IPv6 字面量放进 URL 时需要方括号。 */
export function formatUrlHost(host: string): string {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

/** 拼出 http://host:port，通配监听时使用实际局域网地址。 */
export function httpUrl(
  host: string,
  port: number,
  interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces(),
): string {
  return `http://${formatUrlHost(displayHost(host, interfaces))}:${port}`;
}

/** 拼出 ws://host:port/path，通配监听时使用实际局域网地址。 */
export function wsUrl(
  host: string,
  port: number,
  suffix = '',
  interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces(),
): string {
  return `ws://${formatUrlHost(displayHost(host, interfaces))}:${port}${suffix}`;
}
