export type ChangedFile = {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
};

export type CheckRunSnapshot = {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion:
    | 'success'
    | 'failure'
    | 'neutral'
    | 'cancelled'
    | 'timed_out'
    | 'action_required'
    | null;
};

export type ReviewSnapshot = {
  author: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING';
  submittedAt: string;
};

export type CommitSnapshot = {
  sha: string;
  message: string;
  author: string;
  committedAt: string;
};

export type RepoSnapshot = {
  owner: string;
  repo: string;
  branch: string;
  defaultBranch: string;
  openIssueCount: number;
  openPullRequestCount: number;
  recentWorkflowRuns: CheckRunSnapshot[];
  recentCommits: CommitSnapshot[];
  languages: Record<string, number>;
  repoMeta: {
    stars: number;
    forks: number;
    watchers: number;
    visibility: 'public' | 'private';
  };
};

export type PullRequestSnapshot = {
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  baseBranch: string;
  headBranch: string;
  additions: number;
  deletions: number;
  changedFiles: ChangedFile[];
  commits: CommitSnapshot[];
  reviews: ReviewSnapshot[];
  checkRuns: CheckRunSnapshot[];
};

export type TrackedRepository = {
  owner: string;
  repo: string;
  branch?: string;
};
