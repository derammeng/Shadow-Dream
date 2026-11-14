import type { LogLevelName } from '../config/schema.js';

export interface LogEntry {
  seq: number;
  time: number;
  level: LogLevelName;
  scope: string;
  message: string;
}

const LEVEL_WEIGHT: Record<LogLevelName, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

const LEVEL_LABEL: Record<LogLevelName, string> = {
  trace: 'TRACE',
  debug: 'DEBUG',
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
};

const LEVEL_COLOR: Record<LogLevelName, string> = {
  trace: '\x1b[90m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

const RESET = '\x1b[0m';
const DIM = '\x1b[90m';

/**
 * 内存日志总线。WebUI 通过它读最近日志，不必依赖文件。
 */
export class LogBus {
  private readonly entries: LogEntry[] = [];
  private readonly listeners = new Set<(entry: LogEntry) => void>();
  private seq = 0;

  constructor(private readonly capacity = 1000) {}

  push(level: LogLevelName, scope: string, message: string): LogEntry {
    const entry: LogEntry = {
      seq: ++this.seq,
      time: Date.now(),
      level,
      scope,
      message,
    };
    this.entries.push(entry);
    if (this.entries.length > this.capacity) {
      this.entries.splice(0, this.entries.length - this.capacity);
    }
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // 日志监听器不能反向影响日志本身。
      }
    }
    return entry;
  }

  snapshot(limit = 200): LogEntry[] {
    const start = Math.max(0, this.entries.length - limit);
    return this.entries.slice(start);
  }

  since(seq: number, limit = 500): LogEntry[] {
    return this.entries.filter(entry => entry.seq > seq).slice(0, limit);
  }

  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const logBus = new LogBus();

function timestamp(time: number): string {
  const date = new Date(time);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack ?? value.message;
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export class Logger {
  constructor(
    readonly scope: string,
    private level: LogLevelName = 'info',
    private readonly useColor = process.stdout.isTTY,
    private readonly bus: LogBus = logBus,
  ) {}

  child(scope: string): Logger {
    return new Logger(`${this.scope}:${scope}`, this.level, this.useColor, this.bus);
  }

  setLevel(level: LogLevelName): void {
    this.level = level;
  }

  trace(message: string, ...args: unknown[]): void {
    this.write('trace', message, args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.write('debug', message, args);
  }

  info(message: string, ...args: unknown[]): void {
    this.write('info', message, args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.write('warn', message, args);
  }

  error(message: string, ...args: unknown[]): void {
    this.write('error', message, args);
  }

  private write(level: LogLevelName, message: string, args: unknown[]): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.level]) return;
    const text = args.length > 0
      ? `${message} ${args.map(stringify).join(' ')}`
      : message;

    const time = Date.now();
    this.bus.push(level, this.scope, text);

    const color = this.useColor ? LEVEL_COLOR[level] : '';
    const reset = this.useColor ? RESET : '';
    const dim = this.useColor ? DIM : '';
    const line = `${dim}${timestamp(time)}${reset} ${color}${LEVEL_LABEL[level]}${reset} ${dim}${this.scope}${reset} ${text}`;
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}

export function createLogger(scope: string, level: LogLevelName = 'info'): Logger {
  return new Logger(scope, level);
}
