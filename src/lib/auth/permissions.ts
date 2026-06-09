import type { SessionUser } from "./session";
import type { Role } from "@/lib/constants/roles";

export function hasRole(user: SessionUser, ...roles: Role[]) {
  return roles.includes(user.role);
}

export function canViewAllDepartments(user: SessionUser) {
  return hasRole(user, "ceo", "ops_manager", "hr");
}

export function canManageJobs(user: SessionUser) {
  return hasRole(user, "hr");
}

export function canViewJobOverview(user: SessionUser) {
  return hasRole(user, "ceo", "ops_manager", "hr", "dept_leader");
}

export function canViewInterviewData(user: SessionUser) {
  return hasRole(user, "ceo", "ops_manager", "hr", "dept_leader");
}

export function canMakeHiringDecision(user: SessionUser) {
  return hasRole(user, "ceo");
}

export function canViewSalary(
  user: SessionUser,
  target: { userId: string; departmentId: string | null }
) {
  if (hasRole(user, "ceo", "ops_manager", "hr")) return true;
  if (user.role === "dept_leader") {
    return (
      !!user.departmentId &&
      user.departmentId === target.departmentId
    );
  }
  if (user.role === "employee" || user.role === "newcomer") {
    return user.id === target.userId;
  }
  return false;
}

export function canAuditSalary(user: SessionUser) {
  return hasRole(user, "ops_manager");
}

export function canManageOpc(user: SessionUser) {
  return hasRole(user, "ceo", "ops_manager", "hr");
}

export function canViewOpcSelf(user: SessionUser, partnerUserId: string | null) {
  if (hasRole(user, "ceo", "ops_manager", "hr")) return true;
  if (user.role === "opc") return user.id === partnerUserId;
  return false;
}

export function canCreateTasks(user: SessionUser) {
  return hasRole(user, "hr", "dept_leader");
}

export function canAnnotateDailyReport(user: SessionUser) {
  return hasRole(user, "ops_manager");
}

export function canManagePerformance(user: SessionUser) {
  return hasRole(user, "hr", "dept_leader");
}

export function canUploadCourses(user: SessionUser) {
  return hasRole(user, "tech_director", "hr");
}

export function filterByDepartment<T extends { departmentId: string | null }>(
  user: SessionUser,
  items: T[]
) {
  if (canViewAllDepartments(user)) return items;
  if (user.departmentId) {
    return items.filter((i) => i.departmentId === user.departmentId);
  }
  return [];
}
