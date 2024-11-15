export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  vote_average: number;
  release_date?: string;
  runtime?: number;
}

export interface TMDBResponse {
  page?: number;
  results: TMDBMovie[];
  total_pages?: number;
  total_results?: number;
}

export interface TMDBError {
  status_message?: string;
  error?: string;
  status_code?: number;
}
