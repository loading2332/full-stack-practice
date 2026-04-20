import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

type ReportIssue = {
  ruleCode: string;
  title: string;
  severity: string;
  detail: string;
  category: string;
};

type ReportCategoryScore = {
  score: number;
  grade: string;
  weight: number;
};

@Entity()
export class Report {
  @PrimaryKey()
  id!: number;

  @Property()
  customerId!: string;

  @Property()
  date!: string; // YYYY-MM-DD

  @Property()
  spend!: number;

  @Property()
  clicks!: number;

  @Property()
  conversions!: number;

  @Property()
  impressions!: number;

  @Property({ nullable: true })
  roas!: number | null;

  @Property()
  diagnosisScore!: number;

  @Property()
  diagnosisGrade!: string; // A/B/C/D/F

  @Property({ type: 'json' })
  issues!: ReportIssue[];

  @Property({ type: 'json', nullable: true })
  quickWins!: ReportIssue[] | null;

  @Property({ type: 'json', nullable: true })
  categoryScores!: Record<string, ReportCategoryScore> | null;

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;
}
