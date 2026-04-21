import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
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
    if (body?.scope === 'pull_request') {
      if (!body.owner || !body.repo || body.prNumber === undefined) {
        throw new BadRequestException(
          'pull_request scope requires owner, repo, and prNumber',
        );
      }

      return this.pipelineService.trigger({
        scope: 'pull_request',
        owner: body.owner,
        repo: body.repo,
        prNumber: body.prNumber,
        reason: body.reason,
      });
    }

    if (body?.scope === 'repo') {
      if (!body.owner || !body.repo) {
        throw new BadRequestException('repo scope requires owner and repo');
      }

      return this.pipelineService.trigger({
        scope: 'repo',
        owner: body.owner,
        repo: body.repo,
        branch: body.branch,
        reason: body.reason,
      });
    }

    if (body?.scope) {
      throw new BadRequestException(
        'scope must be either "repo" or "pull_request"',
      );
    }

    return this.pipelineService.runTrackedRepositories(new Date());
  }
}
