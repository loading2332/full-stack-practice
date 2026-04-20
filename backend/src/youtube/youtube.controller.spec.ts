import { Test, TestingModule } from '@nestjs/testing';
import { YouTubeOAuthService } from './auth/youtube-oauth.service';
import { YouTubeSyncService } from './sync/youtube-sync.service';
import { YouTubeController } from './youtube.controller';

describe('YouTubeController', () => {
  let controller: YouTubeController;
  let oauthService: jest.Mocked<YouTubeOAuthService>;
  let syncService: jest.Mocked<YouTubeSyncService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [YouTubeController],
      providers: [
        {
          provide: YouTubeOAuthService,
          useValue: {
            getAuthorizationUrl: jest.fn(),
            exchangeCodeForTokens: jest.fn(),
          },
        },
        {
          provide: YouTubeSyncService,
          useValue: {
            bootstrapSync: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<YouTubeController>(YouTubeController);
    oauthService = module.get(YouTubeOAuthService);
    syncService = module.get(YouTubeSyncService);
  });

  it('returns a redirect payload for connect', () => {
    oauthService.getAuthorizationUrl.mockReturnValue(
      'https://accounts.google.com/o/oauth2/v2/auth?state=youtube-connect',
    );

    expect(controller.connect()).toEqual({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?state=youtube-connect',
    });
    expect(oauthService.getAuthorizationUrl).toHaveBeenCalledWith(
      'youtube-connect',
    );
  });

  it('exchanges code and returns bootstrap sync result from callback', async () => {
    const tokens = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expiry_date: 123,
    };

    const syncResult = {
      channel: {
        channelId: 'channel-1',
        title: 'Demo Channel',
        description: null,
        customUrl: null,
        uploadsPlaylistId: 'uploads-1',
        thumbnailUrl: null,
        subscriberCount: 100,
        videoCount: 3,
        viewCount: 5000,
      },
      videos: [],
      channelDailyMetrics: [],
    };

    oauthService.exchangeCodeForTokens.mockResolvedValue(tokens);
    syncService.bootstrapSync.mockResolvedValue(syncResult);

    await expect(controller.callback('oauth-code')).resolves.toEqual({
      tokens,
      result: syncResult,
    });
    expect(oauthService.exchangeCodeForTokens).toHaveBeenCalledWith(
      'oauth-code',
    );
    expect(syncService.bootstrapSync).toHaveBeenCalledWith(tokens);
  });
});
