declare module 'videojs-chromecast' {
  import videojs from 'video.js';
  
  export interface ChromecastOptions {
    loadingTimeout?: number;
    receiverApplicationId?: string;
    autoJoinPolicy?: string;
  }
  
  export interface VideoJsPlayerWithChromecast extends videojs.Player {
    chromecast?: () => void;
  }
  
  const plugin: videojs.Plugin;
  export default plugin;
}
