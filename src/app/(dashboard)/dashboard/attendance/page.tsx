import { createAttendanceRuleForm } from "@/actions/attendance";
import {
  getAttendanceRecord,
  getAttendanceRecords,
  getAttendanceRules,
} from "@/actions/page-adapters";
import { SelectableListItem, EmptyState } from "@/components/dashboard/selectable-list";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { verifySession } from "@/lib/auth/session";

const STATUS_LABELS: Record<string, string> = {
  normal: "正常",
  late: "迟到",
  absent: "缺勤",
  leave: "请假",
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tab?: string }>;
}) {
  const { id, tab } = await searchParams;
  const session = await verifySession();

  if (session?.role === "opc") {
    return (
      <div className="text-sm text-muted-foreground">
        OPC 合伙人不适用考勤管理模块
      </div>
    );
  }

  const rules = await getAttendanceRules();
  const records = await getAttendanceRecords();
  const selectedId = id ?? records[0]?.id;
  const selected = selectedId ? await getAttendanceRecord(selectedId) : null;
  const canManageRules = ["hr", "ops_manager"].includes(session?.role ?? "");

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">考勤管理</h1>
        <p className="text-muted-foreground text-sm mt-1">
          考勤规则配置与打卡记录（不含 OPC）
        </p>
      </div>

      <Tabs defaultValue={tab ?? "records"}>
        <TabsList>
          <TabsTrigger value="records">打卡记录</TabsTrigger>
          <TabsTrigger value="rules">考勤规则</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4 flex flex-col flex-1 min-h-0">
          <SplitPanel
            list={
              <>
                <PanelHeader title="记录列表" />
                <PanelBody className="p-0">
                  {records.length === 0 ? (
                    <EmptyState message="暂无考勤记录" />
                  ) : (
                    records.map((r) => (
                      <SelectableListItem
                        key={r.id}
                        href={`/dashboard/attendance?id=${r.id}&tab=records`}
                        selected={r.id === selectedId}
                        title={r.recordDate}
                        subtitle={STATUS_LABELS[r.status] ?? r.status}
                        badge={STATUS_LABELS[r.status]}
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
                    title={`考勤 ${selected.recordDate}`}
                    action={
                      <Badge>{STATUS_LABELS[selected.status] ?? selected.status}</Badge>
                    }
                  />
                  <PanelBody className="text-sm space-y-2">
                    <p>
                      <span className="text-muted-foreground">签到：</span>
                      {selected.checkInAt?.slice(11, 16) ?? "—"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">签退：</span>
                      {selected.checkOutAt?.slice(11, 16) ?? "—"}
                    </p>
                    {selected.note && (
                      <p>
                        <span className="text-muted-foreground">备注：</span>
                        {selected.note}
                      </p>
                    )}
                  </PanelBody>
                </>
              ) : (
                <>
                  <PanelHeader title="记录详情" />
                  <PanelBody>
                    <EmptyState message="请从左侧选择考勤记录" />
                  </PanelBody>
                </>
              )
            }
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <SplitPanel
            list={
              <>
                <PanelHeader title="规则列表" />
                <PanelBody className="p-0">
                  {rules.map((r) => (
                    <div key={r.id} className="px-4 py-3 border-b text-sm">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.workStartTime} – {r.workEndTime}
                      </div>
                    </div>
                  ))}
                </PanelBody>
              </>
            }
            detail={
              <>
                <PanelHeader title="新建规则" />
                <PanelBody>
                  {canManageRules ? (
                    <form action={createAttendanceRuleForm} className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="name">规则名称</Label>
                        <Input id="name" name="name" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="workStartTime">上班时间</Label>
                          <Input id="workStartTime" name="workStartTime" defaultValue="09:00" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workEndTime">下班时间</Label>
                          <Input id="workEndTime" name="workEndTime" defaultValue="18:00" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lateThresholdMinutes">迟到阈值（分钟）</Label>
                        <Input
                          id="lateThresholdMinutes"
                          name="lateThresholdMinutes"
                          type="number"
                          defaultValue={15}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="appliesToRoles">适用角色</Label>
                        <Input id="appliesToRoles" name="appliesToRoles" defaultValue="employee" />
                      </div>
                      <SubmitButton>创建规则</SubmitButton>
                    </form>
                  ) : (
                    <EmptyState message="仅 HR / 营运经理可管理考勤规则" />
                  )}
                </PanelBody>
              </>
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
