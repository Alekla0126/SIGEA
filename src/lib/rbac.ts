import { RecordStatus, Role } from "@prisma/client";

import { appConfig } from "@/lib/config";

export type Action =
  | "case:read"
  | "case:create"
  | "case:update"
  | "case:delete"
  | "record:read"
  | "record:create"
  | "record:update"
  | "record:delete"
  | "record:status:ready"
  | "record:status:supervise"
  | "evidence:add"
  | "evidence:delete"
  | "artifact:generate"
  | "notification:read"
  | "report:read"
  | "user:manage";

const staticRules: Record<Action, Role[]> = {
  "case:read": ["FLAGRANCIA", "MP", "LITIGACION", "SUPERVISOR", "ADMIN"],
  "case:create": ["FLAGRANCIA", "MP", "ADMIN"],
  "case:update": ["FLAGRANCIA", "MP", "ADMIN"],
  "case:delete": ["ADMIN"],
  "record:read": ["FLAGRANCIA", "MP", "LITIGACION", "SUPERVISOR", "ADMIN"],
  "record:create": ["FLAGRANCIA", "MP", "ADMIN"],
  "record:update": ["FLAGRANCIA", "MP", "LITIGACION", "ADMIN"],
  "record:delete": ["FLAGRANCIA", "MP", "ADMIN"],
  "record:status:ready": ["FLAGRANCIA", "MP", "ADMIN"],
  "record:status:supervise": ["SUPERVISOR", "ADMIN"],
  "evidence:add": ["FLAGRANCIA", "MP", "ADMIN"],
  "evidence:delete": ["FLAGRANCIA", "MP", "ADMIN"],
  "artifact:generate": ["FLAGRANCIA", "MP", "LITIGACION", "ADMIN"],
  "notification:read": ["FLAGRANCIA", "MP", "LITIGACION", "SUPERVISOR", "ADMIN"],
  "report:read": ["FLAGRANCIA", "MP", "LITIGACION", "SUPERVISOR", "ADMIN"],
  "user:manage": ["ADMIN"],
};

export function can(role: Role, action: Action) {
  if (action === "record:status:ready" && role === "LITIGACION") {
    return appConfig.litigacionCanSetReady;
  }

  if (action === "evidence:add" && role === "LITIGACION") {
    return appConfig.litigacionCanAddEvidence;
  }

  if (action === "evidence:delete" && role === "LITIGACION") {
    return appConfig.litigacionCanDeleteEvidence;
  }

  return staticRules[action].includes(role);
}

const ALLOWED_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
  DRAFT: ["READY"],
  READY: ["NEEDS_CHANGES", "APPROVED"],
  NEEDS_CHANGES: ["READY"],
  APPROVED: [],
};

export function canTransitionStatus(from: RecordStatus, to: RecordStatus) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function canChangeStatus(role: Role, from: RecordStatus, to: RecordStatus) {
  if (!canTransitionStatus(from, to)) {
    return false;
  }

  if (to === "READY") {
    return can(role, "record:status:ready");
  }

  if (to === "APPROVED" || to === "NEEDS_CHANGES") {
    return can(role, "record:status:supervise");
  }

  return false;
}
