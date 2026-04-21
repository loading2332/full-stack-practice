import { BadRequestException } from '@nestjs/common';
import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  it('delegates repo scope queries to repo reports', async () => {
    const reportsService = {
      queryRepoReports: jest.fn().mockResolvedValue([{ id: 1 }]),
      queryPullRequestReports: jest.fn(),
      getLatestRepoReports: jest.fn(),
      getLatestPullRequestReports: jest.fn(),
    };
    const controller = new ReportsController(reportsService as never);

    const result = await controller.getReports(20, 'repo');

    expect(reportsService.queryRepoReports).toHaveBeenCalledWith({ limit: 20 });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('rejects an unknown scope value', async () => {
    const reportsService = {
      queryRepoReports: jest.fn(),
      queryPullRequestReports: jest.fn(),
      getLatestRepoReports: jest.fn(),
      getLatestPullRequestReports: jest.fn(),
    };
    const controller = new ReportsController(reportsService as never);

    await expect(controller.getReports(20, 'weird')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
