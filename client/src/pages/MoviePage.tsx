import { useParams, useLocation } from "wouter";
import useSWR from "swr";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { AlertCircle, Cast, Share, Plus, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import type { ErrorInfo } from 'react';
import { useLogger } from "@/hooks/use-logger";

interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
}

interface StreamResponse {
  streamUrl: string;
}

interface APIError {
  error: string;
  status?: number;
  message?: string;
  code?: string;
  timestamp?: string;
}

export default function MoviePage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = localStorage.getItem('token');
  const { logError } = useLogger();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const MAX_RETRIES = 3;
  const [lastError, setLastError] = useState<Error | null>(null);

  useEffect(() => {
    if (!token) {
      setLocation('/');
      return;
    }
  }, [token, setLocation]);

  const handleError = useCallback((error: Error, errorInfo: ErrorInfo) => {
    setLastError(error);
    logError('Movie page error:', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      componentStack: errorInfo.componentStack,
      movieId: id,
      timestamp: new Date().toISOString()
    });
    
    toast({
      title: "Application Error",
      description: error.message || "An unexpected error occurred while loading the movie.",
      variant: "destructive",
    });
  }, [toast, id, logError]);

  const { data: movie, error: movieError, isLoading: movieLoading, mutate: mutateMovie } = useSWR<Movie, APIError>(
    token ? `/api/movies/${id}` : null,
    async (url: string) => {
      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          const error = await res.json() as APIError;
          throw Object.assign(
            new Error(error.message || error.error || 'Failed to load movie'),
            { status: res.status, code: error.code }
          );
        }
        
        const data = await res.json();
        if (!data || typeof data.id !== 'number') {
          throw new Error('Invalid movie data received');
        }

        // Reset error state on successful fetch
        setLastError(null);
        setRetryCount(0);
        setIsRetrying(false);
        
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        logError('Movie fetch error:', {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          movieId: id,
          retryCount,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    },
    {
      onError: (error: APIError) => {
        if (retryCount < MAX_RETRIES) {
          setIsRetrying(true);
          setRetryCount(prev => prev + 1);
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          setTimeout(() => {
            mutateMovie();
          }, delay);
        } else {
          logError('Movie fetch error:', {
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name
            },
            movieId: id,
            retryCount,
            timestamp: new Date().toISOString(),
            retriesExceeded: true
          });
        }
      },
      shouldRetryOnError: (error: APIError) => {
        return retryCount < MAX_RETRIES && (!error.status || error.status >= 500);
      },
      dedupingInterval: 2000
    }
  );

  const { data: stream, error: streamError, isLoading: streamLoading } = useSWR<StreamResponse, APIError>(
    token && movie ? `/api/movies/${id}/stream` : null,
    async (url: string) => {
      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          const error = await res.json() as APIError;
          throw Object.assign(
            new Error(error.message || error.error || 'Failed to load stream'),
            { status: res.status }
          );
        }
        
        const data = await res.json();
        if (!data?.streamUrl) {
          throw new Error('Invalid stream data received');
        }
        
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        logError('Stream fetch error:', {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          movieId: id,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    },
    {
      dedupingInterval: 5000,
      shouldRetryOnError: false,
      onError: (error: APIError) => {
        logError('Stream fetch error:', {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          movieId: id,
          timestamp: new Date().toISOString(),
          streamError: true
        });
      }
    }
  );

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    setLastError(null);
    mutateMovie();
    toast({
      title: "Retrying",
      description: "Attempting to reload movie data...",
    });
  }, [mutateMovie, toast]);

  if (!token) {
    return null;
  }

  if (movieLoading || streamLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-foreground">
            {isRetrying ? 
              `Retry attempt ${retryCount} of ${MAX_RETRIES}...` : 
              'Loading movie...'}
          </div>
        </div>
      </div>
    );
  }

  const error = movieError || streamError || lastError;
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading movie</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{error.message || 'An unexpected error occurred'}</p>
            {retryCount < MAX_RETRIES && !isRetrying && (
              <Button 
                variant="outline" 
                onClick={handleRetry}
                className="w-fit"
              >
                Try again
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => setLocation('/browse')}
              className="w-fit"
            >
              Return to Browse
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!movie || !stream?.streamUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Movie not available</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>The requested movie could not be found or is not available for streaming.</p>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/browse')}
              className="w-fit"
            >
              Return to Browse
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4">
        <ErrorBoundary
          onError={handleError}
          resetCondition={id}
        >
          <div className="aspect-video w-full rounded-lg overflow-hidden mb-4">
            <VideoPlayer 
              url={stream.streamUrl}
              headers={{
                'Authorization': `Bearer ${token}`
              }}
              onError={(error) => {
                logError('Video player error:', {
                  error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                  } : error,
                  movieId: id,
                  timestamp: new Date().toISOString()
                });
                toast({
                  title: "Playback Error",
                  description: error.message || "Failed to play video",
                  variant: "destructive",
                });
              }}
            />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{movie.title}</h1>
            <p className="text-muted-foreground">{movie.overview}</p>
            
            <div className="flex gap-2">
              <Button variant="secondary">
                <Plus className="mr-2 h-4 w-4" />
                Add to Watchlist
              </Button>
              <Button variant="outline">
                <Share className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" className="ml-auto">
                <Cast className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}