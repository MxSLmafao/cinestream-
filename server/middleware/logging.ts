import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import expressWinston from 'express-winston';

// Request ID middleware with improved tracking
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.headers['x-request-id'] = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  next();
}

// Enhanced request logger with better context and performance tracking
export const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false,
  dynamicMeta: (req, res) => ({
    requestId: req.headers['x-request-id'],
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    responseTime: res.getHeader('X-Response-Time'),
    route: req.route?.path,
    query: req.query,
    statusCode: res.statusCode,
    timestamp: new Date().toISOString(),
    performanceMetrics: {
      responseTime: parseInt(res.getHeader('X-Response-Time') as string || '0'),
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    }
  })
});

// Enhanced error logger with more detailed context
export const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
  meta: true,
  msg: '{{err.message}}',
  dynamicMeta: (req, error) => ({
    requestId: req.headers['x-request-id'],
    route: req.route?.path,
    errorType: error instanceof Error ? error.name : 'UnknownError',
    errorStack: error instanceof Error ? error.stack : undefined,
    errorCause: error instanceof Error ? error.cause : undefined,
    timestamp: new Date().toISOString(),
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage()
    }
  })
});

// Response time middleware with enhanced tracking
export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', duration);
    
    if (duration > 1000) {
      logger.warn('Slow response detected', {
        path: req.path,
        method: req.method,
        duration,
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString(),
        performanceMetrics: {
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
          cpuUsage: process.cpuUsage()
        }
      });
    }
  });
  next();
}

// Database operation timing middleware with enhanced monitoring
export function dbTimingMiddleware(req: Request, res: Response, next: NextFunction) {
  const dbOperations: { operation: string; duration: number; timestamp: string }[] = [];
  
  (req as any).dbTiming = {
    start: (operation: string) => {
      const startTime = Date.now();
      return () => {
        const duration = Date.now() - startTime;
        dbOperations.push({ 
          operation, 
          duration,
          timestamp: new Date().toISOString()
        });
        
        if (duration > 500) {
          logger.warn('Slow database operation', {
            operation,
            duration,
            requestId: req.headers['x-request-id'],
            path: req.path,
            timestamp: new Date().toISOString(),
            performanceMetrics: {
              memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
              cpuUsage: process.cpuUsage()
            }
          });
        }
      };
    }
  };
  
  res.on('finish', () => {
    if (dbOperations.length > 0) {
      logger.info('Database operations completed', {
        operations: dbOperations,
        requestId: req.headers['x-request-id'],
        path: req.path,
        totalDuration: dbOperations.reduce((sum, op) => sum + op.duration, 0),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  next();
}
