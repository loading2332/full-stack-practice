# 第 4 章配套代码骨架版

这份文档是 [第4章-对接YouTube-Data-API-与-Analytics-API.md](D:/coding/front-end_proj/adam/docs/第4章-对接YouTube-Data-API-与-Analytics-API.md) 的配套代码骨架。

目标不是一次把所有业务写完，而是先把第 4 章的数据接入层搭起来，同时确保它能顺利衔接：

- 第 5 章诊断引擎
- 第 6 章 Pipeline 编排
- 第 6 章飞书推送
- 第 8 章 Tool 层
- 第 11 章数据页面

所以这一版骨架不是单纯的 YouTube API Demo，而是完整项目闭环的地基。

## 1. 第 4 章完成后的目标

完成这一章后，后端至少要具备下面这些能力：

1. 用户能发起 Google 登录
2. 用户能单独连接自己的 YouTube 频道
3. 后端能拿到频道、视频和 Analytics 指标
4. 后端能把结果装配成统一的数据结构
5. 这些数据结构能继续流向诊断、报告、Pipeline、飞书和 Agent

第 4 章先不追求把所有模块都写完，但你的代码边界必须从一开始就为这些模块留好位置。

## 2. 先安装依赖

第 4 章至少需要补上 `googleapis`：

```bash
pnpm --filter ./backend add googleapis
```

如果后面要正式做 Google 登录，再补：

```bash
pnpm --filter ./backend add passport passport-google-oauth20
pnpm --filter ./backend add -D @types/passport-google-oauth20
```

## 3. 推荐目录结构

在 `backend/src` 下建议逐步整理成：

```text
backend/src/
  auth/
    auth.controller.ts
    auth.module.ts
    auth.service.ts

  youtube/
    youtube.constants.ts
    youtube.types.ts
    youtube.controller.ts
    youtube.module.ts

    auth/
      youtube-oauth.service.ts

    data/
      youtube-data.service.ts

    analytics/
      youtube-analytics.service.ts

    sync/
      youtube-sync.service.ts

    feishu/
      youtube-feishu.service.ts
```

如果你打算同步把实体建起来，再补：

```text
    entities/
      youtube-connection.entity.ts
      youtube-channel.entity.ts
      youtube-video.entity.ts
      youtube-metric-snapshot.entity.ts
```

## 4. 每个文件怎么写

下面按“文件职责 + 最小代码骨架”的方式展开。

### 4.1 `backend/src/youtube/youtube.constants.ts`

职责：

- 定义 OAuth scopes
- 定义常用 `part`
- 定义默认同步参数

建议代码：

```ts
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
```

### 4.2 `backend/src/youtube/youtube.types.ts`

职责：

- 定义平台自己的标准类型
- 不直接扩散 Google 原始响应结构
- 给页面、诊断、报告、Pipeline、飞书和 Agent 统一输入

建议代码：

```ts
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
```

### 4.3 `backend/src/youtube/auth/youtube-oauth.service.ts`

职责：

- 创建 OAuth2 客户端
- 生成授权 URL
- 用 `code` 换 token
- 创建授权后的 Google client

建议代码：

```ts
import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { YOUTUBE_SCOPES } from '../youtube.constants';

@Injectable()
export class YouTubeOAuthService {
  private createOAuthClient(redirectUri?: string) {
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
    return tokens;
  }

  createAuthorizedClient(tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  }) {
    const client = this.createOAuthClient();
    client.setCredentials(tokens);
    return client;
  }
}
```

### 4.4 `backend/src/youtube/data/youtube-data.service.ts`

职责：

- 查询当前授权用户的频道
- 查询 uploads playlist
- 查询视频详情
- 把 Google 资源层响应转换成平台类型

建议代码：

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { YOUTUBE_API_PARTS } from '../youtube.constants';
import { YouTubeChannelProfile, YouTubeVideoSummary } from '../youtube.types';

@Injectable()
export class YouTubeDataService {
  private getClient(auth: OAuth2Client) {
    return google.youtube({ version: 'v3', auth });
  }

