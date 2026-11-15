import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import {
  displayHost,
  formatUrlHost,
  httpUrl,
  isPrivateIPv4,
  isWildcardHost,
  listHostCandidates,
  wsUrl,
} from '../src/util/network.js';

function ipv4(address: string, internal = false): os.NetworkInterfaceInfo {
  return {
    address,
    family: 'IPv4',
    internal,
    mac: '00:00:00:00:00:00',
    netmask: '255.255.255.0',
    cidr: `${address}/24`,
  };
}

const fakeInterfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = {
  'vEthernet (WSL)': [ipv4('172.24.1.1')],
  '以太网': [ipv4('192.168.1.23')],
  Loopback: [ipv4('127.0.0.1', true)],
};

test('通配监听时优先展示真实局域网 IPv4', () => {
  assert.equal(displayHost('0.0.0.0', fakeInterfaces), '192.168.1.23');
  assert.equal(displayHost('::', fakeInterfaces), '192.168.1.23');
  assert.equal(displayHost('*', fakeInterfaces), '192.168.1.23');
});

test('指定监听地址时原样展示', () => {
  assert.equal(displayHost('192.168.1.50', fakeInterfaces), '192.168.1.50');
  assert.equal(displayHost('localhost', fakeInterfaces), 'localhost');
});

test('没有外部网卡时回退到 127.0.0.1', () => {
  assert.equal(displayHost('0.0.0.0', { Loopback: [ipv4('127.0.0.1', true)] }), '127.0.0.1');
});

test('通配地址和 IPv6 URL 格式化', () => {
  assert.equal(isWildcardHost('0.0.0.0'), true);
  assert.equal(isWildcardHost('::'), true);
  assert.equal(isWildcardHost('127.0.0.1'), false);
  assert.equal(formatUrlHost('127.0.0.1'), '127.0.0.1');
  assert.equal(formatUrlHost('::1'), '[::1]');
  assert.equal(formatUrlHost('[::1]'), '[::1]');
  assert.equal(httpUrl('0.0.0.0', 3000, fakeInterfaces), 'http://192.168.1.23:3000');
  assert.equal(wsUrl('0.0.0.0', 3001, '/onebot', fakeInterfaces), 'ws://192.168.1.23:3001/onebot');
});

test('候选地址优先真实网卡，排除回环和虚拟网卡', () => {
  const candidates = listHostCandidates(fakeInterfaces);
  assert.equal(candidates[0]?.address, '192.168.1.23');
  assert.equal(candidates.some(item => item.address === '127.0.0.1'), false);
  assert.equal(isPrivateIPv4('192.168.1.23'), true);
  assert.equal(isPrivateIPv4('10.0.0.5'), true);
  assert.equal(isPrivateIPv4('172.20.1.1'), true);
  assert.equal(isPrivateIPv4('8.8.8.8'), false);
});
