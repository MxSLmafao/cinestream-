/**
 * Helper functions for interacting with vidsrc.xyz streaming service
 */

const VIDSRC_BASE_URL = 'https://vidsrc.xyz/embed';

/**
 * Formats a movie ID into a vidsrc.xyz compatible stream URL
 */
export function getStreamUrl(tmdbId: string | number): string {
  return `${VIDSRC_BASE_URL}/movie/${tmdbId}`;
}

/**
 * Enhanced Chromecast configuration with better defaults and error handling
 */
export function getChromecastConfig() {
  return {
    loadingTimeout: 20, // Increased timeout for better reliability
    receiverApplicationId: 'CC1AD845', // Default media receiver
    autoJoinPolicy: 'ORIGIN_SCOPED',
    language: 'en-US',
    resumeSavedSession: true, // Attempt to reconnect to previous session
    androidReceiverCompatible: true,
    suppressResumeByKey: false, // Allow resuming playback position
    maxBitrate: 'auto',
    metadata: {
      metadataType: 'GENERIC',
      title: document.title,
      images: [
        {
          url: window.location.origin + '/CineFlix+.png',
          width: 800,
          height: 450
        }
      ]
    }
  };
}

/**
 * Configures the vidsrc player with required parameters
 */
export function getPlayerConfig(streamUrl: string) {
  return {
    type: 'video',
    sources: [{
      src: streamUrl,
      type: 'application/x-mpegURL'
    }],
    controls: true,
    autoplay: false,
    preload: 'auto',
    responsive: true,
    fluid: true,
    playbackRates: [0.5, 1, 1.5, 2],
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
    },
    html5: {
      nativeTextTracks: false,
      hls: {
        enableLowInitialPlaylist: true,
        smoothQualityChange: true,
        overrideNative: true
      }
    }
  };
}

/**
 * Checks if a stream URL is valid and accessible
 */
export async function validateStreamUrl(streamUrl: string): Promise<boolean> {
  try {
    const response = await fetch(streamUrl, {
      method: 'HEAD'
    });
    return response.ok;
  } catch (error) {
    console.error('Error validating stream URL:', error);
    return false;
  }
}

/**
 * Gets supported video qualities
 */
export function getSupportedQualities(): string[] {
  return ['auto', '1080p', '720p', '480p', '360p'];
}

/**
 * Extracts metadata from vidsrc response
 */
export interface StreamMetadata {
  quality: string;
  duration: number;
  size: number;
  format: string;
}

export async function getStreamMetadata(streamUrl: string): Promise<StreamMetadata | null> {
  try {
    const response = await fetch(streamUrl, {
      method: 'HEAD'
    });
    
    if (!response.ok) return null;

    const headers = response.headers;
    
    return {
      quality: headers.get('x-stream-quality') || 'auto',
      duration: parseInt(headers.get('x-stream-duration') || '0'),
      size: parseInt(headers.get('content-length') || '0'),
      format: headers.get('content-type') || 'application/x-mpegURL'
    };
  } catch (error) {
    console.error('Error getting stream metadata:', error);
    return null;
  }
}

/**
 * Format and handle Chromecast specific errors
 */
export function formatChromecastError(error: any): string {
  if (typeof error === 'string') return error;
  
  // Handle specific Chromecast error codes
  if (error?.code) {
    switch (error.code) {
      case 'session_error':
        return 'Failed to connect to Chromecast device';
      case 'cancel':
        return 'Casting was cancelled';
      case 'timeout':
        return 'Connection to Chromecast timed out';
      case 'load_media_failed':
        return 'Failed to load media on Chromecast';
      default:
        return error.message || 'An error occurred with Chromecast';
    }
  }
  
  return error?.message || 'An unknown Chromecast error occurred';
}
