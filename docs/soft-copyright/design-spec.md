# 师选人才路由系统 V1.0 — 设计说明书

版本：V1.0　编写目的：说明本软件的系统结构、功能划分、业务流程、数据设计与主要界面，供软件著作权登记使用。

适用对象：CEO、营运经理、HR、技术总监、部门 Leader、在职员工、新人、OPC 合伙人（内部使用）。

---

## 一、概述

### 1.1 产品定位

师选人才路由系统是一套面向内部 HR 场景的智能化人才管理平台，将传统「固定岗位 → 招聘 → 筛选淘汰」升级为「候选人进入 → 发现优势 → 匹配最佳岗位或 OPC 合伙人 → 录用分流」的人才路由逻辑，并贯通面试 → 培训 → 转正 → 薪酬全链路。

### 1.2 价值主张

| 维度 | 价值 |
|------|------|
| 提效 | 自动化日报、AI 辅助面试出题与分析、课程库调取，减少 HR 重复劳动 |
| 标准化 | 岗位结果定义、双维考核（会不会做 / 有没有产出），将产出结果变为可检查标准 |
| 决策赋能 | 证据提取 + 量化评分 + 风险标注，辅助 CEO 终裁；弹性岗位匹配优秀人才 |
| 全链路 | 面试录用、培训状态、薪酬比例（80%/100%）、OPC 合作信息同一体系内可追溯 |

### 1.3 用户角色

| 角色 | 核心诉求 |
|------|----------|
| CEO | 终裁录用、薪酬审计、晋升决策、深度复盘 |
| 营运经理 | HC 使用率、日报批注、岗位完整度、经营指标 |
| HR | 岗位定义、面试评估、薪酬档案、培训编排、离职晋升 |
| 技术总监 | 课程库维护、培训考题 |
| 部门 Leader | 任务检查、绩效评审、晋升提名 |
| 在职员工 | 任务执行、个人中心查看 |
| 新人 | 培训答题、延期申请 |
| OPC 合伙人 | OPC 档案与项目（无考勤） |

---

## 二、系统总体设计

### 2.1 技术架构

| 层级 | 技术选型 |
|------|----------|
| 表现层 | Next.js 16 App Router、React 19、Tailwind CSS 4、shadcn/ui |
| 业务层 | Server Actions（`src/actions/`）、页面适配器 |
| 认证 | 邮箱密码 Session、中间件路由守卫 |
| 权限 | RBAC（`src/lib/auth/permissions.ts`） |
| 持久化 | Turso/libSQL（本地 `file:local.db`）+ Drizzle ORM |
| 外部服务 | Mock AI / 飞书服务契约层（`src/lib/services/`），可切换真实适配器 |

### 2.2 部署形态

客户端通过 HTTPS 访问部署地址；开发环境默认 `http://localhost:3000`。服务端 `pnpm build` 后 `pnpm start` 运行。数据库迁移由 Drizzle 管理，种子数据通过 `pnpm db:seed` 灌入。

### 2.3 系统架构图

```
┌─────────────┐     HTTPS      ┌──────────────────────────────┐
│  Web 浏览器  │ ──────────────▶│  Next.js App Router          │
│  (Chrome等) │                │  ├─ (auth)/login             │
└─────────────┘                │  ├─ (dashboard)/dashboard/*  │
                               │  ├─ api/cron/daily-report    │
                               │  └─ middleware (Session)     │
                               └──────────┬───────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
            ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
            │ Server       │      │ Drizzle ORM  │      │ Mock AI /    │
            │ Actions      │      │ + libSQL     │      │ Feishu 服务  │
            └──────────────┘      └──────────────┘      └──────────────┘
```

---

## 三、功能结构设计

