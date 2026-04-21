import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { ReportsService } from '../../reports/reports.service';

@Injectable()
export class ReportQueryToolService {
  readonly tool;

  constructor(private readonly reportsService: ReportsService) {
    this.tool = tool(
      async (input) => {
        const result = await this.reportsService.queryReports(input);
        return JSON.stringify(result);
      },
      {
        name: 'report_query',
        description:
          '查询历史日报和诊断报告，适合按日期、账户或条数拉取过去的分析结果。',
        schema: z.object({
          customerId: z.string().optional().describe('筛选账户 ID'),
          date: z.string().optional().describe('筛选日期，格式 YYYY-MM-DD'),
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(30)
            .describe('返回条数'),
        }),
      },
    );
  }
}
