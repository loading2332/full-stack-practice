import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { YOUTUBE_SCOPES } from '../youtube.constants';

type OAuthTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
};

type OAuthClient = InstanceType<typeof google.auth.OAuth2>;

@Injectable()
export class YouTubeOAuthService {
  private createOAuthClient(redirectUri?: string): OAuthClient {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri ?? process.env.GOOGLE_YOUTUBE_REDIRECT_URI,
    );
  }

  getAuthorizationUrl(state: string) {
    const client = this.createOAuthClient();

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: YOUTUBE_SCOPES,
      state,
    });
  }

  async exchangeCodeForTokens(code: string) {
    const client = this.createOAuthClient();
    const { tokens } = await client.getToken(code);
    return tokens as OAuthTokens;
  }

  createAuthorizedClient(tokens: OAuthTokens): OAuthClient {
    const client = this.createOAuthClient();
    client.setCredentials(tokens);
    return client;
  }
}
