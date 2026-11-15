import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_REPO = 'derammeng/Shadow-Dream';
const DEFAULT_MANIFEST = (repo: string) =>
  `https://github.com/${repo}/releases/download/install-latest/install-bundle.json`;

export interface UpdateCheckResult {
  supported: boolean;
  root: string | null;
  script: string | null;
  repo: string;
  manifestUrl: string;
  current: string | null;
  latest: string | null;
  updateAvailable: boolean;
  error?: string;
}

export interface UpdateApplyResult {
  started: boolean;
  root: string;
  pid: number;
  logPath: string;
}

let runningPid: number | null = null;

function repoName(): string {
  return process.env.SHADOWDREAM_REPO?.trim() || DEFAULT_REPO;
}

function manifestUrl(repo: string): string {
  return process.env.SHADOWDREAM_MANIFEST_URL?.trim() || DEFAULT_MANIFEST(repo);
}

function githubToken(): string {
  return process.env.SHADOWDREAM_GITHUB_TOKEN || process.env.SHADOWDREAM_TOKEN || process.env.GITHUB_TOKEN || '';
}

export function findUpdateRoot(): string | null {
  const home = os.homedir();
  const candidates = [
    process.env.SHADOWDREAM_DIR,
    path.join(home, 'shadowdream'),
    path.join(home, 'ShadowDream'),
    process.cwd(),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const root = path.resolve(candidate);
    if (existsSync(path.join(root, 'scripts', 'update-shadowdream.sh')) &&
        existsSync(path.join(root, 'package.json'))) {
      try {
        return realpathSync(root);
      } catch {
        return root;
      }
    }
  }
  return null;
}

function localCommit(root: string | null): string | null {
  if (!root) return null;
  const file = path.join(root, 'install-bundle.json');
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8')) as { commit?: unknown };
    return typeof data.commit === 'string' && data.commit && data.commit !== 'unknown'
      ? data.commit
      : null;
  } catch {
    return null;
  }
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const token = githubToken();
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ShadowDream-WebUI',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function stringCommit(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const commit = (value as { commit?: unknown }).commit;
  return typeof commit === 'string' && commit ? commit : null;
}

async function remoteCommit(repo: string): Promise<string | null> {
  const url = manifestUrl(repo);
  try {
    const manifest = await fetchJson(url);
    const commit = stringCommit(manifest);
    if (commit) return commit;
  } catch {
    // Release 还没生成时回退 GitHub API。
  }
  try {
    const data = await fetchJson(
      `https://api.github.com/repos/${repo}/commits/main`,
      { Accept: 'application/vnd.github+json' },
    );
    if (data && typeof data === 'object') {
      const sha = (data as { sha?: unknown }).sha;
      if (typeof sha === 'string' && sha) return sha;
    }
  } catch {
    // 交给调用方显示错误。
  }
  return null;
}

export async function checkUpdate(): Promise<UpdateCheckResult> {
  const repo = repoName();
  const root = findUpdateRoot();
  const script = root ? path.join(root, 'scripts', 'update-shadowdream.sh') : null;
  const supported = Boolean(
    root &&
    script &&
    process.platform !== 'win32' &&
    existsSync(script),
  );
  const current = localCommit(root);
  let latest: string | null = null;
  let error: string | undefined;

  try {
    latest = await remoteCommit(repo);
    if (!latest) error = '无法读取远端版本，检查网络或镜像设置';
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return {
    supported,
    root,
    script,
    repo,
    manifestUrl: manifestUrl(repo),
    current,
    latest,
    updateAvailable: Boolean(supported && latest && current !== latest),
    ...(error ? { error } : {}),
  };
}

export async function applyUpdate(): Promise<UpdateApplyResult> {
  if (process.platform === 'win32') {
    throw new Error('WebUI 一键更新目前只支持 Linux 安装');
  }
  const root = findUpdateRoot();
  if (!root) throw new Error('找不到 Shadow Dream 源码目录（需要 scripts/update-shadowdream.sh）');
  const script = path.join(root, 'scripts', 'update-shadowdream.sh');
  if (!existsSync(script)) throw new Error(`找不到更新脚本：${script}`);

  if (runningPid !== null) {
    try {
      process.kill(runningPid, 0);
      throw new Error('已有更新任务在运行');
    } catch (err) {
      if (err instanceof Error && err.message === '已有更新任务在运行') throw err;
      runningPid = null;
    }
  }

  const check = await checkUpdate();
  if (!check.updateAvailable) {
    throw new Error(check.error || '当前已经是最新版本');
  }

  const logDir = path.join(root, 'logs');
  mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'webui-update.log');
  const fd = openSync(logPath, 'a');
  try {
    const child = spawn('bash', [script, '--update', '--delay', '2'], {
      cwd: root,
      detached: true,
      stdio: ['ignore', fd, fd],
      env: {
        ...process.env,
        SHADOWDREAM_DIR: root,
        SHADOWDREAM_FORCE_RESTART: '1',
      },
    });
    child.unref();
    if (!child.pid) throw new Error('更新进程启动失败');
    runningPid = child.pid;
    return { started: true, root, pid: child.pid, logPath };
  } finally {
    closeSync(fd);
  }
}
