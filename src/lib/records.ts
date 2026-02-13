import { CurrentArea, ModuleOwner, RecordStatus, Role } from "@prisma/client";

import { appConfig } from "@/lib/config";
import { canChangeStatus } from "@/lib/rbac";
import { type FichaPayload, validateReadyPayload } from "@/lib/validators";

export function inferCurrentAreaByRole(role: Role): CurrentArea {
  if (role === "LITIGACION") {
    return "LITIGACION";
  }

  if (role === "SUPERVISOR") {
    return "SUPERVISION";
  }

  return "FLAGRANCIA";
}

export function defaultModuleOwner(role: Role): ModuleOwner {
  return role === "MP" ? "MP" : "FLAGRANCIA";
}

export function ensureReadyTransitionAllowed(role: Role, fromStatus: RecordStatus, payload: FichaPayload) {
  if (!canChangeStatus(role, fromStatus, "READY")) {
    return ["No tiene permisos para cambiar a LISTO"];
  }

  return validateReadyPayload(payload);
}

export function isLitigacionReadyEnabled() {
  return appConfig.litigacionCanSetReady;
}
