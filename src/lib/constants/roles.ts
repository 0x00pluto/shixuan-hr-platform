export const ROLES = [
  "ceo",
  "ops_manager",
  "hr",
  "tech_director",
  "dept_leader",
  "employee",
  "newcomer",
  "opc",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ceo: "CEO",
  ops_manager: "营运经理",
  hr: "HR",
  tech_director: "技术总监",
  dept_leader: "部门 Leader",
  employee: "在职员工",
  newcomer: "新人",
  opc: "OPC 合伙人",
};
