import { Injectable } from '@nestjs/common';

type PushCardInput = {
  title: string;
  summary: string;
  customerId?: string;
};

@Injectable()
export class FeishuService {
  async pushCard(input: PushCardInput) {
    return {
      ok: true,
      messageId: 'mock-feishu-message-id',
      ...input,
    };
  }
}
