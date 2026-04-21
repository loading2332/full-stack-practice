import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PullRequestSnapshot,
  RepoSnapshot,
  TrackedRepository,
} from './github-sync.types';

@Injectable()
export class GithubSyncService {
  constructor(private readonly configService: ConfigService) {}

  async fetchRepoSnapshot(
    owner: string,
    repo: string,
    branch = 'main',
  ): Promise<RepoSnapshot> {
    return {
      owner,
      repo,
      branch,
      defaultBranch: 'main',
      openIssueCount: 12,
      openPullRequestCount: 4,
      recentWorkflowRuns: [
        { name: 'CI', status: 'completed', conclusion: 'success' },
        { name: 'Lint', status: 'completed', conclusion: 'failure' },
      ],
      recentCommits: [
        {
          sha: 'abc123',
          message: 'feat: improve auth flow',
          author: 'didi',
          committedAt: '2026-04-21T06:30:00.000Z',
        },
        {
          sha: 'def456',
          message: 'test: add auth coverage',
          author: 'teammate',
          committedAt: '2026-04-20T11:15:00.000Z',
        },
      ],
      languages: {
        TypeScript: 82,
        CSS: 10,
        SQL: 8,
      },
      repoMeta: {
        stars: 42,
        forks: 6,
        watchers: 11,
        visibility: 'public',
      },
    };
  }

  async fetchPullRequestSnapshot(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PullRequestSnapshot> {
    return {
      owner,
      repo,
      prNumber,
      title: 'feat: improve pipeline and agent workflow',
      body: 'This PR refactors the pipeline and expands diagnosis coverage.',
      state: 'open',
      baseBranch: 'main',
      headBranch: `feature/pr-${prNumber}`,
      additions: 420,
      deletions: 138,
      changedFiles: [
        {
          filename: 'backend/src/pipeline/pipeline.service.ts',
          status: 'modified',
          additions: 110,
          deletions: 28,
          changes: 138,
          patch: '@@ -1,5 +1,8 @@\n+import { Logger } from ...',
        },
        {
          filename: 'backend/src/agent/agent.service.ts',
          status: 'modified',
          additions: 70,
          deletions: 12,
          changes: 82,
          patch: '@@ -20,7 +20,14 @@\n+const tools = ...',
        },
        {
          filename: 'backend/src/reports/reports.service.spec.ts',
          status: 'added',
          additions: 80,
          deletions: 0,
          changes: 80,
          patch: undefined,
        },
      ],
      commits: [
        {
          sha: 'pr123a',
          message: 'refactor: align pipeline behavior',
          author: 'didi',
          committedAt: '2026-04-21T05:00:00.000Z',
        },
        {
          sha: 'pr123b',
          message: 'test: cover report persistence',
          author: 'didi',
          committedAt: '2026-04-21T05:30:00.000Z',
        },
      ],
      reviews: [
        {
          author: 'reviewer-1',
          state: 'COMMENTED',
          submittedAt: '2026-04-21T06:00:00.000Z',
        },
      ],
      checkRuns: [
        { name: 'CI', status: 'completed', conclusion: 'failure' },
        { name: 'Lint', status: 'completed', conclusion: 'success' },
      ],
    };
  }

  async discoverTrackedRepositories(): Promise<TrackedRepository[]> {
    const raw = this.configService.get<string>('GITHUB_TRACKED_REPOSITORIES');
    if (!raw) {
      return [
        { owner: 'openai', repo: 'openai-node', branch: 'main' },
        { owner: 'vercel', repo: 'next.js', branch: 'canary' },
      ];
    }

    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [repoPart, branch] = item.split('#');
        const [owner, repo] = repoPart.split('/');
        return { owner, repo, branch };
      });
  }
}
