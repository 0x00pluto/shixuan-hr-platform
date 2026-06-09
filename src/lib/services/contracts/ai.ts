export type InterviewQuestion = {
  questionType: "practical" | "choice";
  content: string;
  options?: string[];
};

export type SkillScore = {
  skill: string;
  score: number;
  evidence: string;
};

export type RiskItem = {
  level: "low" | "medium" | "high";
  description: string;
};

export type InterviewAnalysis = {
  advantages: string[];
  skillScores: SkillScore[];
  risks: RiskItem[];
  reasoningChain: string;
  overallScore: number;
};

export type RoutingSuggestion = {
  routeType: "employee" | "opc" | "reject";
  suggestedJobTitle?: string;
  opcProjectHint?: string;
  rationale: string;
  confidence: number;
};

export type ExamQuestion = {
  questionType: "practical" | "choice";
  content: string;
  options?: string[];
  correctAnswer: string;
};

export interface AiService {
  generateInterviewQuestions(input: {
    candidateName: string;
    advantages: string;
    jobTitle: string;
    expectedResult: string;
  }): Promise<InterviewQuestion[]>;

  analyzeInterview(input: {
    candidateName: string;
    resumeSummary: string;
    interviewContent: string;
    jobTitle: string;
  }): Promise<InterviewAnalysis>;

  suggestRouting(input: {
    candidateName: string;
    advantages: string;
    analysis: InterviewAnalysis;
    availableJobs: { id: string; title: string }[];
  }): Promise<RoutingSuggestion[]>;

  generateExamQuestions(input: {
    skills: string[];
    count?: number;
  }): Promise<ExamQuestion[]>;

  scoreExam(
    questions: ExamQuestion[],
    answers: Record<string, string>
  ): Promise<{ score: number; passed: boolean; details: string[] }>;
}
