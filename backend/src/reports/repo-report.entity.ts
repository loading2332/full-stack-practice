import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

type ReportFinding = {
  ruleId: string;
  status: string;
  title: string;
  titleZh: string;
  category: string;
  severity: string;
  message: string;
  messageZh: string;
  recommendation?: string;
  recommendationZh?: string;
  details?: Record<string, unknown>;
  isQuickWin?: boolean;
};

type CategoryScore = {
  score: number;
  grade: string;
  weight: number;
};

@Entity()
@Unique({ properties: ['owner', 'repo', 'branch', 'date'] })
export class RepoReport {
  @PrimaryKey()
  id!: number;

  @Property()
  owner!: string;

  @Property()
  repo!: string;

  @Property()
  branch!: string;

  @Property()
  date!: string;

  @Property({ type: 'double precision' })
  score!: number;

  @Property()
  grade!: string;

  @Property({ nullable: true })
  summary!: string | null;

  @Property({ type: 'integer', nullable: true })
  checksTotal!: number | null;

  @Property({ type: 'integer', nullable: true })
  checksEvaluated!: number | null;

  @Property({ type: 'json' })
  findings!: ReportFinding[];

  @Property({ type: 'json', nullable: true })
  quickWins!: ReportFinding[] | null;

  @Property({ type: 'json', nullable: true })
  categoryScores!: Record<string, CategoryScore> | null;

  @Property({ type: 'json', nullable: true })
  snapshotMeta!: Record<string, unknown> | null;

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;
}
