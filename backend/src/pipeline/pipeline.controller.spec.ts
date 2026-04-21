import { BadRequestException } from '@nestjs/common';
import { PipelineController } from './pipeline.controller';

describe('PipelineController', () => {
  it('delegates empty manual execution to tracked repository pipeline', async () => {
    const pipelineService = {
      runTrackedRepositories: jest
        .fn()
        .mockResolvedValue([
          { scope: 'repo', repo: 'openai-node', success: true, score: 80 },
        ]),
      trigger: jest.fn(),
    };

    const controller = new PipelineController(pipelineService as never);

    const result = await controller.runAll();

    expect(pipelineService.runTrackedRepositories).toHaveBeenCalledWith(
      expect.any(Date),
    );
    expect(result).toEqual([
      { scope: 'repo', repo: 'openai-node', success: true, score: 80 },
    ]);
  });

  it('delegates PR execution to PipelineService.trigger', async () => {
    const pipelineService = {
      runTrackedRepositories: jest.fn(),
      trigger: jest.fn().mockResolvedValue([
        {
          scope: 'pull_request',
          owner: 'openai',
          repo: 'openai-node',
          prNumber: 123,
          success: true,
          score: 76,
        },
      ]),
    };

    const controller = new PipelineController(pipelineService as never);

    const result = await controller.runAll({
      scope: 'pull_request',
      owner: 'openai',
      repo: 'openai-node',
      prNumber: 123,
      reason: 'manual review',
    });

    expect(pipelineService.trigger).toHaveBeenCalledWith({
      scope: 'pull_request',
      owner: 'openai',
      repo: 'openai-node',
      prNumber: 123,
      reason: 'manual review',
    });
    expect(result).toEqual([
      {
        scope: 'pull_request',
        owner: 'openai',
        repo: 'openai-node',
        prNumber: 123,
        success: true,
        score: 76,
      },
    ]);
  });

  it('rejects malformed pull_request requests instead of running tracked repositories', async () => {
    const pipelineService = {
      runTrackedRepositories: jest.fn(),
      trigger: jest.fn(),
    };

    const controller = new PipelineController(pipelineService as never);

    await expect(
      controller.runAll({
        scope: 'pull_request',
        owner: 'openai',
        repo: 'openai-node',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(pipelineService.runTrackedRepositories).not.toHaveBeenCalled();
    expect(pipelineService.trigger).not.toHaveBeenCalled();
  });
});
