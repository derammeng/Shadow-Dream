import path from 'node:path';
import type { Logger } from '@shadowdream/core';

declare const require: NodeRequire;

/**
 * LiteLoader 的 main 脚本在 QQ 主进程里执行。Linux QQ 对 process.dlopen
 * 的原生调用非常敏感，替换 dlopen 会让主进程在 wrapper 加载后直接退出，
 * 因此这里只轮询 require.cache，不修改任何原生入口。
 */
export function installWrapperHook(
  onWrapper: (wrapper: any) => any,
  logger: Logger,
): void {
  const processWithFlag = process as NodeJS.Process & { __shadowdreamCacheHooked?: boolean };
  if (processWithFlag.__shadowdreamCacheHooked) return;
  processWithFlag.__shadowdreamCacheHooked = true;

  // 只替换 JS 的 Module._load，不碰 process.dlopen；QQ 的 node-loader
  // 走 require 时可以在这里拿到 wrapper 的 exports。
  try {
    const Module = require('node:module') as typeof import('node:module') & {
      _load: (request: string, parent: NodeModule | undefined, isMain: boolean) => any;
    };
    const originalLoad = Module._load;
    Module._load = function patchedLoad(this: unknown, request: string, parent: NodeModule | undefined, isMain: boolean) {
      const result = originalLoad.call(this, request, parent, isMain);
      try {
        if (typeof request === 'string' && request.includes('wrapper.node') && isWrapper(result)) {
          logger.info(`从 Module._load 捕获 wrapper.node：${request}`);
          onWrapper(result);
        }
      } catch (error) {
        logger.debug(`检查 Module._load 结果失败：${(error as Error).message}`);
      }
      return result;
    };
  } catch (error) {
    logger.warn(`无法接管 Module._load：${(error as Error).message}`);
  }

  let reported = false;
  const scan = (): void => {
    try {
      const cache = getRequireCache();
      if (!cache) return;
      const keys = Object.keys(cache);
      if (!reported) {
        const nativeKeys = keys.filter(key => key.includes('.node'));
        if (nativeKeys.length > 0) {
          logger.info(`require.cache 中的 native 模块：${nativeKeys.join(' | ')}`);
          reported = true;
        }
      }
      for (const key of keys) {
        const exports = cache[key]?.exports;
        if (isWrapper(exports)) {
          logger.info(`从 require.cache 发现 wrapper.node：${key}`);
          onWrapper(exports);
          return;
        }
      }
    } catch (error) {
      logger.debug(`扫描 require.cache 失败：${(error as Error).message}`);
    }
  };
  const timer = setInterval(scan, 500);
  timer.unref?.();
  scan();

  // QQ 的 node-loader 不把 wrapper 放进 require.cache，也经不起替换
  // process.dlopen；直接 require 同一个 wrapper.node 作为兜底。
  setTimeout(() => {
    try {
      const wrapperPath = path.join((process as any).resourcesPath, 'app', 'wrapper.node');
      const direct = require(wrapperPath);
      if (isWrapper(direct)) {
        logger.info('直接 require 捕获 wrapper.node');
        onWrapper(direct);
      }
    } catch (error) {
      logger.warn(`直接 require wrapper.node 失败：${(error as Error).message}`);
    }
  }, 2500);
}

export function isWrapper(value: any): boolean {
  return Boolean(
    value
    && typeof value === 'object'
    && value.NodeIQQNTWrapperSession
    && value.NodeIKernelLoginService
    && value.NodeIQQNTWrapperEngine,
  );
}

export function isSession(value: any): boolean {
  return Boolean(value && typeof value.getMsgService === 'function');
}

/**
 * 登录前也可能存在一个“占位 session”，它的 getMsgService 返回的对象
 * 还没有 sendMsg。必须等到真正的消息服务就绪再启动后端，否则会出现
 * “当前 QQNT 版本没有 sendMsg / 无法把 QQ 转成 uid”。
 */
export function isSessionReady(value: any): boolean {
  if (!isSession(value)) return false;
  try {
    const msg = value.getMsgService?.();
    return Boolean(msg && typeof msg.sendMsg === 'function');
  } catch {
    return false;
  }
}

/**
 * 在 wrapper 的导出外面包一层，只拦截 NodeIQQNTWrapperSession 这个入口。
 * 如果 QQ 在插件加载前已经拿走了原始引用，installSessionCapture 的轮询
 * 仍会作为兜底。
 */
export function wrapWrapperForSession(
  wrapper: any,
  onSession: (session: any) => void,
): any {
  const service = wrapper?.NodeIQQNTWrapperSession;
  if (!service) return wrapper;

  const serviceProxy = new Proxy(service, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if ((property === 'create' || property === 'get' || property === 'getNTWrapperSession') && typeof value === 'function') {
        return function patched(this: unknown, ...args: unknown[]): unknown {
          const result = Reflect.apply(value, target, args);
          if (isSessionReady(result)) onSession(result);
          return result;
        };
      }
      return value;
    },
  });

  return new Proxy(wrapper, {
    get(target, property, receiver) {
      if (property === 'NodeIQQNTWrapperSession') return serviceProxy;
      return Reflect.get(target, property, receiver ?? target);
    },
  });
}

/**
 * 拦截 NodeIQQNTWrapperSession 的 create / get / getNTWrapperSession，
 * 并定期轮询。QQ 在不同版本里创建 session 的时机不一样，多路兜底。
 */
export function installSessionCapture(
  wrapper: any,
  onSession: (session: any) => void,
  logger: Logger,
): void {
  const service = wrapper?.NodeIQQNTWrapperSession;
  if (!service) return;
  // 不要给原生 service 的方法赋值：Linux QQ 的原生层会校验对象形状，
  // 替换 create/get 可能让 QQ 直接退出。这里只做只读轮询。
  logger.debug('已注册 QQNT session 轮询捕获');

  const poll = setInterval(() => {
    try {
      const byGet = service.get?.();
      if (isSessionReady(byGet)) onSession(byGet);
      const byId = service.getNTWrapperSession?.('nt_1');
      if (isSessionReady(byId)) onSession(byId);
    } catch {
      // session 尚未创建时会抛错，忽略即可。
    }
  }, 800);
  poll.unref?.();

  // 不在 dlopen 的同一 tick 里调用原生 get：部分 Linux QQ 版本此时
  // 还没完成内部初始化，提前调用会让主进程直接退出。轮询会稍后兜底。
}

function getRequireCache(): Record<string, { exports: any }> | null {
  try {
    const mainModule = (process as NodeJS.Process & {
      mainModule?: NodeModule & { require?: NodeRequire };
    }).mainModule;
    if (mainModule?.require) return mainModule.require.cache as unknown as Record<string, { exports: any }>;
  } catch {
    // ignore
  }
  try {
    if (typeof require !== 'undefined') {
      return require.cache as unknown as Record<string, { exports: any }>;
    }
  } catch {
    // ignore
  }
  return null;
}
