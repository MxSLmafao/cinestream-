import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import createError from 'http-errors';

export function apiErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  // Enhanced error logging with request context
  logger.error(`API Error: ${req.method} ${req.path} - ${status} ${message}`, {
    error: err instanceof Error ? {
      message: err.message,
      name: err.name,
      stack: err.stack,
      cause: err.cause
    } : err,
    request: {
      path: req.path,
      method: req.method,
      query: req.query,
      params: req.params,
      headers: req.headers['x-request-id'],
      ip: req.ip
    },
    timestamp: new Date().toISOString()
  });

  // Only send minimal error info in production
  const response = {
    error: process.env.NODE_ENV === 'production' ? message : err.message,
    status,
    path: req.path,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'],
    code: err.code
  };

  res.status(status).json(response);
}

// Rate limiting error handler
export function rateLimitErrorHandler(req: Request, res: Response) {
  const response = {
    error: 'Too many requests',
    status: 429,
    path: req.path,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'],
    retryAfter: res.getHeader('Retry-After')
  };

  logger.warn('Rate limit exceeded:', {
    ip: req.ip,
    path: req.path,
    headers: {
      requestId: req.headers['x-request-id'],
      userAgent: req.headers['user-agent']
    }
  });

  res.status(429).json(response);
}

// Request validation middleware
export function validateRequest(req: Request, res: Response, next: NextFunction) {
  // Validate required headers
  if (!req.headers['x-request-id']) {
    return next(createError(400, 'Missing request ID'));
  }

  // Validate content type for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    return next(createError(415, 'Unsupported Media Type - Expected application/json'));
  }

  next();
}

// Response time tracking
export function trackResponseTime(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status,
      duration,
      requestId: req.headers['x-request-id'],
      ...(status >= 400 && { level: 'warn' })
    });
  });

  next();
}
