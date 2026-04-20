import { Test, TestingModule } from '@nestjs/testing';
import { YouTubeAnalyticsService } from '../analytics/youtube-analytics.service';
import { YouTubeDataService } from '../data/youtube-data.service';
import { YouTubeOAuthService } from '../auth/youtube-oauth.service';
import { YouTubeSyncService } from './youtube-sync.service';

describe('YouTubeSyncService', () => {
  let service: YouTubeSyncService;
  let oauthService: jest.Mocked<YouTubeOAuthService>;
  let dataService: jest.Mocked<YouTubeDataService>;
  let analyticsService: jest.Mocked<YouTubeAnalyticsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YouTubeSyncService,
        {
          provide: YouTubeOAuthService,
          useValue: {
            createAuthorizedClient: jest.fn(),
          },
        },
        {
          provide: YouTubeDataService,
          useValue: {
            getMyChannel: jest.fn(),
            listUploadVideoIds: jest.fn(),
            getVideosByIds: jest.fn(),
          },
        },
        {
          provide: YouTubeAnalyticsService,
          useValue: {
            getChannelDailyMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<YouTubeSyncService>(YouTubeSyncService);
    oauthService = module.get(YouTubeOAuthService);
    dataService = module.get(YouTubeDataService);
    analyticsService = module.get(YouTubeAnalyticsService);
  });

  it('builds a bootstrap sync payload from OAuth, data, and analytics services', async () => {
    const authClient = { kind: 'authorized-client' };
    const tokens = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expiry_date: 123,
    };
    const channel = {
      channelId: 'channel-1',
      title: 'Demo Channel',
      description: null,
      customUrl: null,
      uploadsPlaylistId: 'uploads-1',
      thumbnailUrl: null,
      subscriberCount: 100,
      videoCount: 3,
      viewCount: 5000,
    };
    const videos = [
      {
        videoId: 'video-1',
        channelId: 'channel-1',
        title: 'First video',
        description: null,
        publishedAt: '2026-04-01T00:00:00Z',
        durationSeconds: null,
        tags: [],
        privacyStatus: 'public',
        thumbnailUrl: null,
        viewCount: 100,
        likeCount: 10,
        commentCount: 5,
      },
    ];
    const metrics = [
      {
        channelId: 'channel-1',
        scope: 'channel' as const,
        targetId: 'channel-1',
        date: '2026-04-01',
        views: 100,
        estimatedMinutesWatched: 50,
        averageViewDuration: 30,
        averageViewPercentage: 45,
        likes: 10,
        comments: 5,
        shares: 1,
        subscribersGained: 2,
        subscribersLost: 0,
      },
    ];

    oauthService.createAuthorizedClient.mockReturnValue(authClient as never);
    dataService.getMyChannel.mockResolvedValue(channel);
    dataService.listUploadVideoIds.mockResolvedValue({
      nextPageToken: null,
      videoIds: ['video-1'],
    });
    dataService.getVideosByIds.mockResolvedValue(videos);
    analyticsService.getChannelDailyMetrics.mockResolvedValue(metrics);

    await expect(service.bootstrapSync(tokens)).resolves.toEqual({
      channel,
      videos,
      channelDailyMetrics: metrics,
    });

    expect(oauthService.createAuthorizedClient).toHaveBeenCalledWith(tokens);
    expect(dataService.getMyChannel).toHaveBeenCalledWith(authClient);
    expect(dataService.listUploadVideoIds).toHaveBeenCalledWith(
      authClient,
      'uploads-1',
      expect.any(Number),
    );
    expect(dataService.getVideosByIds).toHaveBeenCalledWith(
      authClient,
      'channel-1',
      ['video-1'],
    );
    expect(analyticsService.getChannelDailyMetrics).toHaveBeenCalledWith(
      authClient,
      'channel-1',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });
});
