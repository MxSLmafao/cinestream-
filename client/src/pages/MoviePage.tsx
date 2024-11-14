import { useParams } from "wouter";
import useSWR from "swr";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Cast, Share, Plus } from "lucide-react";

export default function MoviePage() {
  const { id } = useParams();
  const { data: movie } = useSWR(`/api/movies/${id}`);
  const { data: stream } = useSWR(`/api/movies/${id}/stream`);

  if (!movie) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4">
        <div className="aspect-video w-full rounded-lg overflow-hidden mb-4">
          <VideoPlayer url={stream?.streamUrl} />
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
            <Button variant="outline" className="ml-auto" onClick={() => {
              // This button is just for visual completeness
              // Actual casting is handled by the video.js Chromecast plugin
              console.log('Cast button clicked');
            }}>
              <Cast className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
