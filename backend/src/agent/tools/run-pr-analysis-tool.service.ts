import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { AnalysisService } from '../../analysis/analysis.service';
import { GithubSyncService } from '../../github-sync/github-sync.service';

@Injectable()
export class RunPrAnalysisToolService {
  readonly tool;

  constructor(
    private readonly githubSyncService: GithubSyncService,
    private readonly analysisService: AnalysisService,
  ) {
    this.tool = tool(
      async ({ owner, repo, prNumber }) => {
        const snapshot = await this.githubSyncService.fetchPullRequestSnapshot(
          owner,
          repo,
          prNumber,
        );
        const result = this.analysisService.runPullRequestAnalysis(snapshot);
        return JSON.stringify(result);
      },
      {
        name: 'run_pr_analysis',
        description:
          '对 GitHub Pull Request 运行风险诊断，输出健康分、风险文件、CI 概览和 quick wins。',
        schema: z.object({
          owner: z.string().describe('仓库 owner'),
          repo: z.string().describe('仓库名'),
          prNumber: z.number().int().describe('Pull Request 编号'),
        }),
      },
    );
  }
}
