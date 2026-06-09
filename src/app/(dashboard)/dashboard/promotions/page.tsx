import {
  approvePromotionForm,
  createPromotionNominationForm,
  decidePromotionForm,
  getPromotionNomination,
  listPromotionNominations,
} from "@/actions/promotions";
import { FormHiddenId } from "@/components/dashboard/form-hidden-id";
import { SelectableListItem, EmptyState } from "@/components/dashboard/selectable-list";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { verifySession } from "@/lib/auth/session";

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await verifySession();
  const nominations = await listPromotionNominations();
  const selectedId = id ?? nominations[0]?.id;
  const selected = selectedId ? await getPromotionNomination(selectedId) : null;
  const approvals = selected?.approvals ?? [];
  const decision = selected?.decision ?? null;

  const canNominate = ["dept_leader", "hr"].includes(session?.role ?? "");
  const canApprove = ["dept_leader", "hr", "ops_manager"].includes(session?.role ?? "");
  const canDecide = session?.role === "ceo";

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">晋升流程</h1>
        <p className="text-muted-foreground text-sm mt-1">
          提名 → 审批 → CEO 最终决策
        </p>
      </div>

      <SplitPanel
        list={
          <>
            <PanelHeader title="晋升提名" />
            <PanelBody className="p-0">
              {nominations.length === 0 ? (
                <EmptyState message="暂无晋升提名" />
              ) : (
                nominations.map((n) => (
                  <SelectableListItem
                    key={n.id}
                    href={`/dashboard/promotions?id=${n.id}`}
                    selected={n.id === selectedId}
                    title={n.targetLevel}
                    subtitle={n.pathType}
                    badge={n.status}
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
                title={`晋升至 ${selected.targetLevel}`}
                action={<Badge>{selected.status}</Badge>}
              />
              <PanelBody className="space-y-6">
                <div className="text-sm">
                  <p>
                    <span className="text-muted-foreground">路径类型：</span>
                    {selected.pathType}
                  </p>
                  <p className="mt-2">
                    <span className="text-muted-foreground">提名理由：</span>
                    {selected.rationale}
                  </p>
                </div>

                {approvals.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">审批记录</h3>
                    <ul className="text-sm space-y-1">
                      {approvals.map((a) => (
                        <li key={a.id}>
                          {a.approverRole}：{a.approved ? "同意" : "驳回"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {decision && (
                  <div className="border rounded-md px-3 py-2 text-sm bg-muted/30">
                    CEO 决策：{decision.decision}
                    {decision.notes && (
                      <p className="text-muted-foreground mt-1">{decision.notes}</p>
                    )}
                  </div>
                )}

                {canApprove && !decision && (
                  <form
                    action={approvePromotionForm}
                    className="space-y-3 border-t pt-4 max-w-md"
                  >
                    <FormHiddenId name="nominationId" value={selected.id} />
                    <h3 className="font-semibold text-sm">审批提名</h3>
                    <div className="space-y-2">
                      <Label htmlFor="approved">意见</Label>
                      <select
                        id="approved"
                        name="approved"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="true">支持</option>
                        <option value="false">反对</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">备注</Label>
                      <Textarea id="notes" name="notes" rows={2} />
                    </div>
                    <SubmitButton variant="secondary">提交审批</SubmitButton>
                  </form>
                )}

                {canDecide && !decision && (
                  <form
                    action={decidePromotionForm}
                    className="space-y-3 border-t pt-4 max-w-md"
                  >
                    <FormHiddenId name="nominationId" value={selected.id} />
                    <h3 className="font-semibold text-sm">CEO 最终决策</h3>
                    <div className="space-y-2">
                      <Label htmlFor="decision">决策</Label>
                      <select
                        id="decision"
                        name="decision"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="approved">批准晋升</option>
                        <option value="rejected">不予晋升</option>
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
              <PanelHeader title="新建提名" />
              <PanelBody>
                {canNominate ? (
                  <form action={createPromotionNominationForm} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label htmlFor="userId">被提名人 ID</Label>
                      <Input id="userId" name="userId" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetLevel">目标职级</Label>
                      <Input id="targetLevel" name="targetLevel" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pathType">路径类型</Label>
                      <select
                        id="pathType"
                        name="pathType"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="management">管理路径</option>
                        <option value="expert">专家路径</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rationale">提名理由</Label>
                      <Textarea id="rationale" name="rationale" required rows={3} />
                    </div>
                    <SubmitButton>提交提名</SubmitButton>
                  </form>
                ) : (
                  <EmptyState message="请从左侧选择晋升提名" />
                )}
              </PanelBody>
            </>
          )
        }
      />
    </div>
  );
}
