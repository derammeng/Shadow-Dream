/**
 * OneBot 11 常用返回码。
 * 参考 go-cqhttp 的约定，并给 Shadow Dream 自己留了 1400 段。
 */
export const RetCode = {
  OK: 0,
  ASYNC: 1,
  BAD_REQUEST: 100,
  NO_PERMISSION: 102,
  NO_SESSION: 103,
  INVALID_TOKEN: 104,
  UNSUPPORTED: 1401,
  NOT_FOUND: 1404,
  INTERNAL: 1500,
} as const;

export class ActionError extends Error {
  readonly retcode: number;
  readonly wording?: string;

  constructor(retcode: number, message: string, wording?: string) {
    super(message);
    this.name = 'ActionError';
    this.retcode = retcode;
    this.wording = wording;
  }

  static badRequest(message: string): ActionError {
    return new ActionError(RetCode.BAD_REQUEST, message, '参数错误');
  }

  static unsupported(message = '当前后端不支持该操作'): ActionError {
    return new ActionError(RetCode.UNSUPPORTED, message, '不支持的操作');
  }

  static notFound(message = '目标不存在'): ActionError {
    return new ActionError(RetCode.NOT_FOUND, message, '目标不存在');
  }

  static noPermission(message = '没有权限'): ActionError {
    return new ActionError(RetCode.NO_PERMISSION, message, '没有权限');
  }

  static internal(message = '内部错误'): ActionError {
    return new ActionError(RetCode.INTERNAL, message, '内部错误');
  }
}

export function toActionError(error: unknown): ActionError {
  if (error instanceof ActionError) return error;
  if (error instanceof Error) return new ActionError(RetCode.INTERNAL, error.message);
  return new ActionError(RetCode.INTERNAL, String(error));
}
