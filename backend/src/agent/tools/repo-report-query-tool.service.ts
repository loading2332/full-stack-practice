import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { ReportsService } from '../../reports/reports.service';

@Injectable()
export class RepoReportQueryToolService {
  readonly tool;

  constructor(private readonly reportsService: ReportsService) {
    this.tool = tool(
      async (input) => {
        const result = await this.reportsService.queryRepoReports(input);
        return JSON.stringify(result);
      },
      {
        name: 'repo_report_query',
        description:
          '查询历史仓库健康报告，适合按 owner、repo、branch 或日期筛选。',
        schema: z.object({
          owner: z.string().optional().describe('仓库 owner'),
          repo: z.string().optional().describe('仓库名'),
          branch: z.string().optional().describe('分支名'),
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
