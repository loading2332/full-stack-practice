import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { QueryAnalyticsInput, YouTubeMetricSnapshot } from '../youtube.types';

type OAuthClient = InstanceType<typeof google.auth.OAuth2>;

@Injectable()
export class YouTubeAnalyticsService {
  private getClient(auth: OAuthClient) {
    return google.youtubeAnalytics({ version: 'v2', auth });
  }

  async queryReport(auth: OAuthClient, input: QueryAnalyticsInput) {
    const analytics = this.getClient(auth);

    const response = await analytics.reports.query({
      ids: input.ids,
      startDate: input.startDate,
      endDate: input.endDate,
      metrics: input.metrics.join(','),
      dimensions: input.dimensions?.join(','),
      filters: input.filters?.join(';'),
      sort: input.sort?.join(','),
    });

    return response.data;
  }

  async getChannelDailyMetrics(
    auth: OAuthClient,
    channelId: string,
    startDate: string,
    endDate: string,
  ): Promise<YouTubeMetricSnapshot[]> {
    const data = await this.queryReport(auth, {
      ids: 'channel==MINE',
      startDate,
      endDate,
      dimensions: ['day'],
      metrics: [
        'views',
        'estimatedMinutesWatched',
        'averageViewDuration',
        'averageViewPercentage',
        'likes',
        'comments',
        'shares',
        'subscribersGained',
        'subscribersLost',
      ],
      sort: ['day'],
    });

    const columns = data.columnHeaders?.map((header) => header.name) ?? [];
    const rows = data.rows ?? [];

    return rows.map((row) => {
      const record = Object.fromEntries(
        columns.map((column, index) => [column, row[index]]),
      );

      return {
        channelId,
        scope: 'channel',
        targetId: channelId,
        date: String(record.day ?? ''),
        views: record.views ? Number(record.views) : null,
        estimatedMinutesWatched: record.estimatedMinutesWatched
          ? Number(record.estimatedMinutesWatched)
          : null,
        averageViewDuration: record.averageViewDuration
          ? Number(record.averageViewDuration)
          : null,
        averageViewPercentage: record.averageViewPercentage
          ? Number(record.averageViewPercentage)
          : null,
        likes: record.likes ? Number(record.likes) : null,
        comments: record.comments ? Number(record.comments) : null,
        shares: record.shares ? Number(record.shares) : null,
        subscribersGained: record.subscribersGained
          ? Number(record.subscribersGained)
          : null,
        subscribersLost: record.subscribersLost
          ? Number(record.subscribersLost)
          : null,
      };
    });
  }
}
