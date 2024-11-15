import { MovieCard } from "./MovieCard";

export interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
}

interface MovieGridProps {
  movies: Movie[];
}

export function MovieGrid({ movies }: MovieGridProps) {
  if (!movies?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No movies found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