  async getMyChannel(auth: OAuth2Client): Promise<YouTubeChannelProfile> {
    const youtube = this.getClient(auth);

    const response = await youtube.channels.list({
      mine: true,
      part: [YOUTUBE_API_PARTS.channel],
      maxResults: 1,
    });

    const item = response.data.items?.[0];
    if (!item) {
      throw new NotFoundException('当前账号下未找到 YouTube 频道');
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
    auth: OAuth2Client,
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
    auth: OAuth2Client,
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
```

说明：

- `durationSeconds` 第 4 章先留 `null`
- 下一步你可以补一个 ISO 8601 duration 解析函数

### 4.5 `backend/src/youtube/analytics/youtube-analytics.service.ts`

职责：

- 统一封装 `reports.query`
- 提供频道日趋势查询
- 提供视频表现排行查询
- 给诊断、报告、飞书和 Agent 共享分析输入

建议代码：

```ts
import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { QueryAnalyticsInput, YouTubeMetricSnapshot } from '../youtube.types';

@Injectable()
export class YouTubeAnalyticsService {
  private getClient(auth: OAuth2Client) {
    return google.youtubeAnalytics({ version: 'v2', auth });
  }

  async queryReport(auth: OAuth2Client, input: QueryAnalyticsInput) {
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
    auth: OAuth2Client,
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
```

### 4.6 `backend/src/youtube/sync/youtube-sync.service.ts`

职责：

- 组合 DataService 和 AnalyticsService
- 输出统一同步结果
- 第 4 章阶段先提供“首次同步”能力
- 第 6 章再扩展成正式 Pipeline

建议代码：

```ts
import { Injectable } from '@nestjs/common';
import { BootstrapSyncResult } from '../youtube.types';
import { YouTubeOAuthService } from '../auth/youtube-oauth.service';
import { YouTubeDataService } from '../data/youtube-data.service';
import { YouTubeAnalyticsService } from '../analytics/youtube-analytics.service';

@Injectable()
export class YouTubeSyncService {
  constructor(
    private readonly oauthService: YouTubeOAuthService,
    private readonly dataService: YouTubeDataService,
    private readonly analyticsService: YouTubeAnalyticsService,
  ) {}

  async bootstrapSync(tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  }): Promise<BootstrapSyncResult> {
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
```

### 4.7 `backend/src/youtube/feishu/youtube-feishu.service.ts`

这一层第 4 章只需要占位，但必须从架构上保留。

职责：

- 把诊断结果转成飞书卡片结构
- 发送同步成功/失败通知
- 发送报告摘要

第 4 章最小占位代码：

```ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class YouTubeFeishuService {
  private readonly logger = new Logger(YouTubeFeishuService.name);

  async sendPlainText(message: string) {
    this.logger.log(`Feishu placeholder: ${message}`);
    return { ok: true };
  }
}
```

第 6 章时，你再把它扩成真正的 webhook 发送服务。

### 4.8 `backend/src/youtube/youtube.controller.ts`

职责：

- 暴露第 4 章最小 HTTP 入口
- 不在 Controller 里写装配逻辑

建议代码：

```ts
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
```

注意：

- 第 4 章教学阶段 callback 里直接返回同步结果，方便调试
- 第 6 章以后应该把 token 入库，把同步动作改成任务触发

### 4.9 `backend/src/youtube/youtube.module.ts`

职责：

- 统一注册第 4 章涉及的所有服务

建议代码：

```ts
import { Module } from '@nestjs/common';
import { YouTubeController } from './youtube.controller';
import { YouTubeOAuthService } from './auth/youtube-oauth.service';
import { YouTubeDataService } from './data/youtube-data.service';
import { YouTubeAnalyticsService } from './analytics/youtube-analytics.service';
import { YouTubeSyncService } from './sync/youtube-sync.service';
import { YouTubeFeishuService } from './feishu/youtube-feishu.service';

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
```

### 4.10 `backend/src/auth/auth.module.ts`

这一章里 `AuthModule` 可以先很薄，只做应用登录占位。

```ts
import { Module } from '@nestjs/common';

@Module({})
export class AuthModule {}
```

等你开始做正式的应用登录，再扩成：

- `AuthController`
- `AuthService`
- `JwtStrategy`
- 用户表与登录态

### 4.11 `backend/src/app.module.ts`

你当前的 [backend/src/app.module.ts](D:/coding/front-end_proj/adam/backend/src/app.module.ts) 还保留了很多未落地模块占位，而且并不能直接编译。

第 4 章阶段建议先收敛成最小可运行版本：

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getNestMikroOrmConfig } from './database/mikro-orm.config';
import { AuthModule } from './auth/auth.module';
import { YouTubeModule } from './youtube/youtube.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MikroOrmModule.forRootAsync({
      useFactory: () => getNestMikroOrmConfig(),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    AuthModule,
    YouTubeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

后续你再逐步补回：

- `ReportsModule`
- `DiagnosisModule`
- `PipelineModule`
- `AgentModule`

## 5. 第 4 章建议的实现顺序

按下面这个顺序写，最稳：

1. 改 [backend/.env.example](D:/coding/front-end_proj/adam/backend/.env.example)
2. 安装 `googleapis`
3. 写 `youtube.constants.ts`
4. 写 `youtube.types.ts`
5. 写 `YouTubeOAuthService`
6. 写 `YouTubeDataService`
7. 写 `YouTubeAnalyticsService`
8. 写 `YouTubeSyncService`
9. 写 `YouTubeFeishuService` 占位
10. 写 `YouTubeController`
11. 写 `YouTubeModule`
12. 收敛 `app.module.ts`
13. 手动访问 `/youtube/connect`

## 6. 第 4 章完成后的自检清单

做到下面这些，才算真正完成第 4 章：

- 能访问 `/youtube/connect` 并跳转到 Google 授权页
- 授权后能正确进入 `/youtube/callback`
- callback 中能拿到 token
- 能查到当前用户的 YouTube 频道
- 能查到最近一批上传视频
- 能查到近 28 天频道日趋势
- 返回结果已经是你自己的平台类型，而不是 Google 原始响应
- 代码结构已经为后续诊断、Pipeline 和飞书推送留好位置

## 7. 第 4 章和后续章节的衔接

这套骨架是为后面的章节服务的：

- 第 5 章：在 `YouTubeMetricSnapshot` 上构建诊断规则
- 第 6 章：把 `bootstrapSync` 扩成正式 Pipeline
- 第 6 章：把诊断结果推送到飞书
- 第 8 章：把查询能力包装成 Agent Tool
- 第 11 章：把标准化数据接到页面

所以第 4 章的标准不是“能查到一点数据”，而是：

> 有没有为后面的诊断、报告、Pipeline、飞书和 Agent 打好统一的数据层。
