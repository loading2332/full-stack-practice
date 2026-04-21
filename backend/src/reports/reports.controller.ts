import { Controller, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async getReports(
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('scope') scope = 'repo',
  ) {
    if (scope === 'pull_request') {
      return this.reportsService.queryPullRequestReports({ limit });
    }

    return this.reportsService.queryRepoReports({ limit });
  }

  @Get('latest')
  async getLatestReports(@Query('scope') scope = 'repo') {
    if (scope === 'pull_request') {
      return this.reportsService.getLatestPullRequestReports();
    }

    return this.reportsService.getLatestRepoReports();
  }

  @Get('by-date')
  async getReportsByDate(
    @Query('date') date: string,
    @Query('scope') scope = 'repo',
    @Query('owner') owner?: string,
    @Query('repo') repo?: string,
    @Query('prNumber') prNumber?: string,
  ) {
    if (scope === 'pull_request') {
      return this.reportsService.queryPullRequestReports({
        date,
        owner,
        repo,
        prNumber: prNumber ? Number(prNumber) : undefined,
        limit: 30,
      });
    }

    return this.reportsService.queryRepoReports({
      date,
      owner,
      repo,
      limit: 30,
    });
  }
}
