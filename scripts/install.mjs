#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  chmod,
  cp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
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
  -h, --help            显示帮助

说明：
  - 需要 Node.js 22+
  - 默认会安装依赖、构建 core/mock/qqnt 插件，并生成
    packages/qqnt/release/shadowdream 和 shadowdream.zip
  - --plugins-dir 会先备份旧的 shadowdream，再复制新插件
  - 如果 plugins-dir 的上一级有 data 目录，还会初始化
    <profile>/data/shadowdream/config.json
  - 不会自动安装 QQ、LiteLoaderQQNT、Xvfb 或 Koishi
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
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
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
    const backup = `${target}.bak.${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`;
    console.log(`已存在旧插件，备份到 ${backup}`);
    if (!dryRun) await rename(target, backup);
  }
  console.log(`安装插件：${target}`);
  if (!dryRun) {
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, { recursive: true, force: true });
  }
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
  if (pluginsDirArg) {
    const pluginsDir = path.resolve(process.cwd(), pluginsDirArg);
    if (!existsSync(pluginsDir)) throw new Error(`插件目录不存在：${pluginsDir}`);
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
  console.log(`插件压缩包：${zipFile}`);
  console.log(`项目配置：${configFile}`);
  console.log('WebUI：http://127.0.0.1:3000/webui/');
  console.log('如果设置了 webuiToken，首次打开需要输入 token。');
}

main().catch((error) => {
  console.error(`\n安装失败：${error.message}`);
  process.exitCode = 1;
});
