import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { GithubSyncService } from '../../github-sync/github-sync.service';

@Injectable()
export class GithubRepoFetchToolService {
  readonly tool;

  constructor(private readonly githubSyncService: GithubSyncService) {
    this.tool = tool(
      async ({ owner, repo, branch }) => {
        const result = await this.githubSyncService.fetchRepoSnapshot(
          owner,
          repo,
          branch,
        );
        return JSON.stringify(result);
      },
      {
        name: 'github_repo_fetch',
        description:
          '获取 GitHub 仓库快照，包括分支、语言分布、issue/PR 数量和最近工作流状态。',
        schema: z.object({
          owner: z.string().describe('仓库 owner'),
          repo: z.string().describe('仓库名'),
          branch: z.string().optional().describe('目标分支，默认 main'),
        }),
      },
    );
  }
}
