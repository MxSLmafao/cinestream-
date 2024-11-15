import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import createError from 'http-errors';

// Enhanced error handler with better logging and error classification
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  // Classify error type for better logging
  const errorType = err.name || (err.code ? `Code: ${err.code}` : 'UnknownError');
  const errorContext = {
    type: errorType,
    error: err instanceof Error ? {
      message: err.message,
      name: err.name,
      stack: err.stack,
      code: err.code,
      cause: err.cause
    } : err,
    request: {
      path: req.path,
      method: req.method,
      query: req.query,
      params: req.params,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined
      },
      ip: req.ip
    },
    timestamp: new Date().toISOString()
  };

  // Log based on error severity
  if (status >= 500) {
    logger.error(`Server Error [${errorType}]: ${req.method} ${req.path}`, errorContext);
  } else if (status >= 400) {
    logger.warn(`Client Error [${errorType}]: ${req.method} ${req.path}`, errorContext);
  } else {
    logger.info(`Handled Error [${errorType}]: ${req.method} ${req.path}`, errorContext);
  }

  // Send appropriate response based on environment
  const response = {
    error: process.env.NODE_ENV === 'production' ? message : err.message,
    status,
    path: req.path,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'],
    code: err.code,
    type: process.env.NODE_ENV === 'development' ? errorType : undefined,
    details: process.env.NODE_ENV === 'development' ? err.details : undefined
  };

  res.status(status).json(response);
}

// Enhanced 404 handler with request tracking
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  logger.warn('Route not found:', {
    path: req.path,
    method: req.method,
    query: req.query,
    params: req.params,
    ip: req.ip,
    requestId: req.headers['x-request-id']
  });
  next(createError(404, `Route ${req.method} ${req.path} not found`));
}
