#!/usr/bin/env node
/**
 * 生成「精简安装包」：只保留云端安装、构建和运行需要的文件。
 *
 * 用法：
 *   node scripts/pack-slim.mjs
 *   node scripts/pack-slim.mjs --no-lock      # 离线调试：不重新生成 package-lock.json
 *   node scripts/pack-slim.mjs --no-archives  # 只生成 dist/slim/shadowdream，不压缩
 *
 * 产物：
 *   dist/shadowdream-slim.tar.gz
 *   dist/shadowdream-slim.zip
 *
 * 默认排除：docs/、docs-site/（文档站 / 知识库）、截图、测试、.github/、
 * .vs/、rollback/、本地启动脚本和 CI 配置。根 package.json 也会去掉
 * 文档站依赖（vitepress），避免安装时下载整套文档工具链。
 */
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist');
const stagingParent = path.join(outDir, 'slim');
const staging = path.join(stagingParent, 'shadowdream');
const tarFile = path.join(outDir, 'shadowdream-slim.tar.gz');
const zipFile = path.join(outDir, 'shadowdream-slim.zip');
const flags = new Set(process.argv.slice(2));
const skipLock = flags.has('--no-lock');
const skipArchives = flags.has('--no-archives');

const files = [
  'package.json',
  'package-lock.json',
  '.npmrc',
  '.nvmrc',
  'tsconfig.json',
  'tsconfig.base.json',
  'LICENSE',
  'NOTICE.md',
  'install.sh',
  'install.ps1',
  'install.bat',
  'start-shadowdream.sh',
  'start-shadowdream.bat',
  'config/shadowdream.example.json',
  'scripts/install.mjs',
  'scripts/install-plugin.ps1',
  'scripts/package-plugin.ps1',
  'scripts/start-qq-headless.sh',
  'scripts/shadowdream-qq.service',
  'scripts/update-shadowdream.sh',
  'packages/core/package.json',
  'packages/core/tsconfig.json',
  'packages/core/tsconfig.cjs.json',
  'packages/mock/package.json',
  'packages/mock/tsconfig.json',
  'packages/qqnt/package.json',
  'packages/qqnt/tsconfig.json',
  'packages/qqnt/manifest.json',
  'packages/qqnt/login-page.html',
  'packages/qqnt/scripts/build.mjs',
];

const trees = ['packages/core/src', 'packages/mock/src', 'packages/qqnt/src'];

function fail(message) {
  console.error(`\n打包失败：${message}`);
  process.exit(1);
}

function copyFile(relative) {
  const source = path.join(root, relative);
  if (!existsSync(source)) fail(`缺少文件：${relative}`);
  const target = path.join(staging, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(source, target);
}

function copyTree(relative) {
  const source = path.join(root, relative);
  if (!existsSync(source)) fail(`缺少目录：${relative}`);
  cpSync(source, path.join(staging, relative), { recursive: true });
}

function run(command, args, cwd) {
  const options = { cwd, stdio: 'inherit', env: process.env };
  let result;
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(command)) {
    // Node 24 不再允许 shell:false 直接启动 .cmd/.bat，显式交给 cmd.exe。
    result = spawnSync(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', [command, ...args].join(' ')],
      options,
    );
  } else {
    result = spawnSync(command, args, options);
  }
  return !result.error && result.status === 0;
}

function capture(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    shell: false,
  });
  return result.status === 0 ? result.stdout.trim() : '';
}

function hasCommand(command) {
  const probe = process.platform === 'win32' ? 'where.exe' : 'sh';
  const args = process.platform === 'win32' ? [command] : ['-c', `command -v ${command}`];
  const result = spawnSync(probe, args, { stdio: 'ignore', shell: false });
  return !result.error && result.status === 0;
}

