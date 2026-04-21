import { Injectable } from '@nestjs/common';

type TriggerInput = {
  customerIds: string[];
  reason?: string;
};

@Injectable()
export class PipelineService {
  async trigger(input: TriggerInput) {
    return {
      ok: true,
      status: 'triggered',
      runId: 'mock-pipeline-run-id',
      ...input,
    };
  }
}
