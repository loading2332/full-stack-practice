import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { ReportsService } from '../../reports/reports.service';

@Injectable()
export class TrendAnalysisToolService {
  readonly tool;

  constructor(private readonly reportsService: ReportsService) {
    this.tool = tool(
      async (input) => {
        const result = await this.reportsService.getTrendAnalysis(input);
        return JSON.stringify(result);
      },
      {
        name: 'trend_analysis',
        description: '分析账户近期趋势变化，例如花费、点击、转化和诊断分走势。',
        schema: z.object({
          customerId: z.string().describe('要分析的账户 ID'),
          days: z.number().int().min(1).max(90).default(7).describe('分析天数'),
        }),
      },
    );
  }
}
