import { InjectRepository } from '@mikro-orm/nestjs';
import { RequiredEntityData } from '@mikro-orm/core';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { PullRequestReport } from './pull-request-report.entity';
import { RepoReport } from './repo-report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(RepoReport)
    private readonly repoReportRepo: EntityRepository<RepoReport>,
    @InjectRepository(PullRequestReport)
    private readonly pullRequestReportRepo: EntityRepository<PullRequestReport>,
    private readonly em: EntityManager,
  ) {}

  async saveRepoReport(data: Partial<RepoReport>): Promise<RepoReport> {
    const existing = await this.repoReportRepo.findOne({
      owner: data.owner,
      repo: data.repo,
      branch: data.branch,
      date: data.date,
    });

    if (existing) {
      Object.assign(existing, data);
      await this.em.persistAndFlush(existing);
      return existing;
    }

    const entity = this.repoReportRepo.create(
      data as RequiredEntityData<RepoReport>,
    );
    await this.em.persistAndFlush(entity);
    return entity;
  }

  async savePullRequestReport(
    data: Partial<PullRequestReport>,
  ): Promise<PullRequestReport> {
    const existing = await this.pullRequestReportRepo.findOne({
      owner: data.owner,
      repo: data.repo,
      prNumber: data.prNumber,
      date: data.date,
    });

    if (existing) {
      Object.assign(existing, data);
      await this.em.persistAndFlush(existing);
      return existing;
    }

    const entity = this.pullRequestReportRepo.create(
      data as RequiredEntityData<PullRequestReport>,
    );
    await this.em.persistAndFlush(entity);
    return entity;
  }

  async getLatestRepoReports(): Promise<RepoReport[]> {
    const res = (await this.em
      .createQueryBuilder(RepoReport, 'r')
      .select('MAX(r.date) as maxDate')
      .execute('get')) as { maxDate?: string } | null;
    if (!res?.maxDate) {
      return [];
    }

    return this.repoReportRepo.find(
      { date: res.maxDate },
      { orderBy: { date: 'ASC' } },
    );
  }

  async getLatestPullRequestReports(): Promise<PullRequestReport[]> {
    const res = (await this.em
      .createQueryBuilder(PullRequestReport, 'p')
      .select('MAX(p.date) as maxDate')
      .execute('get')) as { maxDate?: string } | null;
    if (!res?.maxDate) {
      return [];
    }

    return this.pullRequestReportRepo.find(
      { date: res.maxDate },
      { orderBy: { date: 'ASC' } },
    );
  }

  async queryRepoReports(input: {
    owner?: string;
    repo?: string;
    branch?: string;
    date?: string;
    limit: number;
  }) {
    const where: Record<string, unknown> = {};
    if (input.owner) where.owner = input.owner;
    if (input.repo) where.repo = input.repo;
    if (input.branch) where.branch = input.branch;
    if (input.date) where.date = input.date;

    return this.repoReportRepo.find(where, {
      orderBy: { date: 'DESC', createdAt: 'DESC' },
      limit: input.limit,
    });
  }

  async queryPullRequestReports(input: {
    owner?: string;
    repo?: string;
    prNumber?: number;
    date?: string;
    limit: number;
  }) {
    const where: Record<string, unknown> = {};
    if (input.owner) where.owner = input.owner;
    if (input.repo) where.repo = input.repo;
    if (input.prNumber !== undefined) where.prNumber = input.prNumber;
    if (input.date) where.date = input.date;

    return this.pullRequestReportRepo.find(where, {
      orderBy: { date: 'DESC', createdAt: 'DESC' },
      limit: input.limit,
    });
  }
}
