import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { GithubSyncService } from '../github-sync/github-sync.service';
import { AnalysisService } from '../analysis/analysis.service';
import { FeishuService } from '../feishu/feishu.service';
import { ReportsService } from '../reports/reports.service';

type PipelineTriggerInput =
  | {
      scope: 'repo';
      owner: string;
      repo: string;
      branch?: string;
      reason?: string;
    }
  | {
      scope: 'pull_request';
      owner: string;
      repo: string;
      prNumber: number;
      reason?: string;
    };

type PipelineResult =
  | {
      scope: 'repo';
      owner: string;
      repo: string;
      branch: string;
      success: boolean;
      score?: number;
      error?: string;
    }
  | {
      scope: 'pull_request';
      owner: string;
      repo: string;
      prNumber: number;
      success: boolean;
      score?: number;
      error?: string;
    };

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly githubSyncService: GithubSyncService,
    private readonly analysisService: AnalysisService,
    private readonly feishuService: FeishuService,
    private readonly reportsService: ReportsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(process.env.DAILY_REPORT_CRON ?? '0 9 * * *')
  async handleCron() {
    this.logger.log('Cron triggered: running tracked repository analysis');
    await this.runTrackedRepositories();
  }

  async runForRepo(owner: string, repo: string, branch = 'main') {
    this.logger.log(`Running repo pipeline for ${owner}/${repo}@${branch}...`);

    const snapshot = await this.githubSyncService.fetchRepoSnapshot(
      owner,
      repo,
      branch,
    );
    const analysis = this.analysisService.runRepoAnalysis(snapshot);

    const report = await this.reportsService.saveRepoReport({
      owner,
      repo,
      branch,
      date: new Date().toISOString().split('T')[0],
      score: analysis.score,
      grade: analysis.grade,
      summary: analysis.summaryZh,
      checksTotal: analysis.checksTotal,
      checksEvaluated: analysis.checksEvaluated,
      findings: analysis.findings,
      quickWins: analysis.quickWins,
      categoryScores: analysis.categoryScores,
      snapshotMeta: analysis.snapshotMeta,
    });

    try {
      await this.feishuService.sendRepoReportCard(snapshot, analysis);
    } catch (error) {
      this.logger.warn(
        `Feishu repo report push failed for ${owner}/${repo}: ${(error as Error).message}`,
      );
    }

    this.logger.log(
      `Repo pipeline complete for ${owner}/${repo}: score=${analysis.score} grade=${analysis.grade}`,
    );

    return report;
  }

  async runForPullRequest(owner: string, repo: string, prNumber: number) {
    this.logger.log(`Running PR pipeline for ${owner}/${repo}#${prNumber}...`);

    const snapshot = await this.githubSyncService.fetchPullRequestSnapshot(
      owner,
      repo,
      prNumber,
    );
    const analysis = this.analysisService.runPullRequestAnalysis(snapshot);

    const report = await this.reportsService.savePullRequestReport({
      owner,
      repo,
      prNumber,
      title: snapshot.title,
      baseBranch: snapshot.baseBranch,
      headBranch: snapshot.headBranch,
      date: new Date().toISOString().split('T')[0],
      score: analysis.score,
      grade: analysis.grade,
      summary: analysis.summaryZh,
      checksTotal: analysis.checksTotal,
      checksEvaluated: analysis.checksEvaluated,
      findings: analysis.findings,
      quickWins: analysis.quickWins,
      categoryScores: analysis.categoryScores,
      riskFiles: analysis.riskFiles,
      ciSummary: analysis.ciSummary,
      snapshotMeta: analysis.snapshotMeta,
    });

    try {
      await this.feishuService.sendPullRequestReportCard(snapshot, analysis);
    } catch (error) {
      this.logger.warn(
        `Feishu PR report push failed for ${owner}/${repo}#${prNumber}: ${(error as Error).message}`,
      );
    }

    this.logger.log(
      `PR pipeline complete for ${owner}/${repo}#${prNumber}: score=${analysis.score} grade=${analysis.grade}`,
    );

    return report;
  }

  async runTrackedRepositories(date = new Date()) {
    const trackedRepos =
      await this.githubSyncService.discoverTrackedRepositories();
    const concurrency =
      Number(this.configService.get('PIPELINE_CONCURRENCY')) || 3;
    const results: PipelineResult[] = [];

    for (let i = 0; i < trackedRepos.length; i += concurrency) {
      const batch = trackedRepos.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(async ({ owner, repo, branch }) => {
          try {
            const report = await this.runForRepo(owner, repo, branch ?? 'main');
            return {
              scope: 'repo' as const,
              owner,
              repo,
              branch: branch ?? 'main',
              success: true,
              score: report.score,
            };
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : typeof error === 'string'
                  ? error
                  : JSON.stringify(error);
            return {
              scope: 'repo' as const,
              owner,
              repo,
              branch: branch ?? 'main',
              success: false,
              error: message || 'Unknown error',
            };
          }
        }),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            scope: 'repo',
            owner: 'unknown',
            repo: 'unknown',
            branch: 'main',
            success: false,
            error: 'unexpected rejection',
          });
        }
      }
    }

    this.logger.log(
      `Tracked repository pipeline complete for ${date.toISOString()}: ${results.filter((item) => item.success).length}/${results.length} succeeded`,
    );

    return results;
  }

  async trigger(input: PipelineTriggerInput) {
    if (input.reason) {
      this.logger.log(`Pipeline manually triggered: ${input.reason}`);
    }

    if (input.scope === 'pull_request') {
      const report = await this.runForPullRequest(
        input.owner,
        input.repo,
        input.prNumber,
      );
      return [
        {
          scope: 'pull_request' as const,
          owner: input.owner,
          repo: input.repo,
          prNumber: input.prNumber,
          success: true,
          score: report.score,
        },
      ];
    }

    const report = await this.runForRepo(
      input.owner,
      input.repo,
      input.branch ?? 'main',
    );
    return [
      {
        scope: 'repo' as const,
        owner: input.owner,
        repo: input.repo,
        branch: input.branch ?? 'main',
        success: true,
        score: report.score,
      },
    ];
  }
}
