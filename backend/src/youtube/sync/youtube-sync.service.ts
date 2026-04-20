import { Injectable } from '@nestjs/common';
import { YouTubeAnalyticsService } from '../analytics/youtube-analytics.service';
import { YouTubeOAuthService } from '../auth/youtube-oauth.service';
import { YouTubeDataService } from '../data/youtube-data.service';
import { BootstrapSyncResult } from '../youtube.types';

type OAuthTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
};

@Injectable()
export class YouTubeSyncService {
  constructor(
    private readonly oauthService: YouTubeOAuthService,
    private readonly dataService: YouTubeDataService,
    private readonly analyticsService: YouTubeAnalyticsService,
  ) {}

  async bootstrapSync(tokens: OAuthTokens): Promise<BootstrapSyncResult> {
    const auth = this.oauthService.createAuthorizedClient(tokens);
    const channel = await this.dataService.getMyChannel(auth);

    const { videoIds } = await this.dataService.listUploadVideoIds(
      auth,
      channel.uploadsPlaylistId,
      Number(process.env.SYNC_RECENT_VIDEO_LIMIT ?? 25),
    );

    const videos = await this.dataService.getVideosByIds(
      auth,
      channel.channelId,
      videoIds,
    );

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(
      endDate.getDate() -
        Number(process.env.SYNC_DEFAULT_LOOKBACK_DAYS ?? 28) +
        1,
    );

    const channelDailyMetrics =
      await this.analyticsService.getChannelDailyMetrics(
        auth,
        channel.channelId,
        formatDate(startDate),
        formatDate(endDate),
      );

    return {
      channel,
      videos,
      channelDailyMetrics,
    };
  }
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
