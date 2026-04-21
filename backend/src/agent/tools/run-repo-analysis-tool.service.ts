import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { AnalysisService } from '../../analysis/analysis.service';
import { GithubSyncService } from '../../github-sync/github-sync.service';

@Injectable()
export class RunRepoAnalysisToolService {
  readonly tool;

  constructor(
    private readonly githubSyncService: GithubSyncService,
    private readonly analysisService: AnalysisService,
  ) {
    this.tool = tool(
      async ({ owner, repo, branch }) => {
        const snapshot = await this.githubSyncService.fetchRepoSnapshot(
          owner,
          repo,
          branch,
        );
        const result = this.analysisService.runRepoAnalysis(snapshot);
        return JSON.stringify(result);
      },
      {
        name: 'run_repo_analysis',
        description:
          '对 GitHub 仓库运行健康诊断，输出健康分、问题列表和 quick wins。',
        schema: z.object({
          owner: z.string().describe('仓库 owner'),
          repo: z.string().describe('仓库名'),
          branch: z.string().optional().describe('目标分支，默认 main'),
        }),
      },
    );
  }
}
