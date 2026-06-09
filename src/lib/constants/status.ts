export const CANDIDATE_STAGES = [
  "screening",
  "interviewing",
  "ai_analysis",
  "routing",
  "ceo_review",
  "hired_employee",
  "hired_opc",
  "rejected",
] as const;

export type CandidateStage = (typeof CANDIDATE_STAGES)[number];

export const CANDIDATE_STAGE_LABELS: Record<CandidateStage, string> = {
  screening: "初筛",
  interviewing: "面试中",
  ai_analysis: "AI 分析",
  routing: "人才路由",
  ceo_review: "待 CEO 决策",
  hired_employee: "录用员工",
  hired_opc: "录用 OPC",
  rejected: "已放弃",
};

export const SALARY_STATUSES = ["training", "regular"] as const;
export type SalaryStatus = (typeof SALARY_STATUSES)[number];

export const TASK_STATUSES = ["open", "completed", "checked", "rejected"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const JOB_STATUSES = ["draft", "published"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