| 模块 | 主要功能 | 路由/入口 |
|------|----------|-----------|
| 认证 | 邮箱密码登录、会话守卫 | `/login` |
| 经营总览 | 岗位/候选人/课程/任务/OPC 统计、今日简报状态 | `/dashboard` |
| 个人中心 | 岗位结果、考核、薪酬、三讲明白（只读） | `/dashboard/profile` |
| 岗位结果定义 | 岗位 CRUD、KPI 模板绑定、完整度概览 | `/dashboard/jobs` |
| 日报/简报 | 生成日报、明细查看、飞书预览、营运批注 | `/dashboard/daily-reports` |
| 任务管理 | 任务创建、执行、检查、部门落实率 | `/dashboard/tasks` |
| 面试评估 | 候选人档案、AI 出题/分析/路由、CEO 决策 | `/dashboard/interviews` |
| MBTI 测评 | 发起测评、查看类型结果 | `/dashboard/mbti` |
| 课程库 | 课程上传、技能标签、多维表格同步、覆盖矩阵 | `/dashboard/courses` |
| 新人培训 | 培训计划、AI 考题、答题、延期、CEO 验收 | `/dashboard/training` |
| 绩效考核 | 能力/结果标准、绩效评审、异常、职业路径 | `/dashboard/performance` |
| 薪酬管理 | 薪酬档案、培训期/转正、营运审计、CEO 审批 | `/dashboard/salary` |
| OPC 管理 | 合伙人、项目分成、合作协议 | `/dashboard/opc` |
| 考勤管理 | 打卡记录、考勤规则（OPC 除外） | `/dashboard/attendance` |
| 晋升流程 | 提名、审批、CEO 决策 | `/dashboard/promotions` |
| 晋升条件库 | 各职级晋升条件 CRUD | `/dashboard/promotion-conditions` |
| 离职管理 | 离职申请、审批、交接清单 | `/dashboard/resignations` |
| 复盘中心 | 招聘/培训复盘归档 | `/dashboard/retrospectives` |
| 深度复盘 | 经营指标、招聘漏斗、历史快照 | `/dashboard/analytics` |

侧栏按「组织与标准」「人才路由」「绩效与薪酬」「发展与流动」「复盘分析」五组折叠展示。

---

## 四、核心业务流程设计

### 4.1 人才路由（面试评估）

1. HR 在「面试评估」新建候选人档案，填写姓名、邮箱、目标岗位、优势标签与简历摘要，可标记重点候选人。
2. 录入面试记录（原文、录音链接、精神面貌评价与评分）。
3. 点击「AI 生成面试题」「AI 面试分析」「AI 路由建议」，系统展示综合分、技能评估、风险标注与推理链。
4. 若需弹性岗位，填写新目标岗位与调整原因，点击「调整并转存」存档原招聘需求。
5. CEO 在 ceo_review/routing 阶段选择录用员工、录用 OPC 或放弃，填写备注后提交决策。

### 4.2 日报/简报自动化

1. CEO/营运/HR 点击「生成今日日报」，系统汇总 HC 使用率、招聘进度、重点候选人环节。
2. 选择历史日报查看摘要 JSON 与明细条目。
3. 营运经理可添加批注；支持「飞书预览」外链查看推送效果。

### 4.3 任务与绩效考核

1. 有权限用户在「任务管理」创建任务，指定执行人、检查人、完成标准与截止时间。
2. 执行人标记完成；检查人审核通过或驳回并填写反馈。
3. 在「绩效考核」维护能力标准与结果标准，可批量应用 KPI 模板；录入绩效评审，系统自动标记得分低于 70 的异常。

### 4.4 薪酬与培训转正

1. HR 创建薪酬档案，初始状态为培训期（薪资比例 80%）。
2. 培训达标后更新为转正（100%），提交营运审计；CEO/营运审批通过或驳回。
3. 「新人培训」创建计划、AI 生成考题、学员答题；可申请延期并由审批人批准；CEO 提交验收结果。

### 4.5 晋升、离职与复盘

1. 部门 Leader/HR 提交晋升提名 → 多级审批 → CEO 最终决策。
2. 员工发起离职申请 → CEO/营运审批 → 勾选交接清单项。
3. HR/营运在「复盘中心」创建招聘/培训复盘；CEO 在「深度复盘」查看漏斗与历史快照。

---

## 五、数据库设计

Schema 按业务域拆分于 `src/db/schema/`：

