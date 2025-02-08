
import { Logger } from './types.ts';

export function createLogger(requestId: string): Logger {
  const logEvent = (
    level: string,
    message: string,
    error?: Error | unknown,
    data?: Record<string, unknown>
  ) => {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({
      timestamp,
      requestId,
      level,
      message,
      ...(error && { error: error instanceof Error ? { 
        message: error.message,
        stack: error.stack
      } : error }),
      ...(data && { data })
    }));
  };

  return {
    info: (message: string, data?: Record<string, unknown>) => 
      logEvent('INFO', message, undefined, data),
    error: (message: string, error: Error | unknown, data?: Record<string, unknown>) => 
      logEvent('ERROR', message, error, data),
    debug: (message: string, data?: Record<string, unknown>) => 
      logEvent('DEBUG', message, undefined, data)
  };
}
