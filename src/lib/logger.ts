type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function formatLog(level: LogLevel, message: string, meta?: LogMeta) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  });
}

export function logInfo(message: string, meta?: LogMeta) {
  console.log(formatLog("info", message, meta));
}

export function logWarn(message: string, meta?: LogMeta) {
  console.warn(formatLog("warn", message, meta));
}

export function logError(message: string, meta?: LogMeta) {
  console.error(formatLog("error", message, meta));
}

export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>,
  meta?: LogMeta
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    logInfo(`${label}:success`, { ...meta, durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    logError(`${label}:failure`, {
      ...meta,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
