import type { Express } from "express";
import { db } from "../db";
import { accessCodes, sessions } from "../db/schema";
import jwt from 'jsonwebtoken';
import { getTMDBMovies, searchTMDBMovies } from "./services/tmdb";
import yaml from 'js-yaml';
import fs from 'fs';
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || 'cinema-secret';

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

  // Movies routes
  app.get('/api/movies/trending', async (req, res) => {
    const movies = await getTMDBMovies('trending');
    res.json(movies);
  });

  app.get('/api/movies/search', async (req, res) => {
    const { query } = req.query;
    const movies = await searchTMDBMovies(query as string);
    res.json(movies);
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

  // Protected routes
  app.get('/api/movies/:id/stream', authenticate, async (req, res) => {
    const { id } = req.params;
    const streamUrl = `https://vidsrc.xyz/embed/movie/${id}`;
    res.json({ streamUrl });
  });
}
