import { Module } from '@nestjs/common';
import { YouTubeAnalyticsService } from './analytics/youtube-analytics.service';
import { YouTubeOAuthService } from './auth/youtube-oauth.service';
import { YouTubeDataService } from './data/youtube-data.service';
import { YouTubeFeishuService } from './feishu/youtube-feishu.service';
import { YouTubeSyncService } from './sync/youtube-sync.service';
import { YouTubeController } from './youtube.controller';

@Module({
  controllers: [YouTubeController],
  providers: [
    YouTubeOAuthService,
    YouTubeDataService,
    YouTubeAnalyticsService,
    YouTubeSyncService,
    YouTubeFeishuService,
  ],
  exports: [
    YouTubeOAuthService,
    YouTubeDataService,
    YouTubeAnalyticsService,
    YouTubeSyncService,
    YouTubeFeishuService,
  ],
})
export class YouTubeModule {}
