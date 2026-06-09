import {
  completeMbtiAssessmentForm,
  getMbtiAssessment,
  listMbtiAssessments,
  startMbtiAssessmentFromForm,
} from "@/actions/mbti";
import { FormHiddenId } from "@/components/dashboard/form-hidden-id";
import { SelectableListItem, EmptyState } from "@/components/dashboard/selectable-list";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifySession } from "@/lib/auth/session";
import { canManageJobs, canViewInterviewData } from "@/lib/auth/permissions";

export default async function MbtiPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await verifySession();
  const canView = session ? canViewInterviewData(session) : false;
  const canManage = session ? canManageJobs(session) : false;

  if (!canView) {
    return (
      <div className="text-sm text-muted-foreground">您无权查看 MBTI 测评数据</div>
    );
  }

  const assessments = await listMbtiAssessments();
  const selectedId = id ?? assessments[0]?.id;
  const selected = selectedId ? await getMbtiAssessment(selectedId) : null;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">MBTI 测评</h1>
        <p className="text-muted-foreground text-sm mt-1">
          候选人 MBTI 测评发起与 Mock 自动出结果
        </p>
      </div>

      <SplitPanel
        list={
          <>
            <PanelHeader title="测评列表" />
            <PanelBody className="p-0">
              {assessments.length === 0 ? (
                <EmptyState message="暂无 MBTI 测评" />
              ) : (
                assessments.map((a) => (
                  <SelectableListItem
                    key={a.id}
                    href={`/dashboard/mbti?id=${a.id}`}
                    selected={a.id === selectedId}
                    title={a.candidateName}
                    subtitle={a.status === "completed" ? "已完成" : "进行中"}
                    badge={a.status === "completed" ? "完成" : "进行"}
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
                title="测评详情"
                action={
                  <Badge>
                    {selected.status === "completed" ? "已完成" : "进行中"}
                  </Badge>
                }
              />
              <PanelBody className="space-y-6">
                {selected.result ? (
                  <div className="text-sm space-y-2 border rounded-md p-4 bg-muted/20">
                    <div className="text-2xl font-bold">{selected.result.typeCode}</div>
                    <p className="text-muted-foreground">{selected.result.summary}</p>
                    {selected.result.dimensions && (
                      <div className="flex gap-2 text-xs">
                        {Object.entries(selected.result.dimensions).map(([k, v]) => (
                          <Badge key={k} variant="outline">
                            {k}: {String(v)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  canManage && (
                    <form action={completeMbtiAssessmentForm}>
                      <FormHiddenId name="assessmentId" value={selected.id} />
                      <SubmitButton>完成测评（Mock 出结果）</SubmitButton>
                    </form>
                  )
                )}
              </PanelBody>
            </>
          ) : (
            <>
              <PanelHeader title="发起测评" />
              <PanelBody>
                {canManage ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      输入候选人 ID 发起新的 MBTI 测评
                    </p>
                    <form action={startMbtiAssessmentFromForm} className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="candidateId">候选人 ID</Label>
                        <Input id="candidateId" name="candidateId" required />
                      </div>
                      <SubmitButton>发起测评</SubmitButton>
                    </form>
                  </>
                ) : (
                  <EmptyState message="请从左侧选择测评记录" />
                )}
              </PanelBody>
            </>
          )
        }
      />
    </div>
  );
}
