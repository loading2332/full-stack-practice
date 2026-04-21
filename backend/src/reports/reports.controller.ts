import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ReportsService } from './reports.service';

type ReportScope = 'repo' | 'pull_request';

function parseScope(scope: string | undefined): ReportScope {
  if (!scope || scope === 'repo' || scope === 'pull_request') {
    return (scope ?? 'repo') as ReportScope;
  }

  throw new BadRequestException(
    'scope must be either "repo" or "pull_request"',
  );
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async getReports(
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('scope') scope = 'repo',
  ) {
    const parsedScope = parseScope(scope);

    if (parsedScope === 'pull_request') {
      return this.reportsService.queryPullRequestReports({ limit });
    }

    return this.reportsService.queryRepoReports({ limit });
  }

  @Get('latest')
  async getLatestReports(@Query('scope') scope = 'repo') {
    const parsedScope = parseScope(scope);

    if (parsedScope === 'pull_request') {
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
    const parsedScope = parseScope(scope);

    if (parsedScope === 'pull_request') {
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
