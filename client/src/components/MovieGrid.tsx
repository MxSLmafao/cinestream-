import { MovieCard } from "./MovieCard";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCallback, useEffect, useState } from "react";

export interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
}

interface MovieGridProps {
  movies: Movie[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  retryCount?: number;
}

export function MovieGrid({ 
  movies, 
  isLoading, 
  error, 
  onRetry,
  retryCount = 3
}: MovieGridProps) {
  const [autoRetrying, setAutoRetrying] = useState(false);
  const [retries, setRetries] = useState(0);

  const handleRetry = useCallback(() => {
    if (retries < retryCount) {
      setAutoRetrying(true);
      setRetries(prev => prev + 1);
      onRetry?.();
    }
  }, [retries, retryCount, onRetry]);

  useEffect(() => {
    if (error && autoRetrying) {
      const timer = setTimeout(handleRetry, 2000 * (retries + 1)); // Exponential backoff
      return () => clearTimeout(timer);
    }
  }, [error, autoRetrying, handleRetry, retries]);

  useEffect(() => {
    if (!error) {
      setAutoRetrying(false);
      setRetries(0);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading movies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertTitle className="flex items-center gap-2">
          Error loading movies
          {autoRetrying && (
            <RefreshCw className="h-4 w-4 animate-spin" />
          )}
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <p>{error.message}</p>
          {retries < retryCount && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAutoRetrying(true);
                  handleRetry();
                }}
                disabled={autoRetrying}
              >
                {autoRetrying ? 'Retrying...' : 'Retry now'}
              </Button>
              {autoRetrying && (
                <p className="text-sm text-muted-foreground">
                  Attempt {retries + 1} of {retryCount}
                </p>
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (!movies?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <p>No movies found</p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRetry()}
            className="mt-2"
          >
            Refresh
          </Button>
        )}
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
