type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return levelRank[level] >= levelRank[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, scope: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;
  const line = `[${formatTimestamp()}] [${level.toUpperCase()}] [${scope}] ${message}`;
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  if (data !== undefined) {
    out(line, data);
  } else {
    out(line);
  }
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, data?: unknown) => log('debug', scope, message, data),
    info: (message: string, data?: unknown) => log('info', scope, message, data),
    warn: (message: string, data?: unknown) => log('warn', scope, message, data),
    error: (message: string, data?: unknown) => log('error', scope, message, data),
  };
}

export type Logger = ReturnType<typeof createLogger>;
