import { ConfigService } from '@nestjs/config';
import { GithubSyncService } from './github-sync.service';

describe('GithubSyncService', () => {
  it('parses tracked repositories from config', async () => {
    const configService = {
      get: jest
        .fn()
        .mockReturnValue('openai/openai-node#main,vercel/next.js#canary'),
    } as unknown as ConfigService;

    const service = new GithubSyncService(configService);
    const result = await service.discoverTrackedRepositories();

    expect(result).toEqual([
      { owner: 'openai', repo: 'openai-node', branch: 'main' },
      { owner: 'vercel', repo: 'next.js', branch: 'canary' },
    ]);
  });

  it('returns a pull request snapshot with diff and checks data', async () => {
    const service = new GithubSyncService({ get: jest.fn() } as never);

    const snapshot = await service.fetchPullRequestSnapshot(
      'openai',
      'openai-node',
      123,
    );

    expect(snapshot.prNumber).toBe(123);
    expect(snapshot.changedFiles.length).toBeGreaterThan(0);
    expect(snapshot.checkRuns.length).toBeGreaterThan(0);
  });
});
