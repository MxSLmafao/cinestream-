import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { accessCodes, sessions } from "../db/schema";
import jwt from 'jsonwebtoken';
import { getTMDBMovies, searchTMDBMovies, getMovieDetails } from "./services/tmdb";
import logger from './utils/logger';
import createError from 'http-errors';
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || 'cinema-secret';

export function registerRoutes(app: Express) {
  // Health check endpoint
  app.get('/api/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Check database connection
      await db.select().from(accessCodes).limit(1);
      
      // Check TMDB API connection
      const tmdbResponse = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${process.env.TMDB_API_KEY}`);
      if (!tmdbResponse.ok) {
        throw new Error('TMDB API connection failed');
      }

      res.json({ 
        status: 'healthy',
        services: {
          database: 'connected',
          tmdb: 'connected'
        }
      });
    } catch (error) {
      logger.error('Health check failed:', { error });
      next(createError(503, 'Service unavailable'));
    }
  });

  // Error handling middleware
  const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log error with context
    logger.error(`${req.method} ${req.path} - ${status} ${message}`, {
      error: err,
      path: req.path,
      method: req.method,
      query: req.query,
      params: req.params,
      ip: req.ip,
      timestamp: new Date().toISOString(),
      stack: err.stack
    });

    res.status(status).json({ 
      error: message,
      path: req.path,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || undefined
    });
  };

  // Request logger middleware with request ID
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.info(`Incoming ${req.method} request to ${req.path}`, {
      requestId: req.headers['x-request-id'],
      query: req.query,
      params: req.params,
      ip: req.ip
    });
    next();
  });

  // Response time logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`Request completed`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        requestId: req.headers['x-request-id']
      });
    });
    next();
  });

  app.use(errorHandler);

  // Auth routes
  app.post('/api/auth', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        throw createError(400, 'Access code is required');
      }
      
      const validCode = await db.query.accessCodes.findFirst({
        where: eq(accessCodes.code, code),
      });

      if (!validCode || validCode.validUntil < new Date()) {
        throw createError(401, validCode ? 'Code has expired' : 'Invalid code');
      }

      const token = jwt.sign({ codeId: validCode.id }, JWT_SECRET, { expiresIn: '24h' });
      
      await db.insert(sessions).values({
        token,
        accessCodeId: validCode.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      logger.info('New session created', { 
        codeId: validCode.id,
        requestId: req.headers['x-request-id']
      });
      res.json({ token });
    } catch (error) {
      next(error);
    }
  });

  // Protected route middleware
  const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        throw createError(401, 'No token provided');
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.token, token),
      });

      if (!session || session.expiresAt < new Date()) {
        throw createError(401, 'Session expired');
      }

      (req as any).user = decoded;
      next();
    } catch (error) {
      next(createError(401, error instanceof Error ? error.message : 'Authentication failed'));
    }
  };

  // Movies routes
  app.get('/api/movies/trending', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const movies = await getTMDBMovies('trending');
      res.json(movies);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/movies/search', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query.query as string | undefined;
      
      if (!query) {
        throw createError(400, 'Search query is required');
      }
      
      const movies = await searchTMDBMovies(query);
      res.json(movies);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/movies/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const movie = await getMovieDetails(req.params.id);
      res.json(movie);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/movies/:id/stream', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Verify movie exists before returning stream URL
      await getMovieDetails(id);
      
      const streamUrl = `https://vidsrc.xyz/embed/movie/${id}`;
      logger.info('Stream URL generated', { 
        movieId: id,
        requestId: req.headers['x-request-id']
      });
      res.json({ streamUrl });
    } catch (error) {
      next(error);
    }
  });
}
