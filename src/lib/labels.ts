import type { RecordStatus, Role } from "@/lib/types";

export function recordStatusLabel(status: RecordStatus) {
  switch (status) {
    case "DRAFT":
      return "BORRADOR";
    case "READY":
      return "LISTO";
    case "NEEDS_CHANGES":
      return "REQUIERE CAMBIOS";
    case "APPROVED":
      return "APROBADO";
    default:
      return status;
  }
}

export function roleLabel(role: Role) {
  switch (role) {
    case "FLAGRANCIA":
      return "FLAGRANCIA";
    case "MP":
      return "MP";
    case "LITIGACION":
      return "LITIGACION";
    case "SUPERVISOR":
      return "SUPERVISOR";
    case "ADMIN":
      return "ADMIN";
    default:
      return role;
  }
}

