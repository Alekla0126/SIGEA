import { type RecordStatus, type Role } from "@/lib/types";
import { recordStatusLabel } from "@/lib/labels";

export function canCreateCase(role: Role) {
  return role === "FLAGRANCIA" || role === "MP" || role === "ADMIN";
}

export function canEditCase(role: Role) {
  return role === "FLAGRANCIA" || role === "MP" || role === "ADMIN";
}

export function canDeleteCase(role: Role) {
  return role === "FLAGRANCIA" || role === "MP" || role === "SUPERVISOR";
}

export function canCreateRecord(role: Role) {
  return role === "FLAGRANCIA" || role === "MP" || role === "ADMIN";
}

export function canUpdateRecord(role: Role) {
  return role === "FLAGRANCIA" || role === "MP" || role === "LITIGACION" || role === "ADMIN";
}

export function canDeleteRecord(role: Role) {
  return role === "FLAGRANCIA" || role === "MP" || role === "SUPERVISOR";
}

export function canRestoreRecord(role: Role) {
  return canDeleteRecord(role);
}

export function canPurgeRecord(role: Role) {
  return canDeleteRecord(role);
}

export function canSupervise(role: Role) {
  return role === "SUPERVISOR" || role === "ADMIN";
}

export function canMoveToReady(role: Role, litigacionReadyEnabled: boolean) {
  if (role === "LITIGACION") {
    return litigacionReadyEnabled;
  }

  return role === "FLAGRANCIA" || role === "MP" || role === "ADMIN";
}

export function allowedTransitions(
  role: Role,
  status: RecordStatus,
  litigacionReadyEnabled: boolean,
): Array<{ toStatus: RecordStatus; label: string }> {
  if (status === "DRAFT" && canMoveToReady(role, litigacionReadyEnabled)) {
    return [{ toStatus: "READY", label: `Enviar a ${recordStatusLabel("READY")}` }];
  }

  if (status === "NEEDS_CHANGES" && canMoveToReady(role, litigacionReadyEnabled)) {
    return [{ toStatus: "READY", label: `Reenviar a ${recordStatusLabel("READY")}` }];
  }

  if (status === "READY" && canSupervise(role)) {
    return [
      { toStatus: "APPROVED", label: "Aprobar" },
      { toStatus: "NEEDS_CHANGES", label: "Solicitar cambios" },
    ];
  }

  return [];
}
