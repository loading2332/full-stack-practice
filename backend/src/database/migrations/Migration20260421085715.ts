import { Migration } from '@mikro-orm/migrations';

export class Migration20260421085715 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "pull_request_report" add constraint "pull_request_report_owner_repo_pr_number_date_unique" unique ("owner", "repo", "pr_number", "date");`,
    );

    this.addSql(
      `alter table "repo_report" add constraint "repo_report_owner_repo_branch_date_unique" unique ("owner", "repo", "branch", "date");`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "pull_request_report" drop constraint "pull_request_report_owner_repo_pr_number_date_unique";`,
    );

    this.addSql(
      `alter table "repo_report" drop constraint "repo_report_owner_repo_branch_date_unique";`,
    );
  }
}
