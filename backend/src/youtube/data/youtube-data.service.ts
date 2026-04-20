import { Injectable, NotFoundException } from '@nestjs/common';
import { google } from 'googleapis';
import { YOUTUBE_API_PARTS } from '../youtube.constants';
import { YouTubeChannelProfile, YouTubeVideoSummary } from '../youtube.types';

type OAuthClient = InstanceType<typeof google.auth.OAuth2>;

@Injectable()
export class YouTubeDataService {
  private getClient(auth: OAuthClient) {
    return google.youtube({ version: 'v3', auth });
  }

  async getMyChannel(auth: OAuthClient): Promise<YouTubeChannelProfile> {
    const youtube = this.getClient(auth);

    const response = await youtube.channels.list({
      mine: true,
      part: [YOUTUBE_API_PARTS.channel],
      maxResults: 1,
    });

    const item = response.data.items?.[0];
    if (!item) {
      throw new NotFoundException('Current account has no YouTube channel');
    }

    return {
      channelId: item.id ?? '',
      title: item.snippet?.title ?? '',
      description: item.snippet?.description ?? null,
      customUrl: item.snippet?.customUrl ?? null,
      uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? '',
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.default?.url ??
        null,
      subscriberCount: item.statistics?.subscriberCount
        ? Number(item.statistics.subscriberCount)
        : null,
      videoCount: item.statistics?.videoCount
        ? Number(item.statistics.videoCount)
        : null,
      viewCount: item.statistics?.viewCount
        ? Number(item.statistics.viewCount)
        : null,
    };
  }

  async listUploadVideoIds(
    auth: OAuthClient,
    uploadsPlaylistId: string,
    maxResults = 25,
    pageToken?: string,
  ) {
    const youtube = this.getClient(auth);

    const response = await youtube.playlistItems.list({
      playlistId: uploadsPlaylistId,
      pageToken,
      maxResults,
      part: [YOUTUBE_API_PARTS.playlistItem],
    });

    return {
      nextPageToken: response.data.nextPageToken ?? null,
      videoIds:
        response.data.items
          ?.map((item) => item.contentDetails?.videoId)
          .filter((id): id is string => Boolean(id)) ?? [],
    };
  }

  async getVideosByIds(
    auth: OAuthClient,
    channelId: string,
    ids: string[],
  ): Promise<YouTubeVideoSummary[]> {
    if (ids.length === 0) {
      return [];
    }

    const youtube = this.getClient(auth);

    const response = await youtube.videos.list({
      id: ids,
      part: [YOUTUBE_API_PARTS.video],
      maxResults: ids.length,
    });

    return (
      response.data.items?.map((item) => ({
        videoId: item.id ?? '',
        channelId,
        title: item.snippet?.title ?? '',
        description: item.snippet?.description ?? null,
        publishedAt: item.snippet?.publishedAt ?? '',
        durationSeconds: null,
        tags: item.snippet?.tags ?? [],
        privacyStatus: item.status?.privacyStatus ?? null,
        thumbnailUrl:
          item.snippet?.thumbnails?.high?.url ??
          item.snippet?.thumbnails?.default?.url ??
          null,
        viewCount: item.statistics?.viewCount
          ? Number(item.statistics.viewCount)
          : null,
        likeCount: item.statistics?.likeCount
          ? Number(item.statistics.likeCount)
          : null,
        commentCount: item.statistics?.commentCount
          ? Number(item.statistics.commentCount)
          : null,
      })) ?? []
    );
  }
}
