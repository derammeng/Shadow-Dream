import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  createLogger,
  ensureConfig,
  messageToPlainText,
  ShadowDreamBot,
  VERSION,
  type ShadowDreamConfig,
  type OneBotEvent,
} from '@shadowdream/core';
import { MockBackend } from './backend.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CliOptions {
  config: string;
  httpPort?: number;
  wsPort?: number;
  host?: string;
  token?: string;
  webui: boolean;
  repl: boolean;
  echo: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    config: path.resolve(__dirname, '../../../config/shadowdream.json'),
    webui: true,
    repl: true,
    echo: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = (): string => {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} 缺少参数`);
      return value;
    };
    switch (arg) {
      case '--config':
        options.config = path.resolve(next());
        break;
      case '--http-port':
        options.httpPort = Number(next());
        break;
      case '--ws-port':
        options.wsPort = Number(next());
        break;
      case '--host':
        options.host = next();
        break;
      case '--token':
        options.token = next();
        break;
      case '--no-webui':
        options.webui = false;
        break;
      case '--no-repl':
        options.repl = false;
        break;
      case '--echo':
        options.echo = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      default:
        if (arg.startsWith('-')) throw new Error(`未知参数：${arg}`);
        break;
    }
  }
  return options;
}

function helpText(): string {
  return `
Shadow Dream 模拟器 · 不连接 QQ 也能把 OneBot 11 跑起来

用法: fd-mock [options]

  --config <path>    配置文件路径（默认 config/shadowdream.json）
  --http-port <port> 覆盖 HTTP API 端口
  --ws-port <port>   覆盖 WebSocket 端口
  --host <host>      监听地址
  --token <token>    同时设置 HTTP / WS access token
  --no-webui         关闭控制台页面
  --no-repl          不进入交互命令行
  --echo             启动一个复读机器人（收到消息就回显）
  -h, --help         显示帮助

交互命令:
  /friend <qq> <文本>           模拟好友消息
  /group <群号> <qq> <文本>     模拟群消息
  /call <action> <json>        调用任意 OneBot API
  /status                      查看状态
  /help                        查看命令
  /quit                        退出
