import fetch from 'node-fetch';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function getTMDBMovies(type: 'trending' | 'popular') {
  try {
    const endpoint = type === 'trending' 
      ? '/trending/movie/week'
      : '/movie/popular';
      
    const res = await fetch(
      `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`
    );
    
    if (!res.ok) {
      const error = await res.json();
      console.error('TMDB API error:', error);
      throw new Error(error.message || 'Failed to fetch movies');
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching movies:', error);
    throw error;
  }
}

export async function searchTMDBMovies(query: string) {
  try {
    const res = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${query}`
    );

    if (!res.ok) {
      const error = await res.json();
      console.error('TMDB API error:', error);
      throw new Error(error.message || 'Failed to search movies');
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error searching movies:', error);
    throw error;
  }
}
