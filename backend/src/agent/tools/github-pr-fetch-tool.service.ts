import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { GithubSyncService } from '../../github-sync/github-sync.service';

@Injectable()
export class GithubPrFetchToolService {
  readonly tool;

  constructor(private readonly githubSyncService: GithubSyncService) {
    this.tool = tool(
      async ({ owner, repo, prNumber }) => {
        const result = await this.githubSyncService.fetchPullRequestSnapshot(
          owner,
          repo,
          prNumber,
        );
        return JSON.stringify(result);
      },
      {
        name: 'github_pr_fetch',
        description:
          '获取 GitHub Pull Request 快照，包括 diff 文件、checks、reviews 和提交信息。',
        schema: z.object({
          owner: z.string().describe('仓库 owner'),
          repo: z.string().describe('仓库名'),
          prNumber: z.number().int().describe('Pull Request 编号'),
        }),
      },
    );
  }
}
