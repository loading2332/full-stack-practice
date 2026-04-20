# YouTube Chapter 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为当前后端实现第 4 章最小可运行版本，打通 YouTube OAuth、资源查询、Analytics 查询、首次同步装配、飞书占位和模块接线。

**Architecture:** 使用 `YouTubeOAuthService`、`YouTubeDataService`、`YouTubeAnalyticsService`、`YouTubeSyncService` 和 `YouTubeFeishuService` 形成清晰边界。先用单元测试锁定控制器和同步装配行为，再补最小实现，最后收敛 `AppModule`。

**Tech Stack:** NestJS 11, TypeScript, Jest, googleapis, MikroORM, PostgreSQL

---

### Task 1: Add Chapter 4 Regression Tests

**Files:**

- Create: `backend/src/youtube/youtube.controller.spec.ts`
- Create: `backend/src/youtube/sync/youtube-sync.service.spec.ts`

- [ ] **Step 1: Write the failing controller test**

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { YouTubeController } from '../youtube.controller';
import { YouTubeOAuthService } from '../auth/youtube-oauth.service';
import { YouTubeSyncService } from './youtube-sync.service';
```

- [ ] **Step 2: Write the failing sync service test**

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { YouTubeSyncService } from './youtube-sync.service';
import { YouTubeOAuthService } from '../auth/youtube-oauth.service';
import { YouTubeDataService } from '../data/youtube-data.service';
import { YouTubeAnalyticsService } from '../analytics/youtube-analytics.service';
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
pnpm --filter ./backend test -- youtube.controller.spec.ts youtube-sync.service.spec.ts
```

Expected:

- FAIL because controller and services do not exist yet

- [ ] **Step 4: Commit**

```bash
git add backend/src/youtube/youtube.controller.spec.ts backend/src/youtube/sync/youtube-sync.service.spec.ts
git commit -m "test: add chapter 4 youtube regression tests"
```

### Task 2: Define Chapter 4 Constants and Types

**Files:**

- Create: `backend/src/youtube/youtube.constants.ts`
- Create: `backend/src/youtube/youtube.types.ts`

- [ ] **Step 1: Write the failing import usage by creating minimal references in upcoming services**

```ts
import { YOUTUBE_SCOPES, YOUTUBE_API_PARTS } from '../youtube.constants';
import { BootstrapSyncResult, QueryAnalyticsInput } from '../youtube.types';
```

- [ ] **Step 2: Implement constants**

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
```

- [ ] **Step 3: Implement standard types**

```ts
export type QueryAnalyticsInput = {
  ids: string;
  startDate: string;
  endDate: string;
  metrics: string[];
  dimensions?: string[];
  filters?: string[];
  sort?: string[];
};
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
pnpm --filter ./backend test -- youtube.controller.spec.ts youtube-sync.service.spec.ts
```

Expected:

- Still FAIL, but no longer because constants/types are missing

- [ ] **Step 5: Commit**

```bash
git add backend/src/youtube/youtube.constants.ts backend/src/youtube/youtube.types.ts
git commit -m "feat: add youtube chapter 4 constants and types"
```

### Task 3: Implement OAuth, Data, and Analytics Services

**Files:**

- Create: `backend/src/youtube/auth/youtube-oauth.service.ts`
- Create: `backend/src/youtube/data/youtube-data.service.ts`
- Create: `backend/src/youtube/analytics/youtube-analytics.service.ts`

- [ ] **Step 1: Implement OAuth service**

```ts
import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { YOUTUBE_SCOPES } from '../youtube.constants';
```

- [ ] **Step 2: Implement data service**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
```

- [ ] **Step 3: Implement analytics service**

```ts
import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
pnpm --filter ./backend test -- youtube.controller.spec.ts youtube-sync.service.spec.ts
```

Expected:

- Still FAIL, but only because sync/controller/module are missing

- [ ] **Step 5: Commit**

```bash
git add backend/src/youtube/auth/youtube-oauth.service.ts backend/src/youtube/data/youtube-data.service.ts backend/src/youtube/analytics/youtube-analytics.service.ts
git commit -m "feat: add youtube chapter 4 core services"
```

### Task 4: Implement Sync, Feishu Placeholder, Controller, and Module

**Files:**

- Create: `backend/src/youtube/sync/youtube-sync.service.ts`
- Create: `backend/src/youtube/feishu/youtube-feishu.service.ts`
- Create: `backend/src/youtube/youtube.controller.ts`
- Modify: `backend/src/youtube/youtube.module.ts`

- [ ] **Step 1: Implement sync service**

```ts
import { Injectable } from '@nestjs/common';
import { YouTubeOAuthService } from '../auth/youtube-oauth.service';
import { YouTubeDataService } from '../data/youtube-data.service';
import { YouTubeAnalyticsService } from '../analytics/youtube-analytics.service';
```

- [ ] **Step 2: Implement Feishu placeholder service**

```ts
import { Injectable, Logger } from '@nestjs/common';
```

- [ ] **Step 3: Implement controller**

```ts
import { Controller, Get, Query, Redirect } from '@nestjs/common';
```

- [ ] **Step 4: Implement module**

```ts
import { Module } from '@nestjs/common';
```

- [ ] **Step 5: Run targeted tests**

Run:

```bash
pnpm --filter ./backend test -- youtube.controller.spec.ts youtube-sync.service.spec.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/youtube/sync/youtube-sync.service.ts backend/src/youtube/feishu/youtube-feishu.service.ts backend/src/youtube/youtube.controller.ts backend/src/youtube/youtube.module.ts
git commit -m "feat: add youtube chapter 4 controller sync and module"
```

### Task 5: Repair AppModule for Chapter 4

**Files:**

- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Remove invalid module references and keep chapter 4 minimum imports**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getNestMikroOrmConfig } from './database/mikro-orm.config';
import { YouTubeModule } from './youtube/youtube.module';
```

- [ ] **Step 2: Set imports to the minimum working list**

```ts
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  MikroOrmModule.forRootAsync({
    useFactory: () => getNestMikroOrmConfig(),
  }),
  YouTubeModule,
];
```

- [ ] **Step 3: Run backend build**

Run:

```bash
pnpm --filter ./backend build
```

Expected:

- exit 0

- [ ] **Step 4: Commit**

```bash
git add backend/src/app.module.ts
git commit -m "fix: reduce app module to chapter 4 minimum"
```

### Task 6: Final Verification

**Files:**

- Verify only

- [ ] **Step 1: Run chapter 4 tests**

Run:

```bash
pnpm --filter ./backend test -- youtube.controller.spec.ts youtube-sync.service.spec.ts
```

Expected:

- PASS

- [ ] **Step 2: Run backend build**

Run:

```bash
pnpm --filter ./backend build
```

Expected:

- PASS

- [ ] **Step 3: Check changed files**

Run:

```bash
git status --short
```

Expected:

- Only intended chapter 4 files appear as changed

- [ ] **Step 4: Commit**

```bash
git add backend/src/youtube backend/src/app.module.ts docs/superpowers/specs/2026-04-21-youtube-chapter4-design.md docs/superpowers/plans/2026-04-21-youtube-chapter4-implementation.md
git commit -m "feat: implement youtube chapter 4 backend skeleton"
```
