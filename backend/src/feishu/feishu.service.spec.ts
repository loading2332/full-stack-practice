import { ConfigService } from '@nestjs/config';
import { FeishuService } from './feishu.service';

describe('FeishuService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns false when Feishu responds with a non-2xx status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('server error'),
    }) as never;

    const service = new FeishuService({
      get: jest.fn().mockReturnValue('https://example.com/webhook'),
    } as unknown as ConfigService);

    const result = await service.sendPullRequestReportCard(
      {
        owner: 'openai',
        repo: 'openai-node',
        prNumber: 123,
        title: 'feat: test',
        additions: 10,
        deletions: 2,
      },
      {
        score: 70,
        grade: 'B',
        findings: [],
        quickWins: [],
        ciSummary: { total: 2, failed: 1, passed: 1 },
      },
    );

    expect(result).toBe(false);
  });

  it('returns true when Feishu responds with success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('ok'),
    }) as never;

    const service = new FeishuService({
      get: jest.fn().mockReturnValue('https://example.com/webhook'),
    } as unknown as ConfigService);

    const result = await service.sendRepoReportCard(
      {
        owner: 'openai',
        repo: 'openai-node',
        branch: 'main',
        openIssueCount: 3,
        openPullRequestCount: 1,
      },
      {
        score: 82,
        grade: 'B',
        checksEvaluated: 4,
        checksTotal: 5,
        categoryScores: {},
        findings: [],
        quickWins: [],
      },
    );

    expect(result).toBe(true);
  });
});
