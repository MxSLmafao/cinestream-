import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { createServer } from "http";
import cors from "cors";
import logger from './utils/logger';
import { db } from "../db";
import { accessCodes } from "../db/schema";
import { requestIdMiddleware, requestLogger, errorLogger, dbTimingMiddleware } from './middleware/logging';
import { errorHandler, notFoundHandler } from './middleware/error';
import { apiErrorHandler, rateLimitErrorHandler, validateRequest, trackResponseTime } from './middleware/api';
import Debug from 'debug';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const serverDebug = Debug('server:startup');
let server: ReturnType<typeof createServer>;

// Initialize Express app
const app = express();

// Enhanced development configuration
if (process.env.NODE_ENV === 'development') {
  app.set('json spaces', 2);
  serverDebug.enabled = true;
}

// Verify required environment variables first
const requiredEnvVars = {
  'TMDB_API_KEY': 'TMDB API key for movie data',
  'DATABASE_URL': 'Database connection URL',
  'JWT_SECRET': 'Secret for JWT token signing'
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key]) => !process.env[key])
  .map(([key, desc]) => ({ key, description: desc }));

if (missingVars.length > 0) {
  logger.error('Missing required environment variables:', { missing: missingVars });
  process.exit(1);
}

// Security middleware with improved CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
      mediaSrc: ["'self'", "https:", "http:"],
      fontSrc: ["'self'", "data:", "https:"],
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? [/\.repl\.co$/] : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Rate limiting with improved configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: rateLimitErrorHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? 
      (Array.isArray(forwarded) ? forwarded[0] : forwarded) : 
      req.ip;
    return ip || 'unknown';
  }
});

app.use(limiter);

// Request parsing with enhanced validation
app.use(express.json({
  limit: '10mb',
  verify: (req: Request, _res: Response, buf: Buffer) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('Invalid JSON payload');
    }
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced request tracking middleware
app.use(requestIdMiddleware);
app.use(validateRequest);
app.use(trackResponseTime);
app.use(requestLogger);
app.use(dbTimingMiddleware);

// Enhanced database connection check with retry mechanism
async function checkDatabaseConnection(maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      await db.select().from(accessCodes).limit(1);
      const duration = Date.now() - startTime;
      
      logger.info('Database connection verified', { 
        attempt, 
        duration,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      logger.error('Database connection attempt failed:', {
        attempt,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error,
        isLastAttempt: attempt === maxRetries,
        timestamp: new Date().toISOString()
      });
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  return false;
}

// Enhanced server startup with better error handling
async function startServer(): Promise<void> {
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = '0.0.0.0';

  try {
    serverDebug('Starting server initialization...');
    logger.info('Server startup initiated', {
      port,
      host,
      env: process.env.NODE_ENV,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    });

    // Verify database connection first
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Failed to establish database connection');
    }

    // Set up routes and middleware
    registerRoutes(app);
    app.use(errorLogger);
    app.use(notFoundHandler);
    app.use(apiErrorHandler);
    app.use(errorHandler);

    return new Promise((resolve, reject) => {
      server = createServer(app);

      // Enhanced server timeouts
      server.timeout = 30000;
      server.keepAliveTimeout = 65000;
      server.headersTimeout = 66000;

      // Error handling for server events
      server.on('error', (error: NodeJS.ErrnoException) => {
        logger.error('Server error:', {
          error: error instanceof Error ? {
            message: error.message,
            code: error.code,
            stack: error.stack
          } : error,
          port,
          host,
          timestamp: new Date().toISOString()
        });
        reject(error);
      });

      // Start server with development setup
      server.listen(port, host, async () => {
        try {
          // Setup development middleware first
          if (process.env.NODE_ENV === 'development') {
            await setupVite(app, server);
            serverDebug('Development middleware initialized');
          }
          
          logger.info('Server started successfully', {
            port,
            host,
            env: process.env.NODE_ENV,
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
          });
          
          resolve();
        } catch (error) {
          logger.error('Server initialization error:', {
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack
            } : error,
            timestamp: new Date().toISOString()
          });
          
          // Close server on initialization error
          server.close(() => {
            reject(error);
          });
        }
      });

      // Handle initial connection timeout
      setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 30000);
    });
  } catch (error) {
    logger.error('Server startup failed:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Enhanced graceful shutdown
async function gracefulShutdown(code: number = 0): Promise<void> {
  logger.info('Initiating graceful shutdown...', {
    timestamp: new Date().toISOString()
  });
  
  if (server) {
    server.close(() => {
      logger.info('Server closed successfully', {
        timestamp: new Date().toISOString()
      });
      process.exit(code);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Force shutdown initiated after timeout', {
        timestamp: new Date().toISOString()
      });
      process.exit(code);
    }, 10000);
  } else {
    process.exit(code);
  }
}

// Signal handlers with improved logging
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal', {
    timestamp: new Date().toISOString()
  });
  gracefulShutdown(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal', {
    timestamp: new Date().toISOString()
  });
  gracefulShutdown(0);
});

// Enhanced global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    timestamp: new Date().toISOString()
  });
  gracefulShutdown(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', {
    reason: reason instanceof Error ? {
      message: reason.message,
      stack: reason.stack,
      name: reason.name
    } : reason,
    timestamp: new Date().toISOString()
  });
});

// Start server with improved retry mechanism and cleanup
(async () => {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      await startServer();
      break;
    } catch (error) {
      retryCount++;
      logger.error(`Server start attempt ${retryCount}/${maxRetries} failed:`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error,
        timestamp: new Date().toISOString()
      });

      if (retryCount === maxRetries) {
        process.exit(1);
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount)));
    }
  }
})();

export default app;
