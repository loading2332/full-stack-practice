import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Report } from './reports.entity';
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly repo: EntityRepository<Report>,

    private readonly em: EntityManager,
  ) {}

  async saveReports(data: Partial<Report>): Promise<Report> {
    const entity = await this.em.upsert(Report, data);
    await this.em.flush();

    return entity;
  }

  async getLatestReports(): Promise<Report[]> {
    const res = (await this.em
      .createQueryBuilder(Report, 'r')
      .select('MAX(r.date) as maxDate')
      .execute('get')) as { maxDate?: string } | null;
    if (!res?.maxDate) {
      return [];
    }

    return this.repo.find({ date: res.maxDate }, { orderBy: { date: 'ASC' } });
  }

  async getReports(limit = 30): Promise<Report[]> {
    return this.repo.findAll({
      orderBy: { date: 'DESC', createdAt: 'DESC' },
      limit,
    });
  }

  async getDailyTrend(days = 7) {
    const reports = await this.repo.findAll({
      orderBy: { date: 'DESC' },
      limit: days,
    });

    return [...reports].reverse().map((report) => ({
      date: report.date,
      customerId: report.customerId,
      spend: report.spend,
      clicks: report.clicks,
      conversions: report.conversions,
      diagnosisScore: report.diagnosisScore,
    }));
  }

  async getReportsByDate(date: string): Promise<Report[]> {
    return this.repo.find({ date }, { orderBy: { createdAt: 'DESC' } });
  }

  async getTrendAnalysis(input: { customerId: string; days: number }) {
    const reports = await this.repo.find(
      { customerId: input.customerId },
      {
        orderBy: { date: 'DESC' },
        limit: input.days,
      },
    );

    const ordered = [...reports].reverse();
    return {
      customerId: input.customerId,
      days: input.days,
      trend: ordered.map((report) => ({
        date: report.date,
        spend: report.spend,
        clicks: report.clicks,
        conversions: report.conversions,
        diagnosisScore: report.diagnosisScore,
      })),
    };
  }

  async compareAccounts(customerIds: string[]) {
    const reports = await this.repo.find(
      { customerId: { $in: customerIds } },
      { orderBy: { date: 'DESC', createdAt: 'DESC' } },
    );

    const latestByAccount = new Map<string, Report>();
    for (const report of reports) {
      if (!latestByAccount.has(report.customerId)) {
        latestByAccount.set(report.customerId, report);
      }
    }

    return customerIds.map((customerId) => {
      const report = latestByAccount.get(customerId);
      return {
        customerId,
        spend: report?.spend ?? null,
        clicks: report?.clicks ?? null,
        conversions: report?.conversions ?? null,
        diagnosisScore: report?.diagnosisScore ?? null,
        diagnosisGrade: report?.diagnosisGrade ?? null,
      };
    });
  }

  async queryReports(input: {
    customerId?: string;
    date?: string;
    limit: number;
  }) {
    const where: Record<string, unknown> = {};
    if (input.customerId) {
      where.customerId = input.customerId;
    }
    if (input.date) {
      where.date = input.date;
    }

    const reports = await this.repo.find(where, {
      orderBy: { date: 'DESC', createdAt: 'DESC' },
      limit: input.limit,
    });

    return reports.map((report) => ({
      id: report.id,
      customerId: report.customerId,
      date: report.date,
      spend: report.spend,
      clicks: report.clicks,
      conversions: report.conversions,
      diagnosisScore: report.diagnosisScore,
      diagnosisGrade: report.diagnosisGrade,
    }));
  }
}
