import { PullRequestReport } from './pull-request-report.entity';
import { RepoReport } from './repo-report.entity';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  it('updates an existing repo report with the same owner/repo/branch/date', async () => {
    const existing = {
      id: 1,
      owner: 'openai',
      repo: 'openai-node',
      branch: 'main',
      date: '2026-04-21',
      score: 70,
    };
    const repoReportRepo = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn(),
      find: jest.fn(),
    };
    const pullRequestReportRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };
    const em = { persistAndFlush: jest.fn() };

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

    expect(repoReportRepo.findOne).toHaveBeenCalledWith({
      owner: 'openai',
      repo: 'openai-node',
      branch: 'main',
      date: '2026-04-21',
    });
    expect(em.persistAndFlush).toHaveBeenCalledWith({
      id: 1,
      owner: 'openai',
      repo: 'openai-node',
      branch: 'main',
      date: '2026-04-21',
      score: 90,
    });
    expect(result).toEqual({
      id: 1,
      owner: 'openai',
      repo: 'openai-node',
      branch: 'main',
      date: '2026-04-21',
      score: 90,
    });
  });

  it('creates a new pull request report when no existing report matches', async () => {
    const created = {
      owner: 'openai',
      repo: 'openai-node',
      prNumber: 123,
      date: '2026-04-21',
      score: 82,
    } satisfies Partial<PullRequestReport>;
    const repoReportRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };
    const pullRequestReportRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue(created),
      find: jest.fn(),
    };
    const em = { persistAndFlush: jest.fn() };

    const service = new ReportsService(
      repoReportRepo as never,
      pullRequestReportRepo as never,
      em as never,
    );

    const result = await service.savePullRequestReport(created);

    expect(pullRequestReportRepo.findOne).toHaveBeenCalledWith({
      owner: 'openai',
      repo: 'openai-node',
      prNumber: 123,
      date: '2026-04-21',
    });
    expect(pullRequestReportRepo.create).toHaveBeenCalledWith(created);
    expect(em.persistAndFlush).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });
});
