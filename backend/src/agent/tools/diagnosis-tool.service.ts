import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { DiagnosisService } from '../../diagnosis/diagnosis.service';

@Injectable()
export class DiagnosisToolService {
  readonly tool;

  constructor(private readonly diagnosisService: DiagnosisService) {
    this.tool = tool(
      async (input) => {
        const result = await this.diagnosisService.runDiagnosis(input);
        return JSON.stringify(result);
      },
      {
        name: 'run_diagnosis',
        description:
          '运行账户健康诊断，返回诊断分数、等级、问题列表和维度得分。',
        schema: z.object({
          customerId: z.string().describe('要诊断的 Google Ads customer ID'),
          dateRange: z
            .string()
            .default('LAST_7_DAYS')
            .describe('诊断使用的时间范围'),
        }),
      },
    );
  }
}
