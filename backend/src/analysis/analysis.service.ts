import { Injectable } from '@nestjs/common';
import {
  AnalysisCategory,
  AnalysisFinding,
  AnalysisSeverity,
  AnalysisStatus,
  CATEGORY_WEIGHT,
  PullRequestAnalysisReport,
  PullRequestRule,
  RepoAnalysisReport,
  RepoRule,
  SCORE_TO_GRADE,
  SEVERITY_MULTIPLIER,
  STATUS_SCORE,
} from './analysis.types';
import {
  PullRequestSnapshot,
  RepoSnapshot,
} from '../github-sync/github-sync.types';

const repoRules: RepoRule[] = [
  {
    id: 'R-CI-01',
    title: 'Recent workflow runs are mostly successful',
    titleZh: '近期工作流大多成功',
    category: 'ci_health',
    severity: 'high',
    isQuickWin: true,
    evaluate(snapshot) {
      const failed = snapshot.recentWorkflowRuns.filter(
        (run) => run.conclusion === 'failure',
      ).length;
      if (snapshot.recentWorkflowRuns.length === 0) {
        return createFinding(
          this,
          'na',
          'No workflow runs found',
          '没有工作流数据',
        );
      }
      if (failed === 0) {
        return createFinding(this, 'pass', 'CI looks stable', 'CI 状态稳定');
      }
      if (failed <= 1) {
        return createFinding(
          this,
          'warning',
          'There is a recent failing workflow',
          '最近存在失败的工作流',
        );
      }
      return createFinding(
        this,
        'fail',
        'Multiple recent workflow runs failed',
        '最近有多个工作流失败',
      );
    },
  },
  {
    id: 'R-HEALTH-01',
    title: 'Open pull request queue is manageable',
    titleZh: '未处理 PR 数量可控',
    category: 'repository_health',
    severity: 'medium',
    evaluate(snapshot) {
      if (snapshot.openPullRequestCount <= 5) {
        return createFinding(
          this,
          'pass',
          'PR queue is manageable',
          'PR 队列可控',
        );
      }
      if (snapshot.openPullRequestCount <= 12) {
        return createFinding(
          this,
          'warning',
          'PR queue is growing',
          'PR 队列正在增长',
        );
      }
      return createFinding(
        this,
        'fail',
        'PR queue is overloaded',
        'PR 队列积压严重',
      );
    },
  },
  {
    id: 'R-MAINT-01',
    title: 'Repository has TypeScript as primary language',
    titleZh: '仓库以 TypeScript 为主要语言',
    category: 'maintainability',
    severity: 'low',
    evaluate(snapshot) {
      const topLanguage = Object.entries(snapshot.languages).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0];
      if (!topLanguage) {
        return createFinding(
          this,
          'na',
          'No language data',
          '没有语言分布数据',
        );
      }
      if (topLanguage === 'TypeScript') {
        return createFinding(
          this,
          'pass',
          'Primary language is TypeScript',
          '主要语言为 TypeScript',
        );
      }
      return createFinding(
        this,
        'warning',
        `Primary language is ${topLanguage}`,
        `主要语言为 ${topLanguage}`,
      );
    },
  },
];

