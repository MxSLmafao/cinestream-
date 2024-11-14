import { useEffect } from "react";
import { useLocation } from "wouter";
import useSWR from "swr";
import { MovieGrid } from "@/components/MovieGrid";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import type { Movie } from "@/components/MovieGrid";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { data, error, isLoading } = useSWR<{ results: Movie[] }>('/api/movies/trending', async (url) => {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.details || error.error || 'Failed to load movies');
    }
    return res.json();
  });
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLocation('/');
    }
  }, [setLocation]);

  if (isLoading) return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="animate-pulse">Loading movies...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-destructive">
        {error instanceof Error ? error.message : 'Failed to load movies'}
      </div>
    </div>
  );

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
        <h2 className="text-xl font-semibold mb-4">Trending Now</h2>
        <MovieGrid movies={data?.results || []} />
      </main>
    </div>
  );
}
