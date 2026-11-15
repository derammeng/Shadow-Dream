#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { accessSync, constants, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const npm = isWindows ? 'npm.cmd' : 'npm';

function usage() {
  console.log(`Shadow Dream 安装脚本

用法：
  ./install.sh [选项]
  .\\install.ps1 [选项]

选项：
  --plugins-dir <目录>  LiteLoaderQQNT 的 plugins 目录；安装后直接部署插件
  --token <token>       指定 WebUI token；默认随机生成 20 位
  --no-token            不生成 WebUI token（仅本机调试）
  --config <文件>       配置文件路径，默认 config/shadowdream.json
  --skip-install        跳过 npm install
  --skip-build          跳过构建
  --test                构建后运行测试
  --no-zip              不生成插件 zip
  --dry-run             只打印将要执行的操作
  --install-qq          自动下载并安装 Linux QQ（仅 Linux）
  --install-litelloader 自动下载 LiteLoaderQQNT 并注入 QQ（仅 Linux）
  --install-xvfb        自动安装 Xvfb 和 QQ 运行库（仅 Linux）
  --qq-url <url>        指定 QQ 安装包地址（deb / rpm）
  --liteloader-url <url> 指定 LiteLoaderQQNT 源码包地址
  --qq-dir <目录>       QQ 安装目录，默认 /opt/QQ
  --liteloader-dir <目录> LiteLoaderQQNT 目录，默认 ~/.local/share/LiteLoaderQQNT
  -h, --help            显示帮助

说明：
  - 需要 Node.js 22+
  - 默认会安装依赖、构建 core/mock/qqnt 插件，并生成
    packages/qqnt/release/shadowdream 和 shadowdream.zip
  - --plugins-dir 会先备份旧的 shadowdream，再复制新插件
  - 如果 plugins-dir 的上一级有 data 目录，还会初始化
    <profile>/data/shadowdream/config.json
  - 默认不会自动安装 QQ、LiteLoaderQQNT、Xvfb；
    --install-qq / --install-litelloader / --install-xvfb 需要显式传入
`);
}

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('-')) throw new Error(`${name} 缺少参数`);
  return value;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function run(command, args, options = {}) {
  if (options.dryRun) {
    console.log(`[dry-run] ${command} ${args.join(' ')}`);
    return;
  }
  console.log(`\n> ${command} ${args.join(' ')}`);
  const spawnOptions = {
    cwd: options.cwd ?? root,
    stdio: 'inherit',
    env: process.env,
  };
  let result;
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(command)) {
    // Node 24 不再允许 shell:false 直接启动 npm.cmd，显式交给 cmd.exe。
    result = spawnSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', [command, ...args].join(' ')],
      spawnOptions,
    );
  } else {
    result = spawnSync(command, args, spawnOptions);
  }
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} 退出码 ${result.status}`);
  }
}

function randomToken() {
  return randomBytes(15).toString('base64url');
}

function writeJson(file, value) {
  mkdirSyncPath(file);
  return writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function mkdirSyncPath(file) {
  const dir = path.dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}

function profileConfigPath(pluginsDir) {
  const parent = path.dirname(pluginsDir);
  if (path.basename(pluginsDir) !== 'plugins') return null;
  return path.join(parent, 'data', 'shadowdream', 'config.json');
}

async function backupAndCopy(source, target, dryRun) {
  if (existsSync(target)) {
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    // 不能备份在 plugins 目录里：LiteLoader 会把带 manifest.json 的备份
    // 也当成插件扫描，造成同一个插件被加载两次。
    const profileRoot = path.dirname(path.dirname(target));
    const backupRoot = path.join(profileRoot, 'shadowdream-backups');
    const backup = path.join(backupRoot, `shadowdream.${stamp}`);
    console.log(`已存在旧插件，备份到 ${backup}`);
    if (!dryRun) {
      await mkdir(backupRoot, { recursive: true });
      await rename(target, backup);
    }
  }
  console.log(`安装插件：${target}`);
  if (!dryRun) {
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, { recursive: true, force: true });
  }
}

function expandHome(value) {
  if (!value) return value;
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value;
}

function hasAnyFlag(names) {
  return names.some((name) => hasFlag(name));
}

function commandExists(command) {
  const result = spawnSync(
    'sh',
    ['-c', 'command -v "$1" >/dev/null 2>&1', 'sh', command],
    { stdio: 'ignore' },
  );
  return result.status === 0;
}

function runPrivileged(command, args, options = {}) {
  if (isLinux && typeof process.getuid === 'function' && process.getuid() !== 0) {
    if (!options.dryRun && !commandExists('sudo')) {
      throw new Error('自动安装系统组件需要 root 或 sudo；请用 root 运行，或手动安装');
    }
    return run('sudo', [command, ...args], options);
  }
  return run(command, args, options);
}

async function installXvfb(dryRun) {
  if (!isLinux) throw new Error('--install-xvfb 只支持 Linux');
  if (commandExists('Xvfb')) {
    console.log('Xvfb 已安装，跳过');
    return;
  }
  if (commandExists('apt-get')) {
    runPrivileged('apt-get', ['update'], { dryRun });
    runPrivileged(
      'apt-get',
      ['install', '-y', 'xvfb', 'libnss3', 'libnspr4', 'libgbm1'],
      { dryRun },
    );
    try {
      runPrivileged('apt-get', ['install', '-y', 'libasound2t64'], { dryRun });
    } catch {
      try {
        runPrivileged('apt-get', ['install', '-y', 'libasound2'], { dryRun });
      } catch {
        console.warn('libasound2 安装失败，QQ 可能缺少音频库（无头运行通常不影响登录）');
      }
    }
    return;
  }
  if (commandExists('dnf')) {
    runPrivileged('dnf', ['install', '-y', 'xorg-x11-server-Xvfb', 'nss', 'nspr'], { dryRun });
    return;
  }
  throw new Error('未找到 apt-get / dnf，无法自动安装 Xvfb');
}

async function discoverQqUrl() {
  if (process.arch !== 'x64') {
    throw new Error(`自动安装 QQ 目前只支持 x64，当前架构是 ${process.arch}；请用 --qq-url 指定对应安装包`);
  }
  const configured = process.env.SHADOWDREAM_QQ_URL?.trim();
  if (configured) return configured;
  const response = await fetch('https://im.qq.com/rainbow/linuxQQDownload', {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`读取 QQ 官方下载页失败：HTTP ${response.status}`);
  const text = await response.text();
  const match = text.match(/"deb"\s*:\s*"(https:[^"]+amd64[^"]+\.deb)"/);
  if (!match) throw new Error('没有从 QQ 官方下载页解析到 amd64 deb，请用 --qq-url 指定');
  return match[1];
}

async function downloadFile(url, target, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] 下载 ${url}`);
    return;
  }
  if (commandExists('curl')) {
    try {
      run('curl', ['-fL', '--retry', '3', '--retry-delay', '2', '--connect-timeout', '20', '-o', target, url]);
      return;
    } catch (error) {
      console.warn(`curl 下载失败（${error.message}），改用 Node fetch`);
    }
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(300000) });
  if (!response.ok) throw new Error(`下载失败：HTTP ${response.status} ${url}`);
  if (response.body) {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(target));
  } else {
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
  }
}

