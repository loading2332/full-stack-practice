import { Controller, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async getReports(
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    return this.reportsService.getReports(limit);
  }

  @Get('latest')
  async getLatestReports() {
    return this.reportsService.getLatestReports();
  }

  @Get('trend')
  async getDailyTrend(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    return this.reportsService.getDailyTrend(days);
  }

  @Get('by-date')
  async getReportsByDate(@Query('date') date: string) {
    return this.reportsService.getReportsByDate(date);
  }
}
