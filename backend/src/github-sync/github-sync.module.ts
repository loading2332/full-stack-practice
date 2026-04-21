import { Module } from '@nestjs/common';
import { GithubSyncService } from './github-sync.service';

@Module({
  providers: [GithubSyncService],
  exports: [GithubSyncService],
})
export class GithubSyncModule {}
