import { PullRequestReport } from './pull-request-report.entity';
import { RepoReport } from './repo-report.entity';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('upserts a repo report using the composite conflict key', async () => {
    const upserted = {
      id: 1,
      owner: 'openai',
      repo: 'openai-node',
      branch: 'main',
      date: '2026-04-21',
      score: 90,
    };
    const repoReportRepo = {
      find: jest.fn(),
    };
    const pullRequestReportRepo = {
      find: jest.fn(),
    };
    const em = {
      upsert: jest.fn().mockResolvedValue(upserted),
    };

    const service = new ReportsService(
      repoReportRepo as never,
      pullRequestReportRepo as never,
      em as never,
    );

    const result = await service.saveRepoReport({
      owner: 'openai',
      repo: 'openai-node',
      branch: 'main',
      date: '2026-04-21',
      score: 90,
    });

    expect(em.upsert).toHaveBeenCalledWith(
      RepoReport,
      {
        owner: 'openai',
        repo: 'openai-node',
        branch: 'main',
        date: '2026-04-21',
        score: 90,
      },
      {
        onConflictFields: ['owner', 'repo', 'branch', 'date'],
      },
    );
    expect(result).toEqual(upserted);
  });

  it('upserts a pull request report using the composite conflict key', async () => {
    const created = {
      owner: 'openai',
      repo: 'openai-node',
      prNumber: 123,
      date: '2026-04-21',
      score: 82,
    } satisfies Partial<PullRequestReport>;
    const repoReportRepo = {
      find: jest.fn(),
    };
    const pullRequestReportRepo = {
      find: jest.fn(),
    };
    const em = {
      upsert: jest.fn().mockResolvedValue(created),
    };

    const service = new ReportsService(
      repoReportRepo as never,
      pullRequestReportRepo as never,
      em as never,
    );

    const result = await service.savePullRequestReport(created);

    expect(em.upsert).toHaveBeenCalledWith(PullRequestReport, created, {
      onConflictFields: ['owner', 'repo', 'prNumber', 'date'],
    });
    expect(result).toEqual(created);
  });
});
