-- 师选人才路由系统 — Supabase (Postgres) 镜像迁移
-- 来源：drizzle/migrations/0000_thin_payback.sql
-- 迁移至 Supabase 时：将 text 时间字段改为 timestamptz，并启用 RLS

-- RLS 策略示例（上线前按业务域补充）:
-- alter table salary_profiles enable row level security;
-- create policy salary_profiles_hr_all on salary_profiles for all using (...);

-- 完整 DDL 请对照 drizzle/migrations/ 中 SQLite 版本，
-- 使用 Supabase CLI: pnpm db:migration:new -- <name> 创建增量迁移。
