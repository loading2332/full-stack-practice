import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  const service = new AnalysisService();

  it('returns a repo analysis report with findings and category scores', () => {
    const report = service.runRepoAnalysis({
      owner: 'openai',
      repo: 'openai-node',
      branch: 'main',
      defaultBranch: 'main',
      openIssueCount: 12,
      openPullRequestCount: 8,
      recentWorkflowRuns: [
        { name: 'CI', status: 'completed', conclusion: 'failure' },
        { name: 'Lint', status: 'completed', conclusion: 'success' },
      ],
      recentCommits: [],
      languages: { TypeScript: 80, CSS: 20 },
      repoMeta: { stars: 1, forks: 1, watchers: 1, visibility: 'public' },
    });

    expect(report.scope).toBe('repo');
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.categoryScores.ci_health).toBeDefined();
  });

  it('returns a pull request analysis report with risk files and ci summary', () => {
    const report = service.runPullRequestAnalysis({
      owner: 'openai',
      repo: 'openai-node',
      prNumber: 123,
      title: 'feat: improve pipeline',
      body: 'body',
      state: 'open',
      baseBranch: 'main',
      headBranch: 'feature/test',
      additions: 400,
      deletions: 120,
      changedFiles: [
        {
          filename: 'backend/src/pipeline/pipeline.service.ts',
          status: 'modified',
          additions: 100,
          deletions: 20,
          changes: 120,
          patch: 'patch',
        },
      ],
      commits: [],
      reviews: [],
      checkRuns: [{ name: 'CI', status: 'completed', conclusion: 'failure' }],
    });

    expect(report.scope).toBe('pull_request');
    expect(report.riskFiles).toContain(
      'backend/src/pipeline/pipeline.service.ts',
    );
    expect(report.ciSummary.failed).toBe(1);
  });
});
