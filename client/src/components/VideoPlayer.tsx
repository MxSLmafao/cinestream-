import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import type { VideoJsPlayerWithChromecast } from "videojs-chromecast";
import "video.js/dist/video-js.css";
import "videojs-chromecast/dist/videojs-chromecast.css";
import { getChromecastConfig } from "@/lib/vidsrc";
import { useToast } from "@/hooks/use-toast";

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
  const [isCasting, setIsCasting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!videoRef.current) return;

    const initPlayer = async () => {
      try {
        // Enhanced Chromecast detection
        const isChromecastSupported = !!(window as any).chrome && 
          !!(window as any).chrome.cast && 
          !!(window as any).chrome.cast.isAvailable;

        setIsChromecastAvailable(isChromecastSupported);

        // Load Chromecast plugin dynamically
        if (isChromecastSupported) {
          try {
            await import('videojs-chromecast');
            console.log('Chromecast plugin loaded successfully');
          } catch (err) {
            console.error('Failed to load Chromecast plugin:', err);
            throw new Error('Failed to initialize Chromecast support');
          }
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
            chromecast: {
              ...getChromecastConfig(),
              customData: {
                // Add custom metadata for Chromecast
                contentType: 'movie',
                mediaUrl: url
              }
            }
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

        // Enhanced error handling
        player.on('error', function() {
          const errorDetails = player.error();
          const errorMessage = errorDetails?.message || 'Video playback error';
          setError(errorMessage);
          toast({
            title: "Playback Error",
            description: errorMessage,
            variant: "destructive"
          });
          onError?.(new Error(errorMessage));
        });

        // Initialize and handle Chromecast if available
        if (isChromecastSupported && player.chromecast) {
          player.chromecast();
          
          // Handle Chromecast state changes
          player.on('chromecastConnected', function() {
            setIsCasting(true);
            toast({
              title: "Chromecast Connected",
              description: "Now casting to your TV",
            });
          });

          player.on('chromecastDisconnected', function() {
            setIsCasting(false);
            toast({
              title: "Chromecast Disconnected",
              description: "Playback resumed on this device",
            });
          });

          player.on('chromecastError', function(error: Error) {
            console.error('Chromecast error:', error);
            toast({
              title: "Chromecast Error",
              description: error.message || 'Failed to connect to Chromecast',
              variant: "destructive"
            });
            onError?.(error);
          });

          // Handle device availability changes
          player.on('chromecastDeviceDetected', function() {
            setIsChromecastAvailable(true);
          });

          player.on('chromecastDeviceLost', function() {
            setIsChromecastAvailable(false);
            if (isCasting) {
              toast({
                title: "Chromecast Disconnected",
                description: "Lost connection to Chromecast device",
                variant: "destructive"
              });
            }
            setIsCasting(false);
          });
        }

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize video player');
        console.error('Error initializing player:', error);
        setError(error.message);
        toast({
          title: "Player Error",
          description: error.message,
          variant: "destructive"
        });
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
        toast({
          title: "Initialization Error",
          description: error.message,
          variant: "destructive"
        });
        onError?.(error);
      })
      .finally(() => setIsLoading(false));

    // Enhanced cleanup
    return () => {
      if (playerRef.current) {
        try {
          // Ensure Chromecast is disconnected
          if (isCasting) {
            playerRef.current.chromecast?.stopCasting();
          }
          playerRef.current.dispose();
        } catch (err) {
          console.error('Error during player cleanup:', err);
        }
        playerRef.current = null;
      }
    };
  }, [url, headers, onError, toast]);

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="animate-pulse">Loading player...</div>
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
      {isCasting && (
        <div className="absolute top-2 right-2 text-sm bg-primary/10 text-primary px-2 py-1 rounded-md">
          Casting to TV
        </div>
      )}
      {!isChromecastAvailable && (
        <div className="absolute top-2 right-2 text-sm text-muted-foreground">
          Chromecast not available
        </div>
      )}
    </div>
  );
}
