import { getProfileData } from "@/actions/profile";
import { Badge } from "@/components/ui/badge";
import { verifySession } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/constants/roles";

export default async function ProfilePage() {
  const session = await verifySession();
  if (!session) return null;

  const { user, job, primaryOwner, checker, reviews, salary, sanJiang } =
    await getProfileData();

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">个人中心</h1>
        <p className="text-muted-foreground text-sm mt-1">
          岗位结果、考核记录、薪酬状态与三讲明白
        </p>
      </div>

      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-sm">基本信息</h2>
        <div className="text-sm grid grid-cols-2 gap-2">
          <div>
            <span className="text-muted-foreground">姓名：</span>
            {user.name}
          </div>
          <div>
            <span className="text-muted-foreground">角色：</span>
            {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">邮箱：</span>
            {user.email}
          </div>
        </div>
      </section>

      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-sm">我的岗位结果定义</h2>
        {job ? (
          <div className="text-sm space-y-2">
            <div className="font-medium">{job.title}</div>
            <p>
              <span className="text-muted-foreground">预期结果：</span>
              {job.expectedResult}
            </p>
            <p>
              <span className="text-muted-foreground">完成标准：</span>
              {job.completionStandard}
            </p>
            {primaryOwner && (
              <p>
                <span className="text-muted-foreground">主负责人：</span>
                {primaryOwner.name}
              </p>
            )}
            {checker && (
              <p>
                <span className="text-muted-foreground">检查人：</span>
                {checker.name}
              </p>
            )}
            <Badge variant="secondary">
              {job.status === "published" ? "已发布" : "草稿"}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂未分配岗位</p>
        )}
      </section>

      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-sm">我的考核结果</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无考核记录</p>
        ) : (
          <ul className="text-sm space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="border rounded px-3 py-2">
                <div className="flex justify-between">
                  <span>{r.period}</span>
                  <Badge variant="outline">{r.reviewType}</Badge>
                </div>
                {r.score != null && <p className="mt-1">得分：{r.score}</p>}
                {r.feedback && (
                  <p className="text-muted-foreground text-xs mt-1">{r.feedback}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-sm">我的薪酬状态</h2>
        {salary ? (
          <div className="text-sm grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">基本薪资：</span>¥{salary.baseSalary}
            </div>
            <div>
              <span className="text-muted-foreground">薪资比例：</span>
              {(salary.salaryRatio * 100).toFixed(0)}%
            </div>
            <div>
              <span className="text-muted-foreground">状态：</span>
              {salary.status === "training" ? "培训期" : "正式"}
            </div>
            <div>
              <span className="text-muted-foreground">应发估算：</span>¥
              {Math.round(salary.baseSalary * salary.salaryRatio)}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无薪酬档案</p>
        )}
      </section>

      <section className="border rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-sm">三讲明白</h2>
        {sanJiang ? (
          <div className="text-sm space-y-2">
            <p>
              <span className="text-muted-foreground">规则：</span>
              {sanJiang.rulesText}
            </p>
            <p>
              <span className="text-muted-foreground">努力方向：</span>
              {sanJiang.directionText}
            </p>
            <p>
              <span className="text-muted-foreground">可得收益：</span>
              {sanJiang.benefitText}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无三讲明白内容</p>
        )}
      </section>
    </div>
  );
}
