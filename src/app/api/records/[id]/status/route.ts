import { AuditAction, EntityType, NotificationType } from "@prisma/client";

import { fail, ok, parseBody, requireApiUser } from "@/lib/api";
import { canChangeStatus } from "@/lib/rbac";
import { statusChangeSchema, validateReadyPayload, fichaPayloadSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/server/services/audit";
import { notify } from "@/server/services/notifications";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const current = await prisma.record.findUnique({ where: { id } });
  if (!current) {
    return fail("Ficha no encontrada", 404);
  }

  const parsed = await parseBody(request, statusChangeSchema);
  if (parsed.error) {
    return parsed.error;
  }

  if (!canChangeStatus(auth.user.role, current.status, parsed.data.toStatus)) {
    return fail("Transicion o permisos invalidos", 403);
  }

  if (parsed.data.toStatus === "NEEDS_CHANGES" && parsed.data.comment.trim().length === 0) {
    return fail("Comentario obligatorio para NEEDS_CHANGES", 400);
  }

  const payloadResult = fichaPayloadSchema.safeParse(current.payload);
  if (!payloadResult.success) {
    return fail("Payload de ficha invalido", 409, payloadResult.error.flatten());
  }

  if (parsed.data.toStatus === "READY") {
    const readyErrors = validateReadyPayload(payloadResult.data);
    if (readyErrors.length > 0) {
      return fail("No se puede marcar READY", 422, readyErrors);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.record.update({
      where: { id },
      data: {
        status: parsed.data.toStatus,
        version: { increment: 1 },
        lastEditedById: auth.user.id,
        lastEditedAt: new Date(),
      },
    });

    await tx.statusTransition.create({
      data: {
        recordId: id,
        fromStatus: current.status,
        toStatus: parsed.data.toStatus,
        comment: parsed.data.comment,
        changedBy: auth.user.id,
      },
    });

    return next;
  });

  await writeAudit({
    action: AuditAction.STATUS_CHANGE,
    entityType: EntityType.RECORD,
    entityId: id,
    userId: auth.user.id,
    caseId: current.caseId,
    recordId: id,
    patch: {
      fromStatus: current.status,
      toStatus: parsed.data.toStatus,
      comment: parsed.data.comment,
    },
  });

  if (parsed.data.toStatus === "READY") {
    await notify({
      type: NotificationType.RECORD_READY_FOR_REVIEW,
      title: "Ficha lista para revision",
      message: `La ficha ${id.slice(0, 8)} fue enviada a READY por ${auth.user.name}`,
      caseId: current.caseId,
      recordId: id,
      roles: ["LITIGACION", "SUPERVISOR", "ADMIN"],
    });
  }

  if (parsed.data.toStatus === "NEEDS_CHANGES") {
    await notify({
      type: NotificationType.RECORD_NEEDS_CHANGES,
      title: "Ficha con solicitud de cambios",
      message: `La ficha ${id.slice(0, 8)} requiere cambios: ${parsed.data.comment}`,
      caseId: current.caseId,
      recordId: id,
      roles: ["FLAGRANCIA", "MP", "ADMIN"],
      metadata: { comment: parsed.data.comment },
    });
  }

  if (parsed.data.toStatus === "APPROVED") {
    await notify({
      type: NotificationType.RECORD_APPROVED,
      title: "Ficha aprobada",
      message: `La ficha ${id.slice(0, 8)} fue aprobada por ${auth.user.name}`,
      caseId: current.caseId,
      recordId: id,
      roles: ["FLAGRANCIA", "MP", "LITIGACION", "ADMIN"],
    });
  }

  return ok(updated);
}
