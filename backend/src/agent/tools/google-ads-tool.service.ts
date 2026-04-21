import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { GoogleAdsService } from '../../google-ads/google-ads.service';

@Injectable()
export class GoogleAdsToolService {
  readonly tool;

  constructor(private readonly googleAdsService: GoogleAdsService) {
    this.tool = tool(
      async (input) => {
        const result = await this.googleAdsService.fetchAccountData(input);
        return JSON.stringify(result);
      },
      {
        name: 'google_ads_fetch',
        description:
          '拉取 Google Ads 实时投放数据，适合查询账户花费、点击、转化、展示和时间范围汇总。',
        schema: z.object({
          customerId: z.string().optional().describe('Google Ads customer ID'),
          dateRange: z
            .string()
            .default('LAST_7_DAYS')
            .describe('查询时间范围，例如 TODAY、YESTERDAY、LAST_7_DAYS'),
        }),
      },
    );
  }
}
