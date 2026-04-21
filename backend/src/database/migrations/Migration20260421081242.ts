import { Migration } from '@mikro-orm/migrations';

export class Migration20260421081242 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "pull_request_report" ("id" serial primary key, "owner" varchar(255) not null, "repo" varchar(255) not null, "pr_number" int not null, "title" varchar(255) not null, "base_branch" varchar(255) not null, "head_branch" varchar(255) not null, "date" varchar(255) not null, "score" double precision not null, "grade" varchar(255) not null, "summary" varchar(255) null, "checks_total" int null, "checks_evaluated" int null, "findings" jsonb not null, "quick_wins" jsonb null, "category_scores" jsonb null, "risk_files" jsonb null, "ci_summary" jsonb null, "snapshot_meta" jsonb null, "created_at" timestamptz not null);`,
    );

    this.addSql(
      `create table "repo_report" ("id" serial primary key, "owner" varchar(255) not null, "repo" varchar(255) not null, "branch" varchar(255) not null, "date" varchar(255) not null, "score" double precision not null, "grade" varchar(255) not null, "summary" varchar(255) null, "checks_total" int null, "checks_evaluated" int null, "findings" jsonb not null, "quick_wins" jsonb null, "category_scores" jsonb null, "snapshot_meta" jsonb null, "created_at" timestamptz not null);`,
    );

    this.addSql(`drop table if exists "report" cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(
      `create table "report" ("id" serial primary key, "customer_id" varchar(255) not null, "date" varchar(255) not null, "spend" float8 not null, "clicks" int4 not null, "conversions" float8 not null, "impressions" int4 not null, "roas" float8 null, "conversions_value" float8 null, "diagnosis_score" float8 not null, "diagnosis_grade" varchar(255) not null, "checks_total" int4 null, "checks_evaluated" int4 null, "issues" jsonb not null, "quick_wins" jsonb null, "category_scores" jsonb null, "campaign_data" jsonb null, "created_at" timestamptz(6) not null);`,
    );

    this.addSql(`drop table if exists "pull_request_report" cascade;`);

    this.addSql(`drop table if exists "repo_report" cascade;`);
  }
}
