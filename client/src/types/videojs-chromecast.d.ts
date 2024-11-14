declare module 'videojs-chromecast' {
  import videojs from 'video.js';
  
  export interface ChromecastOptions {
    loadingTimeout?: number;
    receiverApplicationId?: string;
    autoJoinPolicy?: string;
    language?: string;
    resumeSavedSession?: boolean;
    androidReceiverCompatible?: boolean;
    suppressResumeByKey?: boolean;
    maxBitrate?: string | number;
    metadata?: {
      metadataType: string;
      title: string;
      images: Array<{
        url: string;
        width: number;
        height: number;
      }>;
    };
    customData?: {
      contentType: string;
      mediaUrl: string;
    };
  }
  
  export interface VideoJsPlayerWithChromecast extends videojs.Player {
    chromecast?: {
      (): void;
      stopCasting?: () => void;
    };
  }
  
  const plugin: videojs.Plugin;
  export default plugin;
}
