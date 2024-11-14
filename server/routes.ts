import type { Express } from "express";
import { db } from "../db";
import { accessCodes, sessions } from "../db/schema";
import jwt from 'jsonwebtoken';
import { getTMDBMovies, searchTMDBMovies } from "./services/tmdb";
import yaml from 'js-yaml';
import fs from 'fs';
import { eq } from "drizzle-orm";
import fetch from 'node-fetch';

const JWT_SECRET = process.env.JWT_SECRET || 'cinema-secret';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

export function registerRoutes(app: Express) {
  // Auth routes
  app.post('/api/auth', async (req, res) => {
    const { code } = req.body;
    
    const validCode = await db.query.accessCodes.findFirst({
      where: eq(accessCodes.code, code),
    });

    if (!validCode || validCode.validUntil < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    const token = jwt.sign({ codeId: validCode.id }, JWT_SECRET, { expiresIn: '24h' });
    
    await db.insert(sessions).values({
      token,
      accessCodeId: validCode.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.json({ token });
  });

  // Protected route middleware
  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.token, token),
      });

      if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Session expired' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Movies routes
  app.get('/api/movies/trending', authenticate, async (_req, res) => {
    try {
      const movies = await getTMDBMovies('trending');
      if (!movies?.results) {
        throw new Error('Invalid response from TMDB API');
      }
      res.json(movies);
    } catch (error) {
      console.error('Failed to fetch trending movies:', error);
      res.status(500).json({ 
        error: 'Failed to fetch trending movies',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/movies/search', authenticate, async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ 
          error: 'Missing search query',
          details: 'Search query parameter is required'
        });
      }
      const movies = await searchTMDBMovies(query as string);
      if (!movies?.results) {
        throw new Error('Invalid response from TMDB API');
      }
      res.json(movies);
    } catch (error) {
      console.error('Failed to search movies:', error);
      res.status(500).json({ 
        error: 'Failed to search movies',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/movies/:id', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch movie details');
      }
      
      const movie = await response.json();
      if (!movie?.id) {
        throw new Error('Invalid movie data received');
      }
      res.json(movie);
    } catch (error) {
      console.error('Failed to fetch movie details:', error);
      res.status(500).json({ 
        error: 'Failed to fetch movie details',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/movies/:id/stream', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const streamUrl = `https://vidsrc.xyz/embed/movie/${id}`;
      res.json({ streamUrl });
    } catch (error) {
      console.error('Failed to get stream URL:', error);
      res.status(500).json({ 
        error: 'Failed to get stream URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
