import {
  approveResignationForm,
  createResignationRequestForm,
  getResignationRequest,
  listResignationRequests,
  toggleHandoverItemForm,
} from "@/actions/resignations";
import { FormHiddenId } from "@/components/dashboard/form-hidden-id";
import { SelectableListItem, EmptyState } from "@/components/dashboard/selectable-list";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { verifySession } from "@/lib/auth/session";

export default async function ResignationsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const session = await verifySession();
  const requests = await listResignationRequests();
  const selectedId = id ?? requests[0]?.id;
  const selected = selectedId ? await getResignationRequest(selectedId) : null;
  const approvals = selected?.approvals ?? [];
  const checklist = selected?.checklist ?? [];
  const canApprove = ["ceo", "ops_manager"].includes(session?.role ?? "");

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">离职管理</h1>
        <p className="text-muted-foreground text-sm mt-1">
          离职申请、审批流转与交接清单
        </p>
      </div>

      <SplitPanel
        list={
          <>
            <PanelHeader title="离职申请" />
            <PanelBody className="p-0">
              {requests.length === 0 ? (
                <EmptyState message="暂无离职申请" />
              ) : (
                requests.map((r) => (
                  <SelectableListItem
                    key={r.id}
                    href={`/dashboard/resignations?id=${r.id}`}
                    selected={r.id === selectedId}
                    title={`申请 ${r.id.slice(0, 8)}`}
                    subtitle={r.expectedLeaveDate}
                    badge={r.status}
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
                title="离职详情"
                action={<Badge>{selected.status}</Badge>}
              />
              <PanelBody className="space-y-6">
                <div className="text-sm space-y-2">
                  <p>
                    <span className="text-muted-foreground">离职原因：</span>
                    {selected.reason}
                  </p>
                  <p>
                    <span className="text-muted-foreground">预计离职日：</span>
                    {selected.expectedLeaveDate}
                  </p>
                </div>

                {approvals.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">审批记录</h3>
                    <ul className="text-sm space-y-1">
                      {approvals.map((a) => (
                        <li key={a.id} className="flex gap-2">
                          <Badge variant={a.approved ? "default" : "destructive"}>
                            {a.approverRole}
                          </Badge>
                          <span>{a.approved ? "同意" : "驳回"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {checklist.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">交接清单</h3>
                    <ul className="space-y-2">
                      {checklist.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm">
                          <form action={toggleHandoverItemForm}>
                            <FormHiddenId name="itemId" value={item.id} />
                            <SubmitButton variant="outline">
                              {item.isCompleted ? "✓" : "○"}
                            </SubmitButton>
                          </form>
                          <span className={item.isCompleted ? "line-through text-muted-foreground" : ""}>
                            {item.itemTitle}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {canApprove && selected.status === "pending" && (
                  <form
                    action={approveResignationForm}
                    className="space-y-3 border-t pt-4 max-w-md"
                  >
                    <FormHiddenId name="requestId" value={selected.id} />
                    <h3 className="font-semibold text-sm">审批离职</h3>
                    <div className="space-y-2">
                      <Label htmlFor="approved">审批意见</Label>
                      <select
                        id="approved"
                        name="approved"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="true">同意</option>
                        <option value="false">驳回</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">备注</Label>
                      <Textarea id="notes" name="notes" rows={2} />
                    </div>
                    <SubmitButton>提交审批</SubmitButton>
                  </form>
                )}
              </PanelBody>
            </>
          ) : (
            <>
              <PanelHeader title="发起离职 / 详情" />
              <PanelBody>
                <form action={createResignationRequestForm} className="space-y-4 max-w-xl">
                  <div className="space-y-2">
                    <Label htmlFor="reason">离职原因</Label>
                    <Textarea id="reason" name="reason" required rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expectedLeaveDate">预计离职日</Label>
                    <Input id="expectedLeaveDate" name="expectedLeaveDate" type="date" required />
                  </div>
                  <SubmitButton>提交离职申请</SubmitButton>
                </form>
              </PanelBody>
            </>
          )
        }
      />
    </div>
  );
}
