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
          '触发完整投放诊断 Pipeline，属于有副作用操作，必须先得到用户确认。',
        schema: z.object({
          customerIds: z
            .array(z.string())
            .min(1)
            .describe('要处理的账户 ID 列表'),
          reason: z.string().optional().describe('触发原因'),
        }),
      },
    );
  }
}
