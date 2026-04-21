import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { DiagnosisService } from '../../diagnosis/diagnosis.service';

@Injectable()
export class OptimizationAdviceToolService {
  readonly tool;

  constructor(private readonly diagnosisService: DiagnosisService) {
    this.tool = tool(
      async (input) => {
        const result = await this.diagnosisService.getOptimizationAdvice(input);
        return JSON.stringify(result);
      },
      {
        name: 'optimization_advice',
        description: '基于诊断结果生成优化建议和优先级排序。',
        schema: z.object({
          customerId: z.string().describe('要生成建议的账户 ID'),
          focus: z
            .string()
            .optional()
            .describe('关注方向，例如 cost、conversion、tracking'),
        }),
      },
    );
  }
}
