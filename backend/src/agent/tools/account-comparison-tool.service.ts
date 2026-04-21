import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { ReportsService } from '../../reports/reports.service';

@Injectable()
export class AccountComparisonToolService {
  readonly tool;

  constructor(private readonly reportsService: ReportsService) {
    this.tool = tool(
      async (input) => {
        const result = await this.reportsService.compareAccounts(
          input.customerIds,
        );
        return JSON.stringify(result);
      },
      {
        name: 'account_comparison',
        description: '对比多个账户的表现差异，适合横向分析花费、转化和诊断分。',
        schema: z.object({
          customerIds: z
            .array(z.string())
            .min(2)
            .describe('至少两个待对比账户 ID'),
        }),
      },
    );
  }
}
