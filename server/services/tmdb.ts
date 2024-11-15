import fetch from 'node-fetch';
import type { TMDBResponse, TMDBError, TMDBMovie } from '../types/tmdb';
import logger from '../utils/logger';
import createError from 'http-errors';
import type { Response } from 'node-fetch';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const NETWORK_TIMEOUT = 10000; // 10 seconds

// Enhanced retry function with timeout
async function retryFetch(url: string, options: any = {}, retries = MAX_RETRIES): Promise<Response> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), NETWORK_TIMEOUT);
  });

  try {
    const fetchPromise = fetch(url, {
      ...options,
      timeout: NETWORK_TIMEOUT,
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
    
    if (!response.ok && retries > 0) {
      logger.warn(`TMDB API request failed, retrying... (${retries} attempts left)`, {
        status: response.status,
        url: url.replace(TMDB_API_KEY || '', '[REDACTED]'),
        headers: response.headers.raw()
      });
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (MAX_RETRIES - retries + 1)));
      return retryFetch(url, options, retries - 1);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      logger.warn(`TMDB API request failed with error, retrying... (${retries} attempts left)`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: url.replace(TMDB_API_KEY || '', '[REDACTED]')
      });
      
      // Exponential backoff for network errors
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (MAX_RETRIES - retries + 1)));
      return retryFetch(url, options, retries - 1);
    }
    throw error;
  }
}

async function handleTMDBResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json() as TMDBError;
    logger.error('TMDB API error response:', {
      status: response.status,
      statusText: response.statusText,
      error,
      headers: response.headers.raw()
    });
    throw createError(
      response.status,
      error.status_message || 'TMDB API error',
      { cause: error }
    );
  }
  
  try {
    const data = await response.json() as T;
    return data;
  } catch (error) {
    logger.error('Failed to parse TMDB response:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      responseText: await response.text()
    });
    throw createError(502, 'Invalid response from TMDB API');
  }
}

export async function getTMDBMovies(type: 'trending' | 'popular'): Promise<TMDBResponse> {
  try {
    if (!TMDB_API_KEY) {
      logger.error('TMDB API key not configured');
      throw createError(500, 'TMDB API key not configured');
    }

    const endpoint = type === 'trending' 
      ? '/trending/movie/week'
      : '/movie/popular';
      
    logger.info(`Fetching ${type} movies from TMDB`);
    
    const startTime = Date.now();
    const response = await retryFetch(
      `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    const data = await handleTMDBResponse<TMDBResponse>(response);
    
    if (!Array.isArray(data.results)) {
      logger.error('Invalid TMDB response format', { data });
      throw createError(502, 'Invalid response format from TMDB API');
    }
    
    const duration = Date.now() - startTime;
    logger.info(`Successfully fetched ${data.results.length} movies`, {
      duration,
      type,
      totalPages: data.total_pages,
      totalResults: data.total_results
    });
    
    return data;
  } catch (error) {
    logger.error('Error fetching movies:', {
      type,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      } : 'Unknown error'
    });
    throw error;
  }
}

export async function searchTMDBMovies(query: string): Promise<TMDBResponse> {
  try {
    if (!TMDB_API_KEY) {
      logger.error('TMDB API key not configured');
      throw createError(500, 'TMDB API key not configured');
    }

    logger.info(`Searching movies with query: ${query}`);
    
    const startTime = Date.now();
    const response = await retryFetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    const data = await handleTMDBResponse<TMDBResponse>(response);
    
    if (!Array.isArray(data.results)) {
      logger.error('Invalid TMDB search response format', { data });
      throw createError(502, 'Invalid response format from TMDB API');
    }

    const duration = Date.now() - startTime;
    logger.info(`Found ${data.results.length} movies matching query`, {
      duration,
      query,
      totalPages: data.total_pages,
      totalResults: data.total_results
    });
    
    return data;
  } catch (error) {
    logger.error('Error searching movies:', {
      query,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      } : 'Unknown error'
    });
    throw error;
  }
}

export async function getMovieDetails(id: string | number): Promise<TMDBMovie> {
  try {
    if (!TMDB_API_KEY) {
      logger.error('TMDB API key not configured');
      throw createError(500, 'TMDB API key not configured');
    }

    logger.info(`Fetching details for movie ID: ${id}`);
    
    const startTime = Date.now();
    const response = await retryFetch(
      `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    const movie = await handleTMDBResponse<TMDBMovie>(response);
    
    if (!movie || typeof movie.id !== 'number') {
      logger.error('Invalid movie data received', { movie });
      throw createError(502, 'Invalid movie data received from TMDB API');
    }

    const duration = Date.now() - startTime;
    logger.info(`Successfully fetched movie details`, {
      duration,
      movieId: movie.id,
      title: movie.title
    });
    
    return movie;
  } catch (error) {
    logger.error('Error fetching movie details:', {
      movieId: id,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        cause: error.cause
      } : 'Unknown error'
    });
    throw error;
  }
}
