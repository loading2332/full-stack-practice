import { ConfigService } from '@nestjs/config';
import { PipelineService } from './pipeline.service';

describe('PipelineService', () => {
  const githubSyncService = {
    fetchRepoSnapshot: jest.fn(),
    fetchPullRequestSnapshot: jest.fn(),
    discoverTrackedRepositories: jest.fn(),
  };
  const analysisService = {
    runRepoAnalysis: jest.fn(),
    runPullRequestAnalysis: jest.fn(),
  };
  const feishuService = {
    sendRepoReportCard: jest.fn(),
    sendPullRequestReportCard: jest.fn(),
  };
  const reportsService = {
    saveRepoReport: jest.fn(),
    savePullRequestReport: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs the repo pipeline and stores a repo report', async () => {
    githubSyncService.fetchRepoSnapshot.mockResolvedValue({
      owner: 'openai',
      repo: 'openai-node',
      branch: 'main',
      defaultBranch: 'main',
      openIssueCount: 10,
      openPullRequestCount: 3,
      recentWorkflowRuns: [],
      recentCommits: [],
      languages: { TypeScript: 100 },
      repoMeta: { stars: 1, forks: 1, watchers: 1, visibility: 'public' },
    });
    analysisService.runRepoAnalysis.mockReturnValue({
      score: 84,
      grade: 'B',
      summaryZh: '仓库整体健康良好',
      checksTotal: 8,
      checksEvaluated: 8,
      findings: [],
      quickWins: [],
      categoryScores: {},
      snapshotMeta: {},
    });
    reportsService.saveRepoReport.mockResolvedValue({ score: 84 });

    const service = new PipelineService(
      githubSyncService as never,
      analysisService as never,
      feishuService as never,
      reportsService as never,
      configService,
    );

    const result = await service.runForRepo('openai', 'openai-node', 'main');

    expect(githubSyncService.fetchRepoSnapshot).toHaveBeenCalledWith(
      'openai',
      'openai-node',
      'main',
    );
    expect(analysisService.runRepoAnalysis).toHaveBeenCalled();
    expect(reportsService.saveRepoReport).toHaveBeenCalled();
    expect(feishuService.sendRepoReportCard).toHaveBeenCalled();
    expect(result).toEqual({ score: 84 });
  });

  it('runs the pull request pipeline and stores a pull request report', async () => {
    githubSyncService.fetchPullRequestSnapshot.mockResolvedValue({
      owner: 'openai',
      repo: 'openai-node',
      prNumber: 123,
      title: 'feat: improve pipeline',
      body: 'body',
      state: 'open',
      baseBranch: 'main',
      headBranch: 'feature/test',
      additions: 100,
      deletions: 20,
      changedFiles: [],
      commits: [],
      reviews: [],
      checkRuns: [],
    });
    analysisService.runPullRequestAnalysis.mockReturnValue({
      score: 76,
      grade: 'B',
      summaryZh: 'PR 风险中等',
      checksTotal: 10,
      checksEvaluated: 9,
      findings: [],
      quickWins: [],
      categoryScores: {},
      riskFiles: ['backend/src/pipeline/pipeline.service.ts'],
      ciSummary: { total: 2, failed: 1, passed: 1 },
      snapshotMeta: {},
    });
    reportsService.savePullRequestReport.mockResolvedValue({ score: 76 });

    const service = new PipelineService(
      githubSyncService as never,
      analysisService as never,
      feishuService as never,
      reportsService as never,
      configService,
    );

    const result = await service.runForPullRequest(
      'openai',
      'openai-node',
      123,
    );

    expect(githubSyncService.fetchPullRequestSnapshot).toHaveBeenCalledWith(
      'openai',
      'openai-node',
      123,
    );
    expect(analysisService.runPullRequestAnalysis).toHaveBeenCalled();
    expect(reportsService.savePullRequestReport).toHaveBeenCalled();
    expect(feishuService.sendPullRequestReportCard).toHaveBeenCalled();
    expect(result).toEqual({ score: 76 });
  });

  it('processes tracked repositories in batches', async () => {
    githubSyncService.discoverTrackedRepositories.mockResolvedValue([
      { owner: 'openai', repo: 'openai-node', branch: 'main' },
      { owner: 'vercel', repo: 'next.js', branch: 'canary' },
    ]);

    const service = new PipelineService(
      githubSyncService as never,
      analysisService as never,
      feishuService as never,
      reportsService as never,
      configService,
    );
    jest
      .spyOn(service, 'runForRepo')
      .mockImplementation(async (_owner, repo) => {
        if (repo === 'next.js') {
          throw new Error('boom');
        }
        return { score: 82 } as never;
      });

    const result = await service.runTrackedRepositories(
      new Date('2026-04-21T00:00:00.000Z'),
    );

    expect(result).toEqual([
      {
        scope: 'repo',
        owner: 'openai',
        repo: 'openai-node',
        branch: 'main',
        success: true,
        score: 82,
      },
      {
        scope: 'repo',
        owner: 'vercel',
        repo: 'next.js',
        branch: 'canary',
        success: false,
        error: 'boom',
      },
    ]);
  });
});
