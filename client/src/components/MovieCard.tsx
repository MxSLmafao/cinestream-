import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Link } from "wouter";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
}

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link href={`/movie/${movie.id}`}>
      <Card className="group cursor-pointer hover:scale-105 transition-transform">
        <CardContent className="p-2">
          <AspectRatio ratio={2/3}>
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              className="rounded-md object-cover w-full h-full"
            />
          </AspectRatio>
          <div className="mt-2">
            <h3 className="font-medium truncate">{movie.title}</h3>
            <div className="text-sm text-muted-foreground">
              Rating: {movie.vote_average.toFixed(1)}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
