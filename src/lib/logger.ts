const isDev = import.meta.env.DEV;

export type LogLevel = 'info' | 'warn' | 'error';

function output(level: LogLevel, message: string, ...args: unknown[]) {
  if (!isDev && level === 'info') {
    return;
  }

  const payload = args.map((arg) => sanitize(arg));

  if (isDev) {
    console[level === 'error' ? 'error' : level](message, ...payload);
  } else if (level === 'error') {
    sendToErrorHandler(message, payload);
  }
}

function sanitize<T>(value: T): T {
  if (value && typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }
  return value;
}

function sendToErrorHandler(message: string, args: unknown[]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app:error', {
        detail: {
          message,
          args,
          timestamp: Date.now(),
        },
      }),
    );
  }
}

export const logger = {
  info: (message: string, ...args: unknown[]) => output('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => output('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => output('error', message, ...args),
};

export function attachGlobalErrorListener(handler: (message: string, args: unknown[]) => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const listener = (event: Event) => {
    const detail = (event as CustomEvent).detail as { message: string; args: unknown[] };
    if (detail) {
      handler(detail.message, detail.args);
    }
  };

  window.addEventListener('app:error', listener);

  return () => window.removeEventListener('app:error', listener);
}