| 域 | 主要表 | 说明 |
|----|--------|------|
| foundation | business_lines, departments, users, audit_logs | 组织与用户基础 |
| jobs | job_positions, job_kpi_templates, recruitment_requests | 岗位与招聘需求 |
| interviews | candidates, interview_sessions, routing_suggestions, hiring_decisions | 面试与路由 |
| daily | daily_reports, daily_report_items, daily_report_annotations | 日报简报 |
| courses | courses, course_skill_tags | 课程库 |
| performance | performance_capability_standards, performance_result_standards, performance_reviews | 绩效考核 |
| tasks | tasks, task_check_results | 任务管理 |
| salary | salary_profiles, salary_status_history, salary_audit_submissions | 薪酬管理 |
| opc | opc_partners, opc_projects, opc_agreements, opc_revenue_shares | OPC 合伙人 |
| p2 | training_plans, training_exams, promotion_nominations, resignation_requests, attendance_records 等 | 培训/晋升/离职/考勤 |
| p3 | mbti_assessments, analytics_snapshots, recruitment_retrospectives 等 | MBTI/复盘/分析 |

主键统一为 text UUID；时间字段为 ISO 8601 文本；外键通过 Drizzle `references` 声明。

---

## 六、接口与服务设计

### 6.1 Server Actions

业务写操作集中于 `src/actions/`，按模块拆分（jobs、interviews、daily-reports、tasks、performance、salary、opc、training、promotions、resignations、attendance、mbti、retrospectives、analytics 等）。每个 Action 内校验 Session 与 RBAC 权限后操作数据库，关键变更写入 `audit_logs`。

### 6.2 外部服务契约

| 服务 | 契约接口 | Mock 实现 |
|------|----------|-----------|
| AI | `getAiService()` — 面试出题、分析、路由、考题生成 | `ai-service.mock.ts` |
| 飞书 | `getFeishuService()` — 日报推送、多维表格同步 | `feishu-service.mock.ts` |

环境变量 `MOCK_EXTERNAL_SERVICES=true` 时走 Mock，零外网请求；生产切换为 false 并实现真实 adapter。

### 6.3 定时任务

`src/app/api/cron/daily-report/route.ts` 支持按计划触发日报生成（Cron 调用）。

---

## 七、界面说明

### 7.1 登录页

居中卡片布局，展示系统名称「师选人才路由系统」，邮箱与密码输入框及「登录」按钮；登录成功后跳转 `/dashboard`。

### 7.2 主布局

顶部 AppHeader（面包屑 + 用户菜单）；左侧 AppSidebar 按五组折叠展示 18 个业务入口 + 经营总览、个人中心；内容区采用 SplitPanel 左右分栏（左侧可选列表 + 右侧详情表单），通过 URL `?id=` 切换选中项。

### 7.3 典型界面

- **经营总览**：5 张统计卡片 + 今日简报状态提示。
- **面试评估**：管道统计徽章 + 候选人列表 + 多区块表单（档案、面试、AI、CEO 决策）。
- **绩效考核**：5 个 Tab 切换（标准、评审、异常、三讲明白、职业路径）。
- **深度复盘**：6 张指标卡片 + 招聘漏斗与历史快照分栏。

---

## 八、安全与权限

- 中间件拦截未登录请求，重定向至 `/login`。
- 各页面与 Server Action 按角色（ceo、ops_manager、hr、tech_director、dept_leader、employee、newcomer、opc_partner）控制按钮与表单可见性。
- 密码 bcrypt 哈希存储；Session 基于加密 Cookie。
- 操作审计记录 entityType、entityId、action、actorId 与 payload。

---

## 九、非功能需求摘要

| 项 | 说明 |
|----|------|
| 浏览器兼容 | Chrome、Edge 等现代浏览器最新版本 |
| 数据隔离 | 按角色与部门控制数据可见范围 |
| 可扩展性 | Mock 服务契约层支持切换真实 AI/飞书 |
| 可维护性 | Schema 按域拆分、Actions 按模块拆分 |
