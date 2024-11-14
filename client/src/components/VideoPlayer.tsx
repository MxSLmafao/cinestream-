import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import type { VideoJsPlayerWithChromecast } from "videojs-chromecast";
import "video.js/dist/video-js.css";
import "videojs-chromecast/dist/videojs-chromecast.css";
import { getChromecastConfig } from "@/lib/vidsrc";

interface VideoPlayerProps {
  url: string;
  headers?: Record<string, string>;
  onError?: (error: Error) => void;
}

export function VideoPlayer({ url, headers, onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<VideoJsPlayerWithChromecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChromecastAvailable, setIsChromecastAvailable] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;

    const initPlayer = async () => {
      try {
        // Check if Chrome and Chromecast API are available
        const isChromecastSupported = !!(window as any).chrome && 
          !!(window as any).chrome.cast && 
          !!(window as any).chrome.cast.isAvailable;

        setIsChromecastAvailable(isChromecastSupported);

        // Load Chromecast plugin dynamically
        if (isChromecastSupported) {
          await import('videojs-chromecast');
        }

        if (!videoRef.current) return;

        const player = videojs(videoRef.current, {
          controls: true,
          fluid: true,
          sources: [{
            src: url,
            type: "application/x-mpegURL"
          }],
          plugins: isChromecastSupported ? {
            chromecast: getChromecastConfig()
          } : undefined,
          controlBar: {
            children: [
              'playToggle',
              'progressControl',
              'volumePanel',
              'qualitySelector',
              'playbackRateMenuButton',
              ...(isChromecastSupported ? ['ChromecastButton'] : []),
              'fullscreenToggle'
            ]
          },
          html5: {
            hls: {
              overrideNative: true,
              xhr: {
                beforeRequest: function(options: any) {
                  if (headers) {
                    options.headers = { ...options.headers, ...headers };
                  }
                  return options;
                }
              }
            }
          }
        });

        playerRef.current = player;

        // Handle player errors
        player.on('error', function() {
          const error = new Error(player.error()?.message || 'Video playback error');
          setError(error.message);
          onError?.(error);
        });

        // Initialize Chromecast if available
        if (isChromecastSupported && player.chromecast) {
          player.chromecast();
          
          // Handle Chromecast errors
          player.on('chromecastError', function(error: Error) {
            console.error('Chromecast error:', error);
            onError?.(error);
          });
        }

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize video player');
        console.error('Error initializing player:', error);
        setError(error.message);
        onError?.(error);
      }
    };

    setIsLoading(true);
    setError(null);

    initPlayer()
      .catch(err => {
        const error = err instanceof Error ? err : new Error('Failed to load video player');
        console.error('Error initializing player:', error);
        setError(error.message);
        onError?.(error);
      })
      .finally(() => setIsLoading(false));

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [url, headers, onError]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          Loading player...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 text-destructive">
          {error}
        </div>
      )}
      <div data-vjs-player>
        <video ref={videoRef} className="video-js vjs-theme-cinema" />
      </div>
      {!isChromecastAvailable && (
        <div className="absolute top-2 right-2 text-sm text-muted-foreground">
          Chromecast not available
        </div>
      )}
    </div>
  );
}