const pullRequestRules: PullRequestRule[] = [
  {
    id: 'PR-RISK-01',
    title: 'PR size stays reviewable',
    titleZh: 'PR 大小便于审查',
    category: 'change_risk',
    severity: 'high',
    evaluate(snapshot) {
      const totalChanges = snapshot.additions + snapshot.deletions;
      if (totalChanges <= 300) {
        return createFinding(
          this,
          'pass',
          'PR size is reviewable',
          'PR 规模适中',
        );
      }
      if (totalChanges <= 700) {
        return createFinding(
          this,
          'warning',
          'PR is getting large',
          'PR 体量偏大',
        );
      }
      return createFinding(
        this,
        'fail',
        'PR is too large for safe review',
        'PR 过大，审查风险高',
      );
    },
  },
  {
    id: 'PR-TEST-01',
    title: 'Code changes include tests when needed',
    titleZh: '代码变更包含必要测试',
    category: 'test_gap',
    severity: 'critical',
    isQuickWin: true,
    evaluate(snapshot) {
      const codeFiles = snapshot.changedFiles.filter((file) =>
        /\.(ts|tsx|js|jsx)$/.test(file.filename),
      );
      const testFiles = snapshot.changedFiles.filter((file) =>
        /(\.spec\.|\.test\.)/.test(file.filename),
      );
      if (codeFiles.length === 0) {
        return createFinding(
          this,
          'na',
          'No code file changes',
          '没有代码文件变更',
        );
      }
      if (testFiles.length > 0) {
        return createFinding(
          this,
          'pass',
          'Tests changed with code',
          '代码变更伴随测试更新',
        );
      }
      return createFinding(
        this,
        'fail',
        'Code changes have no accompanying tests',
        '代码改动缺少配套测试',
      );
    },
  },
  {
    id: 'PR-CI-01',
    title: 'Required checks are passing',
    titleZh: '必需检查已通过',
    category: 'ci_health',
    severity: 'critical',
    evaluate(snapshot) {
      if (snapshot.checkRuns.length === 0) {
        return createFinding(this, 'na', 'No checks found', '没有检查结果');
      }
      const failed = snapshot.checkRuns.filter(
        (run) => run.conclusion === 'failure',
      ).length;
      if (failed === 0) {
        return createFinding(
          this,
          'pass',
          'All checks passed',
          '所有检查均已通过',
        );
      }
      return createFinding(
        this,
        'fail',
        'Some checks are failing',
        '存在失败的检查',
      );
    },
  },
  {
    id: 'PR-REVIEW-01',
    title: 'PR has approval progress',
    titleZh: 'PR 已进入评审阶段',
    category: 'review_readiness',
    severity: 'medium',
    isQuickWin: true,
    evaluate(snapshot) {
      const approvals = snapshot.reviews.filter(
        (review) => review.state === 'APPROVED',
      ).length;
      if (approvals > 0) {
        return createFinding(this, 'pass', 'PR has approval', 'PR 已获得批准');
      }
      if (snapshot.reviews.length > 0) {
        return createFinding(
          this,
          'warning',
          'PR has comments but no approval yet',
          'PR 已有评论但尚未批准',
        );
      }
      return createFinding(
        this,
        'fail',
        'PR has not been reviewed yet',
        'PR 尚未进入评审',
      );
    },
  },
];

@Injectable()
export class AnalysisService {
  private readonly repoRules = repoRules;
  private readonly pullRequestRules = pullRequestRules;

  runRepoAnalysis(snapshot: RepoSnapshot): RepoAnalysisReport {
    const allChecks = this.repoRules.map((rule) => rule.evaluate(snapshot));
    const {
      score,
      gradeInfo,
      evaluated,
      skipped,
      categoryScores,
      findings,
      quickWins,
      passed,
    } = summarizeChecks(allChecks);

    return {
      scope: 'repo',
      owner: snapshot.owner,
      repo: snapshot.repo,
      branch: snapshot.branch,
      summary: `Repository ${snapshot.owner}/${snapshot.repo} scored ${score}`,
      summaryZh: `仓库 ${snapshot.owner}/${snapshot.repo} 健康分为 ${score}`,
      score,
      grade: gradeInfo.grade,
      gradeLabel: gradeInfo.label,
      gradeLabelZh: gradeInfo.labelZh,
      checksTotal: allChecks.length,
      checksEvaluated: evaluated.length,
      checksSkipped: skipped.length,
      categoryScores,
      findings,
      quickWins,
      passed,
      allChecks,
      snapshotMeta: {
        openIssueCount: snapshot.openIssueCount,
        openPullRequestCount: snapshot.openPullRequestCount,
        languages: snapshot.languages,
      },
    };
  }

