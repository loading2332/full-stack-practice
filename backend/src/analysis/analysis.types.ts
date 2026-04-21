import {
  PullRequestSnapshot,
  RepoSnapshot,
} from '../github-sync/github-sync.types';

export type AnalysisCategory =
  | 'ci_health'
  | 'test_gap'
  | 'change_risk'
  | 'review_readiness'
  | 'maintainability'
  | 'repository_health';

export type AnalysisSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AnalysisStatus = 'pass' | 'warning' | 'fail' | 'na';
export type AnalysisScope = 'repo' | 'pull_request';

export type AnalysisFinding = {
  ruleId: string;
  status: AnalysisStatus;
  title: string;
  titleZh: string;
  category: AnalysisCategory;
  severity: AnalysisSeverity;
  message: string;
  messageZh: string;
  recommendation?: string;
  recommendationZh?: string;
  details?: Record<string, unknown>;
  isQuickWin?: boolean;
};

export type AnalysisCategoryScore = {
  score: number;
  grade: string;
  weight: number;
};

export type AnalysisGradeInfo = {
  grade: string;
  label: string;
  labelZh: string;
};

export type RepoAnalysisReport = {
  scope: 'repo';
  owner: string;
  repo: string;
  branch: string;
  summary: string;
  summaryZh: string;
  score: number;
  grade: string;
  gradeLabel: string;
  gradeLabelZh: string;
  checksTotal: number;
  checksEvaluated: number;
  checksSkipped: number;
  categoryScores: Record<string, AnalysisCategoryScore>;
  findings: AnalysisFinding[];
  quickWins: AnalysisFinding[];
  passed: AnalysisFinding[];
  allChecks: AnalysisFinding[];
  snapshotMeta: Pick<
    RepoSnapshot,
    'openIssueCount' | 'openPullRequestCount' | 'languages'
  >;
};

export type PullRequestAnalysisReport = {
  scope: 'pull_request';
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  summary: string;
  summaryZh: string;
  score: number;
  grade: string;
  gradeLabel: string;
  gradeLabelZh: string;
  checksTotal: number;
  checksEvaluated: number;
  checksSkipped: number;
  categoryScores: Record<string, AnalysisCategoryScore>;
  findings: AnalysisFinding[];
  quickWins: AnalysisFinding[];
  passed: AnalysisFinding[];
  allChecks: AnalysisFinding[];
  riskFiles: string[];
  ciSummary: {
    total: number;
    failed: number;
    passed: number;
  };
  snapshotMeta: Pick<
    PullRequestSnapshot,
    'additions' | 'deletions' | 'baseBranch' | 'headBranch'
  >;
};

export type RepoRule = {
  id: string;
  title: string;
  titleZh: string;
  category: AnalysisCategory;
  severity: AnalysisSeverity;
  isQuickWin?: boolean;
  evaluate: (snapshot: RepoSnapshot) => AnalysisFinding;
};

export type PullRequestRule = {
  id: string;
  title: string;
  titleZh: string;
  category: AnalysisCategory;
  severity: AnalysisSeverity;
  isQuickWin?: boolean;
  evaluate: (snapshot: PullRequestSnapshot) => AnalysisFinding;
};

export const CATEGORY_WEIGHT: Record<AnalysisCategory, number> = {
  ci_health: 0.2,
  test_gap: 0.2,
  change_risk: 0.2,
  review_readiness: 0.15,
  maintainability: 0.15,
  repository_health: 0.1,
};

export const SEVERITY_MULTIPLIER: Record<AnalysisSeverity, number> = {
  critical: 5,
  high: 3,
  medium: 1.5,
  low: 0.5,
};

export const STATUS_SCORE: Record<AnalysisStatus, number> = {
  pass: 1,
  warning: 0.5,
  fail: 0,
  na: 0,
};

export const GRADE_THRESHOLDS: AnalysisGradeInfo[] = [
  { grade: 'A', label: 'Excellent', labelZh: '优秀' },
  { grade: 'B', label: 'Good', labelZh: '良好' },
  { grade: 'C', label: 'Needs Improvement', labelZh: '待改进' },
  { grade: 'D', label: 'Poor', labelZh: '较差' },
  { grade: 'F', label: 'Critical', labelZh: '严重' },
];

export const SCORE_TO_GRADE = [
  { min: 90, grade: GRADE_THRESHOLDS[0] },
  { min: 75, grade: GRADE_THRESHOLDS[1] },
  { min: 60, grade: GRADE_THRESHOLDS[2] },
  { min: 40, grade: GRADE_THRESHOLDS[3] },
  { min: 0, grade: GRADE_THRESHOLDS[4] },
];
