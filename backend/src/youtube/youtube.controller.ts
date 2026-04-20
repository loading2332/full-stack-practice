import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { YouTubeOAuthService } from './auth/youtube-oauth.service';
import { YouTubeSyncService } from './sync/youtube-sync.service';

@Controller('youtube')
export class YouTubeController {
  constructor(
    private readonly oauthService: YouTubeOAuthService,
    private readonly syncService: YouTubeSyncService,
  ) {}

  @Get('connect')
  @Redirect()
  connect() {
    const url = this.oauthService.getAuthorizationUrl('youtube-connect');
    return { url };
  }

  @Get('callback')
  async callback(@Query('code') code: string) {
    const tokens = await this.oauthService.exchangeCodeForTokens(code);
    const result = await this.syncService.bootstrapSync(tokens);

    return {
      tokens,
      result,
    };
  }
}
