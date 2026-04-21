import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { ReportsService } from '../../reports/reports.service';

@Injectable()
export class PrReportQueryToolService {
  readonly tool;

  constructor(private readonly reportsService: ReportsService) {
    this.tool = tool(
      async (input) => {
        const result = await this.reportsService.queryPullRequestReports(input);
        return JSON.stringify(result);
      },
      {
        name: 'pr_report_query',
        description:
          '查询历史 Pull Request 分析报告，适合按 owner、repo、pr 编号或日期筛选。',
        schema: z.object({
          owner: z.string().optional().describe('仓库 owner'),
          repo: z.string().optional().describe('仓库名'),
          prNumber: z.number().int().optional().describe('Pull Request 编号'),
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