  runPullRequestAnalysis(
    snapshot: PullRequestSnapshot,
  ): PullRequestAnalysisReport {
    const allChecks = this.pullRequestRules.map((rule) =>
      rule.evaluate(snapshot),
    );
    const {
      score,
      gradeInfo,
      evaluated,
      skipped,
      categoryScores,
      findings,
      quickWins,
      passed,
    } = summarizeChecks(allChecks);

    const failedChecks = snapshot.checkRuns.filter(
      (run) => run.conclusion === 'failure',
    ).length;
    const passedChecks = snapshot.checkRuns.filter(
      (run) => run.conclusion === 'success',
    ).length;

    return {
      scope: 'pull_request',
      owner: snapshot.owner,
      repo: snapshot.repo,
      prNumber: snapshot.prNumber,
      title: snapshot.title,
      summary: `PR #${snapshot.prNumber} scored ${score}`,
      summaryZh: `PR #${snapshot.prNumber} 风险分为 ${score}`,
      score,
      grade: gradeInfo.grade,
      gradeLabel: gradeInfo.label,
      gradeLabelZh: gradeInfo.labelZh,
      checksTotal: allChecks.length,
      checksEvaluated: evaluated.length,
      checksSkipped: skipped.length,
      categoryScores,
      findings,
      quickWins,
      passed,
      allChecks,
      riskFiles: snapshot.changedFiles
        .filter(
          (file) => file.changes >= 80 || file.filename.includes('pipeline'),
        )
        .map((file) => file.filename),
      ciSummary: {
        total: snapshot.checkRuns.length,
        failed: failedChecks,
        passed: passedChecks,
      },
      snapshotMeta: {
        additions: snapshot.additions,
        deletions: snapshot.deletions,
        baseBranch: snapshot.baseBranch,
        headBranch: snapshot.headBranch,
      },
    };
  }
}

function createFinding(
  rule: {
    id: string;
    title: string;
    titleZh: string;
    category: AnalysisCategory;
    severity: AnalysisSeverity;
    isQuickWin?: boolean;
  },
  status: AnalysisStatus,
  message: string,
  messageZh: string,
): AnalysisFinding {
  return {
    ruleId: rule.id,
    status,
    title: rule.title,
    titleZh: rule.titleZh,
    category: rule.category,
    severity: rule.severity,
    message,
    messageZh,
    isQuickWin: rule.isQuickWin,
  };
}

function summarizeChecks(allChecks: AnalysisFinding[]) {
  const evaluated = allChecks.filter((check) => check.status !== 'na');
  const skipped = allChecks.filter((check) => check.status === 'na');

  let numerator = 0;
  let denominator = 0;
  for (const check of evaluated) {
    const sevWeight = SEVERITY_MULTIPLIER[check.severity];
    const catWeight = CATEGORY_WEIGHT[check.category];
    const combinedWeight = sevWeight * catWeight;
    denominator += combinedWeight;
    numerator += STATUS_SCORE[check.status] * combinedWeight;
  }

  const score =
    denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 100;
  const gradeInfo =
    SCORE_TO_GRADE.find((threshold) => score >= threshold.min)?.grade ??
    SCORE_TO_GRADE[SCORE_TO_GRADE.length - 1].grade;

  const categoryScores = Object.fromEntries(
    Object.entries(CATEGORY_WEIGHT).map(([category, weight]) => {
      const categoryChecks = evaluated.filter(
        (check) => check.category === category,
      );
      if (categoryChecks.length === 0) {
        return [category, { score: 100, grade: 'A', weight }];
      }

      const categoryNumerator = categoryChecks.reduce((sum, check) => {
        return (
          sum + STATUS_SCORE[check.status] * SEVERITY_MULTIPLIER[check.severity]
        );
      }, 0);
      const categoryDenominator = categoryChecks.reduce((sum, check) => {
        return sum + SEVERITY_MULTIPLIER[check.severity];
      }, 0);
      const categoryScore =
        categoryDenominator > 0
          ? Math.round((categoryNumerator / categoryDenominator) * 1000) / 10
          : 100;

      const categoryGrade =
        SCORE_TO_GRADE.find((threshold) => categoryScore >= threshold.min)
          ?.grade.grade ?? 'F';

      return [category, { score: categoryScore, grade: categoryGrade, weight }];
    }),
  );

  const findings = evaluated
    .filter((check) => check.status !== 'pass')
    .sort(
      (a, b) =>
        SEVERITY_MULTIPLIER[b.severity] - SEVERITY_MULTIPLIER[a.severity],
    );
  const quickWins = findings.filter((check) => check.isQuickWin);
  const passed = evaluated.filter((check) => check.status === 'pass');

  return {
    score,
    gradeInfo,
    evaluated,
    skipped,
    categoryScores,
    findings,
    quickWins,
    passed,
  };
}
