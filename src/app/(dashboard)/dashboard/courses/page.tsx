import {
  getCourse,
  getCourseSkillTags,
  getCourses,
  getSkillCoverageMatrix,
  syncCourseToBitableForm,
  uploadCourseForm,
} from "@/actions/courses";
import { FormHiddenId } from "@/components/dashboard/form-hidden-id";
import { SelectableListItem, EmptyState } from "@/components/dashboard/selectable-list";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { SplitPanel, PanelHeader, PanelBody } from "@/components/layout/split-panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { verifySession } from "@/lib/auth/session";
import { canUploadCourses } from "@/lib/auth/permissions";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tab?: string }>;
}) {
  const { id, tab } = await searchParams;
  const session = await verifySession();
  const courses = await getCourses();
  const selectedId = id ?? courses[0]?.id;
  const selected = selectedId ? await getCourse(selectedId) : null;
  const tags = selected ? await getCourseSkillTags(selected.id) : [];
  const matrix = await getSkillCoverageMatrix();
  const canUpload = session ? canUploadCourses(session) : false;
  const showMatrix = session?.role === "ops_manager";

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div>
        <h1 className="text-2xl font-bold">课程库</h1>
        <p className="text-muted-foreground text-sm mt-1">
          课程上传、飞书多维表格同步与技能覆盖矩阵
        </p>
      </div>

      <Tabs defaultValue={tab ?? "courses"} className="flex flex-col flex-1 min-h-0">
        <TabsList>
          <TabsTrigger value="courses">课程列表</TabsTrigger>
          {showMatrix && <TabsTrigger value="matrix">技能覆盖矩阵</TabsTrigger>}
          <TabsTrigger value="bitable">多维表格</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="flex flex-col flex-1 min-h-0 mt-4">
          <SplitPanel
            list={
              <>
                <PanelHeader title="课程" />
                <PanelBody className="p-0">
                  {courses.length === 0 ? (
                    <EmptyState message="暂无课程" />
                  ) : (
                    courses.map((c) => (
                      <SelectableListItem
                        key={c.id}
                        href={`/dashboard/courses?id=${c.id}&tab=courses`}
                        selected={c.id === selectedId}
                        title={c.title}
                        subtitle={c.targetAudience ?? "全员"}
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
                    title={selected.title}
                    action={
                      canUpload ? (
                        <form action={syncCourseToBitableForm}>
                          <FormHiddenId name="courseId" value={selected.id} />
                          <SubmitButton variant="outline">同步多维表格</SubmitButton>
                        </form>
                      ) : undefined
                    }
                  />
                  <PanelBody className="space-y-4">
                    <p className="text-sm text-muted-foreground">{selected.description}</p>
                    <div className="text-sm">
                      <span className="text-muted-foreground">视频：</span>
                      <a href={selected.videoUrl} className="text-primary underline" target="_blank" rel="noreferrer">
                        {selected.videoUrl}
                      </a>
                    </div>
                    <Badge variant="secondary">
                      同步状态：{selected.bitableSyncStatus ?? "未同步"}
                    </Badge>
                    <div>
                      <h3 className="font-semibold text-sm mb-2">技能标签</h3>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <Badge key={t.id} variant="outline">
                            {t.skillTag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </PanelBody>
                </>
              ) : (
                <>
                  <PanelHeader title="课程详情 / 上传" />
                  <PanelBody>
                    {canUpload ? (
                      <form action={uploadCourseForm} className="space-y-4 max-w-xl">
                        <div className="space-y-2">
                          <Label htmlFor="title">课程标题</Label>
                          <Input id="title" name="title" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">描述</Label>
                          <Textarea id="description" name="description" rows={2} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="videoUrl">视频链接</Label>
                          <Input id="videoUrl" name="videoUrl" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="skillTags">技能标签（逗号分隔）</Label>
                          <Input id="skillTags" name="skillTags" placeholder="沟通,项目管理" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="targetAudience">目标受众</Label>
                          <Input id="targetAudience" name="targetAudience" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="durationMinutes">时长（分钟）</Label>
                          <Input id="durationMinutes" name="durationMinutes" type="number" />
                        </div>
                        <SubmitButton>上传课程</SubmitButton>
                      </form>
                    ) : (
                      <EmptyState message="请从左侧选择课程" />
                    )}
                  </PanelBody>
                </>
              )
            }
          />
        </TabsContent>

        {showMatrix && (
          <TabsContent value="matrix" className="mt-4">
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>技能</TableHead>
                    <TableHead>覆盖课程数</TableHead>
                    <TableHead>课程</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.skills.map((skill) => {
                    const courseIds = matrix.coverage[skill] ?? [];
                    const names = courseIds
                      .map((cid) => matrix.courses.find((c) => c.id === cid)?.title)
                      .filter(Boolean);
                    return (
                      <TableRow key={skill}>
                        <TableCell className="font-medium">{skill}</TableCell>
                        <TableCell>{courseIds.length}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {names.join("、") || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}

        <TabsContent value="bitable" className="mt-4">
          <div className="border rounded-lg p-6 text-sm space-y-2">
            <p>飞书多维表格同步状态（Mock）</p>
            <ul className="space-y-1">
              {courses.map((c) => (
                <li key={c.id} className="flex justify-between border-b py-2">
                  <span>{c.title}</span>
                  <Badge variant="outline">{c.bitableSyncStatus}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
