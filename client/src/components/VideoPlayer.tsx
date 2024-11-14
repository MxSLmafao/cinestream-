import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import type { VideoJsPlayerWithChromecast } from "videojs-chromecast";
import "video.js/dist/video-js.css";
import "videojs-chromecast/dist/videojs-chromecast.css";
import { getChromecastConfig } from "@/lib/vidsrc";

interface VideoPlayerProps {
  url: string;
  headers?: Record<string, string>;
}

export function VideoPlayer({ url, headers }: VideoPlayerProps) {
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

        // Initialize Chromecast if available
        if (isChromecastSupported && player.chromecast) {
          player.chromecast();
        }
      } catch (err) {
        console.error('Error initializing player:', err);
        setError('Failed to initialize video player');
        throw err;
      }
    };

    setIsLoading(true);
    setError(null);

    initPlayer()
      .catch(err => {
        console.error('Error initializing player:', err);
        setError('Failed to load video player');
      })
      .finally(() => setIsLoading(false));

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [url, headers]);

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
