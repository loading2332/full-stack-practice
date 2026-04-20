import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class YouTubeFeishuService {
  private readonly logger = new Logger(YouTubeFeishuService.name);

  async sendPlainText(message: string) {
    this.logger.log(`Feishu placeholder: ${message}`);
    return { ok: true };
  }
}