function psQuote(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function trimPackageJson() {
  const file = path.join(staging, 'package.json');
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  if (pkg.devDependencies) delete pkg.devDependencies.vitepress;
  for (const script of [
    'docs:dev',
    'docs:build',
    'docs:preview',
    'pretest',
    'test',
    'test:core',
    'clean',
  ]) {
    if (pkg.scripts) delete pkg.scripts[script];
  }
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

  // 精简包不带 tests/，同时去掉对应的 test 脚本，避免留下必然失败的命令。
  for (const relative of [
    'packages/core/package.json',
    'packages/mock/package.json',
    'packages/qqnt/package.json',
  ]) {
    const target = path.join(staging, relative);
    const item = JSON.parse(readFileSync(target, 'utf8'));
    if (item.scripts) {
      delete item.scripts.test;
      delete item.scripts.pretest;
    }
    writeFileSync(target, `${JSON.stringify(item, null, 2)}\n`, 'utf8');
  }
}

function detectRegistry() {
  const lockFile = path.join(staging, 'package-lock.json');
  if (!existsSync(lockFile)) return '';
  try {
    const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
    for (const item of Object.values(lock.packages || {})) {
      if (!item || !item.resolved) continue;
      const url = new URL(item.resolved);
      return `${url.protocol}//${url.host}/`;
    }
  } catch {
    // 锁文件损坏时交给 npm 使用默认 registry。
  }
  return '';
}

function regenerateLock() {
  if (skipLock) {
    console.warn('跳过 package-lock.json 重新生成（--no-lock）。');
    return;
  }
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = [
    'install',
    '--package-lock-only',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
  ];
  // 沿用原锁文件的 registry（仓库当前使用 npmmirror），避免 CI 生成的包
  // 在另一套 registry 上解析，导致国内用户安装变慢。
  const registry = detectRegistry();
  if (registry) args.push('--registry', registry);
  console.log('生成精简依赖锁（不安装 node_modules）...');
  const ok = run(npm, args, staging);
  if (!ok) {
    console.warn('package-lock.json 重新生成失败，已移除，安装时会用 npm install 重新解析。');
    rmSync(path.join(staging, 'package-lock.json'), { force: true });
    return;
  }
  const lock = readFileSync(path.join(staging, 'package-lock.json'), 'utf8');
  if (lock.includes('vitepress')) {
    console.warn('警告：精简锁文件里仍然出现 vitepress，请检查 package.json。');
  }
}

function walk(dir) {
  let count = 0;
  let bytes = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      const stat = statSync(full);
      if (stat.isDirectory()) stack.push(full);
      else {
        count += 1;
        bytes += stat.size;
      }
    }
  }
  return { count, bytes };
}

function writeBundleInfo() {
  const commit = capture('git', ['rev-parse', 'HEAD']) || 'unknown';
  const dirty = capture('git', ['status', '--porcelain']).length > 0;
  const pkg = JSON.parse(readFileSync(path.join(staging, 'package.json'), 'utf8'));
  const info = {
    name: pkg.name,
    version: pkg.version,
    kind: 'slim',
    commit,
    dirty,
    builtAt: new Date().toISOString(),
  };
  writeFileSync(
    path.join(staging, 'install-bundle.json'),
    `${JSON.stringify(info, null, 2)}\n`,
    'utf8',
  );
}

function makeArchives() {
  rmSync(tarFile, { force: true });
  console.log('生成 TAR.GZ...');
  if (!run('tar', ['-czf', tarFile, '-C', stagingParent, 'shadowdream'], root)) {
    fail('tar 打包失败。Windows 需要 Windows 10 1803+ 自带的 tar。');
  }

  rmSync(zipFile, { force: true });
  console.log('生成 ZIP...');
  let zipOk = false;
  if (process.platform === 'win32') {
    const command = [
      "$ErrorActionPreference = 'Stop'",
      "$ProgressPreference = 'SilentlyContinue'",
      `Set-Location -LiteralPath ${psQuote(stagingParent)}`,
      `Compress-Archive -Path 'shadowdream' -DestinationPath ${psQuote(zipFile)} -Force`,
    ].join('; ');
    zipOk = run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], root);
  } else if (hasCommand('zip')) {
    zipOk = run('zip', ['-qr', zipFile, 'shadowdream'], stagingParent);
  }
  if (!zipOk) {
    for (const python of process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python']) {
      if (!hasCommand(python)) continue;
      zipOk = run(python, ['-m', 'zipfile', '-c', zipFile, 'shadowdream'], stagingParent);
      if (zipOk) break;
    }
  }
  if (!zipOk) fail('ZIP 打包失败：需要 zip 或 python（Linux），或 PowerShell（Windows）。');
}

rmSync(stagingParent, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

try {
  console.log('复制精简文件...');
  for (const relative of files) copyFile(relative);
  for (const relative of trees) copyTree(relative);

  // Linux 上生成的 tar/zip 保留可执行位；Windows 上会被忽略，用户可自行 chmod。
  for (const relative of ['install.sh', 'start-shadowdream.sh', 'scripts/start-qq-headless.sh', 'scripts/update-shadowdream.sh']) {
    try {
      chmodSync(path.join(staging, relative), 0o755);
    } catch {
      // Windows 不支持 Unix 可执行位。
    }
  }

  trimPackageJson();
  regenerateLock();
  // --package-lock-only 理论上不会生成 node_modules，保险起见清理一次。
  rmSync(path.join(staging, 'node_modules'), { recursive: true, force: true });
  writeBundleInfo();

  const { count, bytes } = walk(staging);
  console.log(
    `精简源码：${count} 个文件，${(bytes / 1024).toFixed(0)} KB（已排除 docs/、docs-site/、tests/、.github/ 等）。`,
  );

  if (!skipArchives) makeArchives();

  // 更新检查用的小清单：跟安装包同一次构建，commit 一致。
  const manifestFile = path.join(outDir, 'install-bundle.json');
  cpSync(path.join(staging, 'install-bundle.json'), manifestFile);

  if (!skipArchives) {
    console.log('\n完成：');
    for (const file of [tarFile, zipFile, manifestFile]) {
      console.log(`  ${path.relative(root, file)}  ${(statSync(file).size / 1024).toFixed(0)} KB`);
    }
  } else {
    console.log(`\n完成（未压缩）：${path.relative(root, staging)}`);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
