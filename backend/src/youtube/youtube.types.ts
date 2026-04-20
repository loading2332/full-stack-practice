export type YouTubeChannelProfile = {
  channelId: string;
  title: string;
  description: string | null;
  customUrl: string | null;
  uploadsPlaylistId: string;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  viewCount: number | null;
};

export type YouTubeVideoSummary = {
  videoId: string;
  channelId: string;
  title: string;
  description: string | null;
  publishedAt: string;
  durationSeconds: number | null;
  tags: string[];
  privacyStatus: string | null;
  thumbnailUrl: string | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
};

export type YouTubeMetricSnapshot = {
  channelId: string;
  scope: 'channel' | 'video';
  targetId: string;
  date: string;
  views: number | null;
  estimatedMinutesWatched: number | null;
  averageViewDuration: number | null;
  averageViewPercentage: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  subscribersGained: number | null;
  subscribersLost: number | null;
};

export type QueryAnalyticsInput = {
  ids: string;
  startDate: string;
  endDate: string;
  metrics: string[];
  dimensions?: string[];
  filters?: string[];
  sort?: string[];
};

export type BootstrapSyncResult = {
  channel: YouTubeChannelProfile;
  videos: YouTubeVideoSummary[];
  channelDailyMetrics: YouTubeMetricSnapshot[];
};
