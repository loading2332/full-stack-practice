import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { PipelineService } from '../../pipeline/pipeline.service';

@Injectable()
export class PipelineTriggerToolService {
  readonly tool;

  constructor(private readonly pipelineService: PipelineService) {
    this.tool = tool(
      async (input) => {
        const result = await this.pipelineService.trigger(input);
        return JSON.stringify(result);
      },
      {
        name: 'pipeline_trigger',
        description:
          '触发 GitHub 仓库或 Pull Request 分析 Pipeline，属于有副作用操作，必须先得到用户确认。',
        schema: z.discriminatedUnion('scope', [
          z.object({
            scope: z.literal('repo'),
            owner: z.string().describe('仓库 owner'),
            repo: z.string().describe('仓库名'),
            branch: z.string().optional().describe('目标分支'),
            reason: z.string().optional().describe('触发原因'),
          }),
          z.object({
            scope: z.literal('pull_request'),
            owner: z.string().describe('仓库 owner'),
            repo: z.string().describe('仓库名'),
            prNumber: z.number().int().describe('Pull Request 编号'),
            reason: z.string().optional().describe('触发原因'),
          }),
        ]),
      },
    );
  }
}
