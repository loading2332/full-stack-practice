import { Body, Controller, Post } from '@nestjs/common';
import { PipelineService } from './pipeline.service';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post('run')
  async runAll(
    @Body()
    body?: {
      scope?: 'repo' | 'pull_request';
      owner?: string;
      repo?: string;
      branch?: string;
      prNumber?: number;
      reason?: string;
    },
  ) {
    if (
      body?.scope === 'pull_request' &&
      body.owner &&
      body.repo &&
      body.prNumber
    ) {
      return this.pipelineService.trigger({
        scope: 'pull_request',
        owner: body.owner,
        repo: body.repo,
        prNumber: body.prNumber,
        reason: body.reason,
      });
    }

    if (body?.scope === 'repo' && body.owner && body.repo) {
      return this.pipelineService.trigger({
        scope: 'repo',
        owner: body.owner,
        repo: body.repo,
        branch: body.branch,
        reason: body.reason,
      });
    }

    return this.pipelineService.runTrackedRepositories(new Date());
  }
}
