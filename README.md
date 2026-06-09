# 师选人才路由系统 V1.0

面向内部 HR 场景的智能化人才管理平台，覆盖岗位定义、日报简报、面试评估（人才路由）、课程库、绩效考核、任务管理、薪酬管理、OPC 管理，以及 P2/P3 扩展能力（新人培训、离职、晋升、考勤、深度复盘等）。

## 技术栈

- **Next.js 16** App Router + Server Actions
- **Turso / libSQL** 本地开发（`file:local.db`）
- **Drizzle ORM** + drizzle-kit 迁移
- **shadcn/ui** 组件库
- **Mock 服务**：LLM、飞书、OAuth 全部隔离，零外网请求

## 快速开始

```bash
# 1. 安装依赖（若尚未安装）
pnpm install

# 2. 配置环境变量
cp .env.example .env.local

# 3. 初始化数据库（生成迁移 + 应用 + 种子数据）
pnpm db:setup

# 4. 启动开发服务器
pnpm dev
```

访问 http://localhost:3000 ，使用下方系统账号登录。

### 系统账号

初始密码统一为 **`Shixuan@2026`**（录用自动创建的员工账号同样适用）。生产环境部署后请尽快修改密码。

| 角色 | 姓名 | 邮箱 | 密码 |
|------|------|------|------|
| CEO | 张总 | ceo@shixuan.com | Shixuan@2026 |
| 营运经理 | 余闻 | ops@shixuan.com | Shixuan@2026 |
| HR | 李人事 | hr@shixuan.com | Shixuan@2026 |
| 技术总监 | 王技术 | tech@shixuan.com | Shixuan@2026 |
| 部门 Leader | 赵市场 | leader@shixuan.com | Shixuan@2026 |
| 在职员工 | 陈员工 | employee@shixuan.com | Shixuan@2026 |
| 新人 | 刘新人 | newcomer@shixuan.com | Shixuan@2026 |
| OPC 合伙人 | 周合伙 | opc@shixuan.com | Shixuan@2026 |

## 数据库命令

| 命令 | 说明 |
|------|------|
| `pnpm db:generate` | 从 schema 生成 Drizzle 迁移 |
| `pnpm db:migrate` | 应用迁移到 Turso 本地库 |
| `pnpm db:seed` | 灌入演示数据 |
| `pnpm db:studio` | Drizzle Studio 可视化 |
| `pnpm db:setup` | generate + migrate + seed 一键初始化 |
| `pnpm db:migration:new -- <name>` | 创建 Supabase 镜像迁移文件 |

`pnpm db:seed` 可重复执行（会先清空业务数据再写入演示数据）。若需完全重建库文件，删除 `local.db` 后执行 `pnpm db:setup`。

## 环境变量

配置写入 `.env.local`（Next.js 与 `pnpm db:*` 命令均会读取；`db:*` 按 `.env` → `.env.local` 顺序加载，后者覆盖前者）：

```bash
TURSO_DATABASE_URL=file:local.db   # 本地开发
TURSO_AUTH_TOKEN=                   # 本地留空
MOCK_EXTERNAL_SERVICES=true         # 必须为 true（当前阶段）
SESSION_SECRET=dev-secret-change-in-production
```

生产 / 线上 Turso：在 `.env.local` 中将 `TURSO_DATABASE_URL` 改为 `libsql://...`，并设置 `TURSO_AUTH_TOKEN`，然后执行 `pnpm db:migrate`（及按需 `pnpm db:seed`）。`db:migrate` 日志应显示 `libsql://...`，而非 `file:local.db`。

## 模块路由

| 模块 | 路径 |
|------|------|
| 经营总览 | `/dashboard` |
| 岗位结果定义 | `/dashboard/jobs` |
| 日报/简报 | `/dashboard/daily-reports` |
| 面试评估 | `/dashboard/interviews` |
| 课程库 | `/dashboard/courses` |
| 绩效考核 | `/dashboard/performance` |
| 任务管理 | `/dashboard/tasks` |
| 薪酬管理 | `/dashboard/salary` |
| OPC 管理 | `/dashboard/opc` |
| 新人培训 | `/dashboard/training` |
| 离职管理 | `/dashboard/resignations` |
| 晋升流程 | `/dashboard/promotions` |
| 复盘中心 | `/dashboard/retrospectives` |
| MBTI 测评 | `/dashboard/mbti` |
| 考勤管理 | `/dashboard/attendance` |
| 晋升条件库 | `/dashboard/promotion-conditions` |
| 深度复盘 | `/dashboard/analytics` |

## Mock 服务替换

所有外部服务通过 `src/lib/services/` 契约层隔离：

- `getAiService()` — 面试出题、分析、路由、答题评分
- `getFeishuService()` — 日报推送、任务通知、多维表格同步

将 `MOCK_EXTERNAL_SERVICES=false` 并实现真实 adapter 即可切换。

## Supabase 迁移规划

1. Schema 使用 snake_case + text UUID，与 Postgres 兼容
2. 增量 DDL 同步至 `supabase/migrations/`
3. 应用层 RBAC 当前替代 RLS，迁移 Supabase 后补充 policy
4. 参考 `supabase/migrations/` 与 Supabase 工程最佳实践文档

## 项目结构

```
src/
├── app/(auth)/login/          # 邮箱密码登录
├── app/(dashboard)/dashboard/ # 业务模块页面
├── app/api/                   # Cron + Mock 飞书预览
├── actions/                   # Server Actions
├── components/layout/         # 布局组件
├── db/schema/                 # Drizzle Schema（按域拆分）
└── lib/
    ├── auth/                  # Session + RBAC
    ├── services/mock/         # Mock 适配器
    └── audit.ts               # 操作审计
```
