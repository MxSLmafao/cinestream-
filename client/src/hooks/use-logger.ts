interface LoggerOptions {
  context?: Record<string, unknown>;
}

interface LogData {
  timestamp: string;
  context?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export function useLogger(options: LoggerOptions = {}) {
  const formatLogData = (data?: Record<string, unknown>): LogData => ({
    ...(options.context && { context: options.context }),
    ...(data && { data }),
    timestamp: new Date().toISOString()
  });

  const logError = (message: string, error: unknown) => {
    console.error(message, {
      ...formatLogData(),
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      } : error
    });
  };

  const logInfo = (message: string, data?: Record<string, unknown>) => {
    console.info(message, formatLogData(data));
  };

  const logWarning = (message: string, data?: Record<string, unknown>) => {
    console.warn(message, formatLogData(data));
  };

  return {
    logError,
    logInfo,
    logWarning
  };
}
