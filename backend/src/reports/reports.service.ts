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
    const res = await this.em
      .createQueryBuilder(Report, 'r')
      .select('MAX(r.date) as maxDate')
      .execute('get');
    if (!res?.maxDate) {
      return [];
    }

    return this.repo.find({ date: res.maxDate }, { orderBy: { date: 'ASC' } });
  }
}
