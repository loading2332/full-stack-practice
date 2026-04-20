export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

export const YOUTUBE_API_PARTS = {
  channel: 'snippet,contentDetails,statistics',
  playlistItem: 'snippet,contentDetails',
  video: 'snippet,contentDetails,statistics,status',
} as const;

export const DEFAULT_SYNC_RECENT_VIDEO_LIMIT = 25;
export const DEFAULT_SYNC_LOOKBACK_DAYS = 28;
