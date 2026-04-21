import { Injectable } from '@nestjs/common';
import { tool } from 'langchain';
import { z } from 'zod';
import { FeishuService } from '../../feishu/feishu.service';

@Injectable()
export class FeishuCardToolService {
  readonly tool;

  constructor(private readonly feishuService: FeishuService) {
    this.tool = tool(
      async (input) => {
        const result = await this.feishuService.pushCard({
          title: input.title,
          summary: input.summary,
          repo: input.repo,
        });
        return JSON.stringify(result);
      },
      {
        name: 'feishu_card',
        description:
          '将 GitHub 分析结果摘要推送到飞书群卡片，属于有副作用操作，必须先得到用户确认。',
        schema: z.object({
          title: z.string().describe('飞书卡片标题'),
          summary: z.string().describe('卡片摘要'),
          repo: z.string().optional().describe('相关仓库名'),
        }),
      },
    );
  }
}
