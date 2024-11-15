import { useParams, useLocation } from "wouter";
import useSWR from "swr";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Cast, Share, Plus } from "lucide-react";
import { useEffect } from "react";

export default function MoviePage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      setLocation('/');
      return;
    }
  }, [token, setLocation]);

  const { data: movie, error: movieError, isLoading: movieLoading } = useSWR(
    token ? `/api/movies/${id}` : null,
    async (url) => {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to load movie');
      }
      return res.json();
    }
  );

  const { data: stream, error: streamError, isLoading: streamLoading } = useSWR(
    token && movie ? `/api/movies/${id}/stream` : null,
    async (url) => {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to load stream');
      }
      return res.json();
    }
  );

  // Add comprehensive loading and error states
  if (!token) {
    return null; // Let useEffect handle redirect
  }

  if (movieLoading || streamLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading movie...</div>
      </div>
    );
  }

  if (movieError || streamError) {
    const error = movieError || streamError;
    console.error('Error loading movie:', error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">
          {error?.message || 'Failed to load movie'}
        </div>
      </div>
    );
  }

  if (!movie || !stream?.streamUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Movie not available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4">
        <div className="aspect-video w-full rounded-lg overflow-hidden mb-4">
          <VideoPlayer 
            url={stream.streamUrl}
            headers={{
              'Authorization': `Bearer ${token}`
            }}
            onError={(error) => {
              console.error('Video player error:', error);
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
      </div>
    </div>
  );
}
