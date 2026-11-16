import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pluginRoot, '..', '..');
const releaseRoot = path.join(pluginRoot, 'release', 'shadowdream');
const coreDist = path.join(repoRoot, 'packages', 'core', 'dist-cjs');
const pluginDist = path.join(pluginRoot, 'dist');
const wsSource = path.join(repoRoot, 'node_modules', 'ws');

function assertExists(target, hint) {
  if (!fs.existsSync(target)) {
    throw new Error(`缺少 ${target}\n${hint}`);
  }
}

assertExists(path.join(pluginDist, 'main.js'), '请先执行 tsc -p packages/qqnt/tsconfig.json');
assertExists(path.join(coreDist, 'index.js'), '请先执行 npm run build:core:cjs');

fs.rmSync(releaseRoot, { recursive: true, force: true });
fs.mkdirSync(releaseRoot, { recursive: true });

// 1. 插件自己的 JS（保持相对 import 可用）。
for (const entry of fs.readdirSync(pluginDist)) {
  if (!entry.endsWith('.js')) continue;
  fs.copyFileSync(path.join(pluginDist, entry), path.join(releaseRoot, entry));
}
fs.copyFileSync(path.join(pluginRoot, 'manifest.json'), path.join(releaseRoot, 'manifest.json'));
fs.copyFileSync(path.join(pluginRoot, 'login-page.html'), path.join(releaseRoot, 'login-page.html'));

// 2. CJS 版 core，作为插件的私有依赖。
const coreTarget = path.join(releaseRoot, 'node_modules', '@shadowdream', 'core');
fs.mkdirSync(coreTarget, { recursive: true });
fs.cpSync(coreDist, coreTarget, {
  recursive: true,
  filter: source => !source.endsWith('.map'),
});
// 版本号从 core 的 package.json 读取，避免打包时写死版本导致漂移。
const coreVersion = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'packages', 'core', 'package.json'), 'utf8'),
).version;
fs.writeFileSync(
  path.join(coreTarget, 'package.json'),
  `${JSON.stringify({
    name: '@shadowdream/core',
    version: coreVersion,
    private: true,
    type: 'commonjs',
    main: 'index.js',
  }, null, 2)}\n`,
  'utf8',
);

// 3. 运行时依赖：ws 负责反向 WS，silk-wasm / mpg123-decoder 负责语音转码。
//    插件跟着 QQ 主进程跑，不经过 npm 安装，所以必须把依赖整个打进去。
const runtimeDependencies = [
  'ws',
  'silk-wasm',
  'mpg123-decoder',
  '@wasm-audio-decoders/common',
  '@eshaz/web-worker',
  'simple-yenc',
];
for (const name of runtimeDependencies) {
  const source = path.join(repoRoot, 'node_modules', ...name.split('/'));
  assertExists(source, `缺少运行时依赖 ${name}，请先在仓库根目录执行 npm install`);
  const target = path.join(releaseRoot, 'node_modules', ...name.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

console.log(`插件已打包到：${releaseRoot}`);
console.log('把 release/shadowdream 整个目录放到 LiteLoaderQQNT 的 plugins 目录即可。');
