import fetch from 'node-fetch';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function getTMDBMovies(type: 'trending' | 'popular') {
  const endpoint = type === 'trending' 
    ? '/trending/movie/week'
    : '/movie/popular';
    
  const res = await fetch(
    `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`
  );
  return res.json();
}

export async function searchTMDBMovies(query: string) {
  const res = await fetch(
    `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${query}`
  );
  return res.json();
}
