import { useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import useSWR from "swr";
import { MovieGrid } from "@/components/MovieGrid";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Movie } from "@/components/MovieGrid";
import { useToast } from "@/hooks/use-toast";

const RETRY_COUNT = 3;

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const retryCountRef = useRef(0);
  
  const { data, error, isLoading, mutate } = useSWR<{ results: Movie[] }>(
    '/api/movies/trending',
    async (url) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to load movies');
        }

        const data = await res.json();
        if (!data?.results) {
          throw new Error('Invalid response format');
        }

        // Reset retry count on successful fetch
        retryCountRef.current = 0;
        return data;
      } catch (err) {
        // Increment retry count
        retryCountRef.current++;
        throw err;
      }
    },
    {
      onError: (err) => {
        console.error('Error loading movies:', err);
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      },
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      shouldRetryOnError: retryCountRef.current < RETRY_COUNT,
    }
  );
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLocation('/');
      return;
    }

    // Cleanup function
    return () => {
      retryCountRef.current = 0;
    };
  }, [setLocation]);

  const handleRetry = useCallback(() => {
    retryCountRef.current = 0;
    mutate();
  }, [mutate]);

  const handleError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('React error boundary caught error:', error, errorInfo);
    toast({
      title: "Application Error",
      description: "An unexpected error occurred. Please try refreshing the page.",
      variant: "destructive",
    });
  }, [toast]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Cinema Stream</h1>
          <div className="flex gap-4">
            <SearchBar />
            <Button 
              variant="outline"
              onClick={() => {
                localStorage.removeItem('token');
                setLocation('/');
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8">
        <ErrorBoundary onError={handleError}>
          <h2 className="text-xl font-semibold mb-4">Trending Now</h2>
          <MovieGrid 
            movies={data?.results || []} 
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
            retryCount={RETRY_COUNT}
          />
        </ErrorBoundary>
      </main>
    </div>
  );
}
