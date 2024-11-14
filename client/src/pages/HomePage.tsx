import { useEffect } from "react";
import { useLocation } from "wouter";
import useSWR from "swr";
import { MovieGrid } from "@/components/MovieGrid";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { data: trending } = useSWR('/api/movies/trending');
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLocation('/');
    }
  }, []);

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
        <MovieGrid movies={trending} />
      </main>
    </div>
  );
}
