import {
  adjustFlexibleJobForm,
  analyzeInterviewForm,
  createCandidateForm,
  generateInterviewQuestionsForm,
  getCandidate,
  getCandidateAnalysis,
  getCandidateQuestions,
  getCandidateRecords,
  getCandidateRouting,
  getCandidates,
  getInterviewPipelineStats,
  makeHiringDecisionForm,
  saveInterviewRecordForm,
  suggestRoutingForm,
  updateCandidateForm,
} from "@/actions/interviews";
import { getJobs } from "@/actions/jobs";
import { FormHiddenId } from "@/components/dashboard/form-hidden-id";
import { SelectableListItem, EmptyState } from "@/components/dashboard/selectable-list";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { verifySession } from "@/lib/auth/session";
import {
  canMakeHiringDecision,
  canViewInterviewData,
  hasRole,
} from "@/lib/auth/permissions";
import { CANDIDATE_STAGE_LABELS, type CandidateStage } from "@/lib/constants/status";

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await verifySession();
  const candidates = await getCandidates();
  const jobs = await getJobs();
  const selectedId = id ?? candidates[0]?.id;
  const selected = selectedId ? await getCandidate(selectedId) : null;
  const questions = selected ? await getCandidateQuestions(selected.id) : [];
  const analysis = selected ? await getCandidateAnalysis(selected.id) : null;
  const routing = selected ? await getCandidateRouting(selected.id) : [];
  const records = selected ? await getCandidateRecords(selected.id) : [];
  const canView = session ? canViewInterviewData(session) : false;
  const canManage = session ? hasRole(session, "hr") : false;
  const canDecide = session ? canMakeHiringDecision(session) : false;
  const pipeline = await getInterviewPipelineStats();

  const skillScores = analysis?.skillScoresJson
    ? (JSON.parse(analysis.skillScoresJson) as { skill: string; score: number; evidence?: string }[])
    : [];
  const risksRaw = analysis?.risksJson
    ? (JSON.parse(analysis.risksJson) as Array<string | { level?: string; description?: string }>)
    : [];
  const risks = risksRaw.map((r) =>
    typeof r === "string" ? r : `${r.level ?? ""}: ${r.description ?? ""}`.trim()
  );
  const advantages = analysis?.advantagesJson
    ? (JSON.parse(analysis.advantagesJson) as string[])
    : [];
  const reasoningText = analysis?.reasoningChain
    ? (() => {
        try {
          const parsed = JSON.parse(analysis.reasoningChain) as unknown;
          return Array.isArray(parsed) ? parsed.join("\n") : analysis.reasoningChain;
        } catch {
          return analysis.reasoningChain;
        }
      })()
    : "";

  if (!canView) {
    return (
      <div className="text-sm text-muted-foreground">您无权查看面试评估数据</div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">面试评估</h1>
        <p className="text-muted-foreground text-sm mt-1">
          候选人建档、面试录入、AI 分析 / 路由与 CEO 录用决策
        </p>
        {pipeline && (
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline">候选人 {pipeline.total}</Badge>
            <Badge variant="outline">重点 {pipeline.keyCount}</Badge>
            {Object.entries(pipeline.byStage).map(([stage, count]) => (
              <Badge key={stage} variant="secondary">
                {CANDIDATE_STAGE_LABELS[stage as CandidateStage] ?? stage} {count}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <SplitPanel
        list={
          <>
            <PanelHeader title="候选人管道" />
            <PanelBody className="p-0!">
              {candidates.length === 0 ? (
                <EmptyState message="暂无候选人" />
              ) : (
                candidates.map((c) => (
                  <SelectableListItem
                    key={c.id}
                    href={`/dashboard/interviews?id=${c.id}`}
                    selected={c.id === selectedId}
                    title={c.name}
                    subtitle={CANDIDATE_STAGE_LABELS[c.stage as CandidateStage]}
                    badge={c.isKeyCandidate ? "重点" : undefined}
                  />
                ))
              )}
            </PanelBody>
          </>
        }
        detail={
          selected ? (
            <>
              <PanelHeader
                title={selected.name}
                action={
                  <Badge>
                    {CANDIDATE_STAGE_LABELS[selected.stage as CandidateStage]}
                  </Badge>
                }
              />
              <PanelBody className="space-y-6">
                {canManage && (
                  <form
                    action={updateCandidateForm}
                    className="space-y-3 border rounded-lg p-4 max-w-xl"
                  >
                    <FormHiddenId name="candidateId" value={selected.id} />
                    <h3 className="font-semibold text-sm">编辑候选人档案</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="name">姓名</Label>
                        <Input id="name" name="name" defaultValue={selected.name} required />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="email">邮箱</Label>
                        <Input id="email" name="email" defaultValue={selected.email ?? ""} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="targetJobPositionId">目标岗位</Label>
                      <select
                        id="targetJobPositionId"
                        name="targetJobPositionId"
                        defaultValue={selected.targetJobPositionId ?? ""}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="">待定</option>
                        {jobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="advantages">优势标签 / 培养方向</Label>
                      <Textarea id="advantages" name="advantages" defaultValue={selected.advantages ?? ""} rows={2} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="resumeSummary">简历摘要</Label>
                      <Textarea id="resumeSummary" name="resumeSummary" defaultValue={selected.resumeSummary ?? ""} rows={2} />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isKeyCandidate" defaultChecked={selected.isKeyCandidate} />
                      标记为重点候选人
                    </label>
                    <SubmitButton variant="secondary">保存档案</SubmitButton>
                  </form>
                )}

                <div className="flex flex-wrap gap-2">
                  <form action={generateInterviewQuestionsForm}>
                    <FormHiddenId name="candidateId" value={selected.id} />
                    <SubmitButton variant="outline">AI 生成面试题</SubmitButton>
                  </form>
                  <form action={analyzeInterviewForm}>
                    <FormHiddenId name="candidateId" value={selected.id} />
                    <SubmitButton variant="outline">AI 面试分析</SubmitButton>
                  </form>
                  <form action={suggestRoutingForm}>
                    <FormHiddenId name="candidateId" value={selected.id} />
                    <SubmitButton variant="outline">AI 路由建议</SubmitButton>
                  </form>
                </div>

                {canManage && (
                  <form
                    action={saveInterviewRecordForm}
                    className="space-y-3 border rounded-lg p-4 max-w-xl"
                  >
                    <FormHiddenId name="candidateId" value={selected.id} />
                    <h3 className="font-semibold text-sm">面试记录 / 精神面貌标注</h3>
                    <div className="space-y-1">
                      <Label htmlFor="content">面试记录原文</Label>
                      <Textarea id="content" name="content" rows={3} placeholder="面试过程要点…" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="recordingUrl">录音链接</Label>
                      <Input id="recordingUrl" name="recordingUrl" placeholder="https://…" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="demeanorNote">精神面貌评价</Label>
                      <Textarea id="demeanorNote" name="demeanorNote" rows={2} placeholder="人工观察：积极性、同频程度…" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="demeanorScore">精神面貌评分 (1-10)</Label>
                      <Input id="demeanorScore" name="demeanorScore" type="number" min={1} max={10} />
                    </div>
                    <SubmitButton variant="secondary">保存面试记录</SubmitButton>
                  </form>
                )}

                {records.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">已存档面试记录</h3>
                    <ul className="space-y-2 text-sm">
                      {records.map((r) => (
                        <li key={r.id} className="border rounded-md px-3 py-2">
                          {r.demeanorNote && (
                            <p>
                              <span className="text-muted-foreground">精神面貌：</span>
                              {r.demeanorNote}
                              {r.demeanorScore != null && ` (${r.demeanorScore}/10)`}
                            </p>
                          )}
                          {r.content && <p className="mt-1">{r.content}</p>}
                          {r.recordingUrl && (
                            <p className="text-xs text-muted-foreground mt-1">录音：{r.recordingUrl}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {questions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">面试题 ({questions.length})</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {questions.map((q) => (
                        <li key={q.id}>
                          <Badge variant="outline" className="mr-1 text-xs">{q.questionType}</Badge>
                          {q.content}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {analysis && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">
                      AI 分析 · 综合分 {analysis.overallScore}
                    </h3>
                    {advantages.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">优势提取：</span>
                        {advantages.join("；")}
                      </div>
                    )}
                    {skillScores.length > 0 && (
                      <ul className="text-sm space-y-1">
                        {skillScores.map((s, i) => (
                          <li key={i} className="border rounded px-2 py-1">
                            {s.skill}：{s.score} 分
                            {s.evidence && (
                              <span className="text-muted-foreground text-xs block">证据：{s.evidence}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {risks.length > 0 && (
                      <div className="text-sm text-amber-700">
                        风险标注：{risks.join("；")}
                      </div>
                    )}
                    <pre className="text-xs bg-muted rounded-md p-3 overflow-auto whitespace-pre-wrap">
                      {reasoningText}
                    </pre>
                  </div>
                )}

                {routing.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">路由建议</h3>
                    <ul className="space-y-2 text-sm">
                      {routing.map((r) => (
                        <li key={r.id} className="border rounded-md px-3 py-2">
                          <Badge variant="secondary">{r.routeType}</Badge>
                          <p className="mt-1">{r.rationale}</p>
                          {r.confidence != null && (
                            <span className="text-xs text-muted-foreground">
                              置信度 {(r.confidence * 100).toFixed(0)}%
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {canManage && (
                  <form
                    action={adjustFlexibleJobForm}
                    className="border rounded-lg p-4 space-y-3 max-w-xl"
                  >
                    <FormHiddenId name="candidateId" value={selected.id} />
                    <h3 className="font-semibold text-sm">弹性岗位调整（转存原需求）</h3>
                    <div className="space-y-2">
                      <Label htmlFor="newJobPositionId">新目标岗位</Label>
                      <select
                        id="newJobPositionId"
                        name="newJobPositionId"
                        defaultValue={selected.targetJobPositionId ?? ""}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {jobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reason">调整原因</Label>
                      <Textarea id="reason" name="reason" rows={2} required />
                    </div>
                    <SubmitButton variant="secondary">调整并转存</SubmitButton>
                  </form>
                )}

                {canDecide &&
                  (selected.stage === "ceo_review" || selected.stage === "routing") && (
                  <form
                    action={makeHiringDecisionForm}
                    className="border-t pt-4 space-y-3 max-w-md"
                  >
                    <FormHiddenId name="candidateId" value={selected.id} />
                    <h3 className="font-semibold text-sm">CEO 录用决策</h3>
                    <div className="space-y-2">
                      <Label htmlFor="decision">决策</Label>
                      <select
                        id="decision"
                        name="decision"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="hire_employee">录用员工</option>
                        <option value="hire_opc">录用 OPC</option>
                        <option value="reject">放弃</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">备注</Label>
                      <Textarea id="notes" name="notes" rows={2} />
                    </div>
                    <SubmitButton>提交决策</SubmitButton>
                  </form>
                )}
              </PanelBody>
            </>
          ) : (
            <>
              <PanelHeader title="新建候选人" />
              <PanelBody>
                {canManage ? (
                  <form action={createCandidateForm} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="name">姓名</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="email">邮箱</Label>
                        <Input id="email" name="email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">电话</Label>
                        <Input id="phone" name="phone" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetJobPositionId">目标岗位</Label>
                      <select
                        id="targetJobPositionId"
                        name="targetJobPositionId"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="">待定</option>
                        {jobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="advantages">优势 / 培养方向</Label>
                      <Textarea id="advantages" name="advantages" rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resumeSummary">简历摘要</Label>
                      <Textarea id="resumeSummary" name="resumeSummary" rows={3} />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isKeyCandidate" />
                      标记为重点候选人
                    </label>
                    <SubmitButton>创建候选人</SubmitButton>
                  </form>
                ) : (
                  <EmptyState message="请从左侧选择候选人" />
                )}
              </PanelBody>
            </>
          )
        }
      />
    </div>
  );
}