function findQqRoot(preferred) {
  const candidates = [
    preferred,
    process.env.SHADOWDREAM_QQ_DIR,
    path.join(os.homedir(), 'qqnt', 'reinstall', 'squashfs-root'),
    path.join(os.homedir(), 'qqnt', 'squashfs-root'),
    '/opt/QQ',
    '/opt/linuxqq',
    '/usr/share/QQ',
    '/usr/lib/QQ',
  ].filter(Boolean);
  for (const candidate of candidates) {
    const dir = path.resolve(expandHome(candidate));
    if (existsSync(path.join(dir, 'qq'))) return dir;
  }
  return null;
}

async function installQq({ dryRun, qqDir, qqUrl }) {
  if (!isLinux) throw new Error('--install-qq 只支持 Linux');
  const existing = findQqRoot(qqDir);
  if (existing) {
    console.log(`QQ 已安装：${existing}，跳过`);
    return existing;
  }

  const url = qqUrl || (await discoverQqUrl());
  console.log(`QQ 安装包：${url}`);
  if (dryRun) {
    console.log(`[dry-run] 安装 QQ 到 ${qqDir || '/opt/QQ'}`);
    return qqDir || '/opt/QQ';
  }

  const tmp = await mkdtemp(path.join(os.tmpdir(), 'shadowdream-qq-'));
  const archive = path.join(tmp, path.basename(new URL(url).pathname) || 'linuxqq.deb');
  try {
    try {
      await downloadFile(url, archive, false);
    } catch (error) {
      throw new Error(`QQ 安装包下载失败（${error.message}）；请用 --qq-url 指定可用地址`);
    }
    const lower = archive.toLowerCase();
    if (lower.endsWith('.deb')) {
      if (!commandExists('apt-get') && !commandExists('dpkg')) {
        throw new Error('当前系统没有 apt/dpkg，请用 --qq-url 指定对应系统的安装包');
      }
      try {
        runPrivileged('apt-get', ['install', '-y', archive]);
      } catch {
        runPrivileged('dpkg', ['-i', archive]);
        runPrivileged('apt-get', ['-f', 'install', '-y']);
      }
    } else if (lower.endsWith('.rpm')) {
      if (commandExists('dnf')) {
        runPrivileged('dnf', ['install', '-y', archive]);
      } else if (commandExists('rpm')) {
        runPrivileged('rpm', ['-Uvh', archive]);
      } else {
        throw new Error('当前系统没有 dnf/rpm，请用 --qq-url 指定 deb 或 AppImage');
      }
    } else {
      throw new Error(`不支持的 QQ 安装包格式：${archive}（请用 deb / rpm）`);
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }

  const installed = findQqRoot(qqDir);
  if (!installed) {
    throw new Error('QQ 安装完成，但找不到 qq 二进制；请检查安装目录或用 --qq-dir 指定');
  }
  console.log(`QQ 已安装：${installed}`);
  return installed;
}

function canWriteDir(dir) {
  try {
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function putFile(source, target, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] 写入 ${target}`);
    return;
  }
  if (canWriteDir(path.dirname(target))) {
    await cp(source, target, { force: true });
  } else {
    runPrivileged('cp', [source, target]);
  }
}

async function installLiteLoader({ dryRun, qqRoot, liteDir, liteUrl }) {
  if (!isLinux) throw new Error('--install-litelloader 只支持 Linux');
  const target = path.resolve(
    expandHome(liteDir || process.env.SHADOWDREAM_LITELOADER_DIR || path.join(os.homedir(), '.local', 'share', 'LiteLoaderQQNT')),
  );
  const qq = qqRoot || findQqRoot(process.env.SHADOWDREAM_QQ_DIR);
  if (!qq) {
    throw new Error('没有找到 QQ，无法注入 LiteLoaderQQNT；请同时加 --install-qq 或先安装 QQ');
  }
  if (dryRun) {
    console.log(`[dry-run] 下载 LiteLoaderQQNT 到 ${target}`);
    console.log(`[dry-run] 注入 LiteLoaderQQNT 到 ${qq}/resources/app`);
    return {
      dir: target,
      pluginsDir: path.join(target, 'plugins'),
      qqRoot: qq,
    };
  }
  const appDir = path.join(qq, 'resources', 'app');
  if (!existsSync(path.join(appDir, 'package.json'))) {
    throw new Error(`找不到 QQ 资源目录：${appDir}`);
  }

  const url = liteUrl || process.env.SHADOWDREAM_LITELOADER_URL ||
    'https://github.com/LiteLoaderQQNT/LiteLoaderQQNT/archive/refs/heads/main.tar.gz';
  if (!existsSync(path.join(target, 'package.json'))) {
    console.log(`LiteLoaderQQNT：${url}`);
    if (dryRun) {
      console.log(`[dry-run] 下载并安装 LiteLoaderQQNT 到 ${target}`);
    } else {
      const tmp = await mkdtemp(path.join(os.tmpdir(), 'shadowdream-liteloader-'));
      const archive = path.join(tmp, 'liteloader.tar.gz');
      try {
        await downloadFile(url, archive, false);
        run('tar', ['-xzf', archive, '-C', tmp]);
        let source = null;
        for (const entry of await readdir(tmp, { withFileTypes: true })) {
          if (entry.isDirectory() && existsSync(path.join(tmp, entry.name, 'package.json'))) {
            source = path.join(tmp, entry.name);
            break;
          }
        }
        if (!source) throw new Error('LiteLoaderQQNT 压缩包结构异常');
        await mkdir(target, { recursive: true });
        await cp(source, target, { recursive: true, force: true });
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    }
  } else {
    console.log(`LiteLoaderQQNT 已存在：${target}`);
  }

  const packageFile = path.join(appDir, 'package.json');
  const backupFile = `${packageFile}.shadowdream-backup`;
  const loaderFile = path.join(appDir, 'app_launcher', 'LiteLoader.js');

  const packageJson = JSON.parse(await readFile(packageFile, 'utf8'));
  const loaderSource = `require(String.raw\`${target.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\`);\n`;
  const temp = await mkdtemp(path.join(os.tmpdir(), 'shadowdream-patch-'));
  try {
    const tempLoader = path.join(temp, 'LiteLoader.js');
    const tempPackage = path.join(temp, 'package.json');
    await writeFile(tempLoader, loaderSource, 'utf8');
    packageJson.main = './app_launcher/LiteLoader.js';
    await writeFile(tempPackage, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

    if (!existsSync(backupFile)) {
      await putFile(packageFile, backupFile, false);
      console.log(`已备份 QQ package.json：${backupFile}`);
    }
    if (!existsSync(path.dirname(loaderFile))) {
      if (canWriteDir(appDir)) {
        await mkdir(path.dirname(loaderFile), { recursive: true });
      } else {
        runPrivileged('mkdir', ['-p', path.dirname(loaderFile)]);
      }
    }
    await putFile(tempLoader, loaderFile, false);
    await putFile(tempPackage, packageFile, false);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }

  const pluginsDir = path.join(target, 'plugins');
  await mkdir(pluginsDir, { recursive: true });
  await mkdir(path.join(target, 'data'), { recursive: true });
  console.log(`LiteLoaderQQNT 已注入：${target}`);
  return { dir: target, pluginsDir, qqRoot: qq };
}


async function main() {
  if (hasFlag('-h') || hasFlag('--help')) {
    usage();
    return;
  }

  const dryRun = hasFlag('--dry-run');
  const skipInstall = hasFlag('--skip-install');
  const skipBuild = hasFlag('--skip-build');
  const noToken = hasFlag('--no-token');
  const noZip = hasFlag('--no-zip');
  const runTests = hasFlag('--test');
  const pluginsDirArg = argValue('--plugins-dir');
  const configArg = argValue('--config');
  const tokenArg = argValue('--token');
  const qqDirArg = argValue('--qq-dir');
  const qqUrlArg = argValue('--qq-url') || process.env.SHADOWDREAM_QQ_URL || '';
  const liteDirArg = argValue('--liteloader-dir');
  const liteUrlArg = argValue('--liteloader-url') || process.env.SHADOWDREAM_LITELOADER_URL || '';
  const installQqFlag = hasAnyFlag(['--install-qq', '--with-qq']);
  const installLiteLoaderFlag = hasAnyFlag(['--install-litelloader', '--install-liteloader', '--with-litelloader']);
  const installXvfbFlag = hasAnyFlag(['--install-xvfb', '--with-xvfb']);
  if (isWindows && (installQqFlag || installLiteLoaderFlag || installXvfbFlag)) {
    throw new Error('--install-qq / --install-litelloader / --install-xvfb 只支持 Linux');
  }
  const generatedToken = noToken ? '' : (tokenArg || randomToken());
  let effectiveToken = generatedToken;
  const configFile = path.resolve(root, configArg || path.join('config', 'shadowdream.json'));
  const exampleFile = path.join(root, 'config', 'shadowdream.example.json');
  const releaseDir = path.join(root, 'packages', 'qqnt', 'release', 'shadowdream');
  const zipFile = path.join(root, 'packages', 'qqnt', 'release', 'shadowdream.zip');

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < 22) {
    throw new Error(`需要 Node.js 22+，当前是 ${process.version}`);
  }
  if (!existsSync(path.join(root, 'package.json'))) {
    throw new Error(`找不到 package.json：${root}`);
  }

  console.log('Shadow Dream 安装');
  console.log(`项目目录：${root}`);
  console.log(`Node.js：${process.version}`);

  if (!skipInstall) {
    if (existsSync(path.join(root, 'package-lock.json'))) {
      try {
        run(npm, ['ci', '--no-audit', '--no-fund'], { dryRun });
      } catch (error) {
        console.warn(`npm ci 失败（${error.message}），改用 npm install`);
        run(npm, ['install', '--no-audit', '--no-fund'], { dryRun });
      }
    } else {
      run(npm, ['install', '--no-audit', '--no-fund'], { dryRun });
    }
  } else {
    console.log('跳过依赖安装');
  }

  if (!skipBuild) {
    run(npm, ['run', 'build'], { dryRun });
    if (runTests) run(npm, ['test'], { dryRun });
  } else {
    console.log('跳过构建');
  }

  if (!existsSync(releaseDir) && !dryRun) {
    throw new Error(`构建产物不存在：${releaseDir}`);
  }

  // 可选系统组件：默认全部关闭，只有显式传参数才执行。
  let qqRoot = null;
  let liteLoader = null;
  if (installXvfbFlag) {
    console.log('\n安装 Xvfb / QQ 运行库...');
    await installXvfb(dryRun);
  }
  if (installQqFlag) {
    console.log('\n安装 Linux QQ...');
    qqRoot = await installQq({
      dryRun,
      qqDir: qqDirArg || process.env.SHADOWDREAM_QQ_DIR,
      qqUrl: qqUrlArg,
    });
  }
  if (installLiteLoaderFlag) {
    console.log('\n安装 LiteLoaderQQNT...');
    if (!qqRoot) qqRoot = findQqRoot(qqDirArg || process.env.SHADOWDREAM_QQ_DIR);
    liteLoader = await installLiteLoader({
      dryRun,
      qqRoot,
      liteDir: liteDirArg,
      liteUrl: liteUrlArg,
    });
  }

  const pluginsDir = pluginsDirArg
    ? path.resolve(process.cwd(), pluginsDirArg)
    : liteLoader?.pluginsDir || '';

  // 1. 项目自身配置（mock / 独立运行）。
  const existingConfig = await readJsonIfExists(configFile);
  if (existingConfig) {
    console.log(`保留现有配置：${configFile}`);
    if (tokenArg) {
      existingConfig.http = existingConfig.http || {};
      existingConfig.http.webuiToken = tokenArg;
      if (!dryRun) {
        await writeFile(configFile, `${JSON.stringify(existingConfig, null, 2)}\n`, 'utf8');
        try { await chmod(configFile, 0o600); } catch {}
      }
      console.log(`已更新现有配置的 WebUI token`);
    } else if (existingConfig.http?.webuiToken) {
      effectiveToken = String(existingConfig.http.webuiToken);
      console.log('现有配置已包含 WebUI token，未改动');
    }
  } else {
    const example = await readJsonIfExists(exampleFile);
    if (!example) throw new Error(`缺少示例配置：${exampleFile}`);
    if (!noToken) {
      example.http = example.http || {};
      example.http.webuiToken = generatedToken;
      console.log(`已生成 WebUI token：${generatedToken}`);
    } else {
      example.http = example.http || {};
      example.http.webuiToken = '';
    }
    if (!dryRun) {
      await writeJson(configFile, example);
      try { await chmod(configFile, 0o600); } catch {}
    }
    console.log(dryRun ? `将写入配置：${configFile}` : `已写入配置：${configFile}`);
  }

  // 2. 部署 LiteLoader 插件。
  if (pluginsDir) {
    if (!existsSync(pluginsDir) && !dryRun) throw new Error(`插件目录不存在：${pluginsDir}`);
    if (!existsSync(pluginsDir)) {
      console.log(`[dry-run] 将创建插件目录：${pluginsDir}`);
    }
    const target = path.join(pluginsDir, 'shadowdream');
    await backupAndCopy(releaseDir, target, dryRun);

    const pluginConfigFile = profileConfigPath(pluginsDir);
    if (pluginConfigFile) {
      const existingPluginConfig = await readJsonIfExists(pluginConfigFile);
      if (existingPluginConfig) {
        console.log(`保留插件现有配置：${pluginConfigFile}`);
        if (tokenArg) {
          existingPluginConfig.http = existingPluginConfig.http || {};
          existingPluginConfig.http.webuiToken = tokenArg;
          if (!dryRun) {
            await writeFile(pluginConfigFile, `${JSON.stringify(existingPluginConfig, null, 2)}\n`, 'utf8');
            try { await chmod(pluginConfigFile, 0o600); } catch {}
          }
          console.log('已更新插件配置的 WebUI token');
        }
      } else {
        const example = await readJsonIfExists(exampleFile);
        if (!example) throw new Error(`缺少示例配置：${exampleFile}`);
        example.backend = { type: 'qqnt' };
        if (!noToken) {
          example.http = example.http || {};
          example.http.webuiToken = effectiveToken;
          console.log(`插件 WebUI token：${example.http.webuiToken}`);
        }
        if (!dryRun) {
          await writeJson(pluginConfigFile, example);
          try { await chmod(pluginConfigFile, 0o600); } catch {}
        }
        console.log(dryRun ? `将写入插件配置：${pluginConfigFile}` : `已写入插件配置：${pluginConfigFile}`);
      }
    }
  }

  // 3. 打包插件 zip。
  if (!noZip && existsSync(releaseDir)) {
    if (isWindows) {
      const script = path.join(root, 'scripts', 'package-plugin.ps1');
      if (existsSync(script)) {
        run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], { dryRun });
      }
    } else {
      if (!dryRun) await rm(zipFile, { force: true });
      const result = spawnSync('zip', ['-qr', zipFile, '.'], {
        cwd: releaseDir,
        stdio: 'ignore',
      });
      if (result.error || result.status !== 0) {
        console.warn('未找到 zip 命令，跳过 zip 打包');
      } else {
        console.log(`已生成：${zipFile}`);
      }
    }
  }

  console.log('\n安装完成');
  console.log(`插件目录：${releaseDir}`);
  if (!noZip && existsSync(zipFile)) {
    console.log(`插件压缩包：${zipFile}`);
  }
  console.log(`项目配置：${configFile}`);
  console.log('WebUI：http://127.0.0.1:3000/webui/');
  console.log('如果设置了 webuiToken，首次打开需要输入 token。');
}

main().catch((error) => {
  console.error(`\n安装失败：${error.message}`);
  process.exitCode = 1;
});
