import type {
  AiService,
  ExamQuestion,
  InterviewAnalysis,
  InterviewQuestion,
  RoutingSuggestion,
} from "../contracts/ai";

export class MockAiService implements AiService {
  async generateInterviewQuestions(input: {
    candidateName: string;
    advantages: string;
    jobTitle: string;
    expectedResult: string;
  }): Promise<InterviewQuestion[]> {
    const practical: InterviewQuestion[] = [
      {
        questionType: "practical",
        content: `请结合「${input.jobTitle}」岗位，演示如何达成「${input.expectedResult}」的具体步骤。`,
      },
      {
        questionType: "practical",
        content: `基于候选人优势「${input.advantages}」，请完成一项与岗位相关的实操任务并说明思路。`,
      },
      {
        questionType: "practical",
        content: `假设入职后首周需独立推进一项工作，请描述你的执行计划与验收标准。`,
      },
      {
        questionType: "practical",
        content: `请复盘一次你过往项目中产出结果的经历，并说明可复用的方法。`,
      },
    ];
    const choices: InterviewQuestion[] = [
      {
        questionType: "choice",
        content: "以下哪项最符合「岗位写结果」的管理理念？",
        options: [
          "只关注职位名称",
          "明确预期产出与检查标准",
          "仅考核出勤时长",
          "忽略主负责人",
        ],
      },
    ];
    return [...practical, ...choices];
  }

  async analyzeInterview(input: {
    candidateName: string;
    resumeSummary: string;
    interviewContent: string;
    jobTitle: string;
  }): Promise<InterviewAnalysis> {
    return {
      advantages: [
        `${input.candidateName} 在相关领域有明确项目经验`,
        "沟通表达清晰，能结构化描述工作方法",
        `与「${input.jobTitle}」岗位预期结果存在较高匹配度`,
      ],
      skillScores: [
        {
          skill: "专业技能",
          score: 82,
          evidence: `简历提及：${input.resumeSummary?.slice(0, 80) || "具备相关背景"}`,
        },
        {
          skill: "结果导向",
          score: 78,
          evidence:
            input.interviewContent?.slice(0, 100) ||
            "面试中能够描述具体产出与验收方式",
        },
        {
          skill: "学习意愿",
          score: 85,
          evidence: "主动询问培训与成长路径",
        },
      ],
      risks: [
        {
          level: "medium",
          description: "部分技能需在培训期重点补强",
        },
        {
          level: "low",
          description: "行业经验深度有待入职后验证",
        },
      ],
      reasoningChain: [
        "1. 从简历提取关键技能与项目事实",
        "2. 对照岗位结果定义评估匹配度",
        "3. 结合面试记录识别优势与风险",
        "4. 综合评分并生成路由建议依据",
      ].join("\n"),
      overallScore: 81,
    };
  }

  async suggestRouting(input: {
    candidateName: string;
    advantages: string;
    analysis: InterviewAnalysis;
    availableJobs: { id: string; title: string }[];
  }): Promise<RoutingSuggestion[]> {
    const topJob = input.availableJobs[0];
    const suggestions: RoutingSuggestion[] = [];

    if (topJob && input.analysis.overallScore >= 70) {
      suggestions.push({
        routeType: "employee",
        suggestedJobTitle: topJob.title,
        rationale: `${input.candidateName} 的优势「${input.advantages}」与岗位「${topJob.title}」高度对齐，综合评分 ${input.analysis.overallScore}。`,
        confidence: 0.85,
      });
    }

    if (input.analysis.overallScore >= 75) {
      suggestions.push({
        routeType: "opc",
        opcProjectHint: "AI 培训项目合作",
        rationale:
          "候选人某项优势突出，可考虑 OPC 高门槛合作通道，按项目提成合作。",
        confidence: 0.72,
      });
    }

    if (input.analysis.overallScore < 60) {
      suggestions.push({
        routeType: "reject",
        rationale: "综合评分未达录用底线，建议放弃。",
        confidence: 0.9,
      });
    }

    return suggestions;
  }

  async generateExamQuestions(input: {
    skills: string[];
    count?: number;
  }): Promise<ExamQuestion[]> {
    const count = input.count ?? 5;
    const questions: ExamQuestion[] = [];
    for (let i = 0; i < count; i++) {
      const skill = input.skills[i % input.skills.length] || "通用技能";
      if (i < Math.ceil(count * 0.8)) {
        questions.push({
          questionType: "practical",
          content: `请描述你在「${skill}」方面的实操步骤与验收标准。`,
          correctAnswer: `能够清晰描述${skill}的实操流程`,
        });
      } else {
        questions.push({
          questionType: "choice",
          content: `以下关于「${skill}」的说法正确的是？`,
          options: ["完全不需要标准", "应有明确结果与检查", "只看态度"],
          correctAnswer: "应有明确结果与检查",
        });
      }
    }
    return questions;
  }

  async scoreExam(
    questions: ExamQuestion[],
    answers: Record<string, string>
  ): Promise<{ score: number; passed: boolean; details: string[] }> {
    let correct = 0;
    const details: string[] = [];
    questions.forEach((q, idx) => {
      const key = String(idx);
      const answer = answers[key] ?? "";
      const isCorrect =
        q.questionType === "practical"
          ? answer.trim().length >= 10
          : answer === q.correctAnswer;
      if (isCorrect) correct++;
      details.push(`第${idx + 1}题：${isCorrect ? "正确" : "需改进"}`);
    });
    const score = questions.length ? correct / questions.length : 0;
    return { score, passed: score >= 0.8, details };
  }
}
