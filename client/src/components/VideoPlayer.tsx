import { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-chromecast/dist/videojs-chromecast.css";
import { getChromecastConfig } from "@/lib/vidsrc";

// Import Chromecast plugin
if (typeof window !== 'undefined') {
  require('videojs-chromecast');
}

interface VideoPlayerProps {
  url: string;
}

export function VideoPlayer({ url }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    playerRef.current = videojs(videoRef.current, {
      controls: true,
      fluid: true,
      sources: [{
        src: url,
        type: "application/x-mpegURL"
      }],
      plugins: {
        chromecast: getChromecastConfig()
      },
      controlBar: {
        children: [
          'playToggle',
          'progressControl',
          'volumePanel',
          'qualitySelector',
          'playbackRateMenuButton',
          'ChromecastButton',
          'fullscreenToggle'
        ]
      }
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [url]);

  return (
    <div data-vjs-player>
      <video ref={videoRef} className="video-js vjs-theme-cinema" />
    </div>
  );
}