`.trim();
}

function printBanner(bot: ShadowDreamBot): void {
  const overview = bot.getOverview();
  const lines = [
    '',
    '  ██████╗ ██████╗ ███████╗ █████╗ ███╗   ███╗',
    '  ██╔══██╗██╔══██╗██╔════╝██╔══██╗████╗ ████║',
    '  ██║  ██║██████╔╝█████╗  ███████║██╔████╔██║',
    '  ██║  ██║██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║',
    '  ██████╔╝██║  ██║███████╗██║  ██║██║ ╚═╝ ██║',
    '  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝',
    '',
    `  Shadow Dream ${VERSION} · 模拟 QQ 后端`,
    `  账号     ${overview.backend.selfId} ${overview.backend.name}`,
    `  HTTP     ${overview.transports.http}`,
    `  WS       ${overview.transports.ws}`,
    `  WebUI    ${overview.transports.webui}`,
    '',
    '  交互：/friend 20001 你好  |  /group 30001 20002 大家好  |  /help',
    '',
  ];
  console.log(lines.join('\n'));
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(helpText());
    return;
  }

  const config: ShadowDreamConfig = ensureConfig({ file: options.config, allowMissing: true });
  if (config.backend.type !== 'mock') {
    console.log(`[Shadow Dream] 配置里的 backend 是 ${config.backend.type}，模拟器将临时使用 mock。`);
    config.backend = { type: 'mock' };
  }
  if (options.httpPort) config.http.port = options.httpPort;
  const wsServers = config.wsServers ?? [config.ws];
  if (options.wsPort && wsServers[0]) wsServers[0].port = options.wsPort;
  if (options.host) {
    config.http.host = options.host;
    for (const ws of wsServers) ws.host = options.host;
  }
  if (options.token !== undefined) {
    config.http.accessToken = options.token;
    for (const ws of wsServers) ws.accessToken = options.token;
  }
  config.ws = wsServers[0] ?? config.ws;
  if (!options.webui) config.http.webui = false;

  const logger = createLogger('Shadow Dream', config.logLevel);
  const backend = new MockBackend();
  const bot = new ShadowDreamBot({
    config,
    backend,
    logger,
    configPath: options.config,
  });
  await bot.start();
  printBanner(bot);

  if (options.echo) {
    backend.onEvent(event => {
      if (event.post_type !== 'message') return;
      const text = `[echo] ${messageToPlainText(event.message)}`;
      if (event.message_type === 'group' && event.group_id) {
        void bot.execute('send_group_msg', { group_id: event.group_id, message: text }, { source: 'internal' });
      } else {
        void bot.execute('send_private_msg', { user_id: event.user_id, message: text }, { source: 'internal' });
      }
    });
    console.log('  [echo] 已开启复读模式\n');
  }

  backend.onEvent((event: OneBotEvent) => {
    if (event.post_type === 'message') {
      const where = event.message_type === 'group' ? `群 ${event.group_id}` : `QQ ${event.user_id}`;
      console.log(`\n  << ${where} · ${event.sender.nickname}: ${messageToPlainText(event.message)}`);
    }
  });

  let lastTarget: { type: 'private' | 'group'; id: number; user?: number } | null = null;
  let closing = false;
  const shutdown = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    await bot.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  if (!options.repl || !input.isTTY) {
    // 非交互模式（CI / 后台任务）保持进程存活，由信号退出。
    await new Promise<void>(() => {});
    return;
  }

  const rl = readline.createInterface({ input, output });
  rl.on('close', () => void shutdown());

  for (;;) {
    let line: string;
    try {
      line = (await rl.question('shadowdream> ')).trim();
    } catch {
      break;
    }
    if (!line) continue;
    if (!line.startsWith('/')) {
      if (!lastTarget) {
        console.log('  先指定目标：/friend 20001 你好');
        continue;
      }
      try {
        await backend.simulate({
          message_type: lastTarget.type,
          user_id: lastTarget.user ?? 20001,
          group_id: lastTarget.type === 'group' ? lastTarget.id : undefined,
          message: line,
        });
      } catch (error) {
        console.log(`  失败：${(error as Error).message}`);
      }
      continue;
    }

    const [command, ...rest] = line.split(/\s+/);
    if (command === '/quit' || command === '/exit') {
      rl.close();
      break;
    }
    if (command === '/help') {
      console.log(helpText());
      continue;
    }
    if (command === '/status') {
      console.log(JSON.stringify(bot.getOverview(), null, 2));
      continue;
    }
    if (command === '/friend') {
      const userId = Number(rest[0]);
      const text = rest.slice(1).join(' ');
      if (!userId || !text) {
        console.log('  用法：/friend <qq> <文本>');
        continue;
      }
      try {
        const result = await backend.simulate({ message_type: 'private', user_id: userId, message: text });
        lastTarget = { type: 'private', id: userId };
        console.log(`  已注入私聊消息 ${JSON.stringify(result)}`);
      } catch (error) {
        console.log(`  失败：${(error as Error).message}`);
      }
      continue;
    }
    if (command === '/group') {
      const groupId = Number(rest[0]);
      const userId = Number(rest[1]);
      const text = rest.slice(2).join(' ');
      if (!groupId || !userId || !text) {
        console.log('  用法：/group <群号> <qq> <文本>');
        continue;
      }
      try {
        const result = await backend.simulate({
          message_type: 'group',
          group_id: groupId,
          user_id: userId,
          message: text,
        });
        lastTarget = { type: 'group', id: groupId, user: userId };
        console.log(`  已注入群消息 ${JSON.stringify(result)}`);
      } catch (error) {
        console.log(`  失败：${(error as Error).message}`);
      }
      continue;
    }
    if (command === '/call') {
      const action = rest[0];
      const raw = rest.slice(1).join(' ') || '{}';
      if (!action) {
        console.log('  用法：/call <action> <json>');
        continue;
      }
      try {
        const params = JSON.parse(raw) as Record<string, unknown>;
        const result = await bot.execute(action, params, { source: 'internal' });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.log(`  失败：${(error as Error).message}`);
      }
      continue;
    }
    console.log(`  未知命令：${command}，输入 /help 查看帮助`);
  }

  await shutdown();
}

main().catch((error) => {
  console.error(`[Shadow Dream] 启动失败：${(error as Error).stack ?? error}`);
  process.exit(1);
});
