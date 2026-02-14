import { AuditAction, EntityType, NotificationType } from "@prisma/client";

import { fail, ok, parseBody, requireApiUser } from "@/lib/api";
import { inferCurrentAreaByRole } from "@/lib/records";
import { recordPatchSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/server/services/audit";
import { notify } from "@/server/services/notifications";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("record:read");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const record = await prisma.record.findUnique({
    where: { id },
    include: {
      case: {
        select: {
          id: true,
          folio: true,
          title: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      lastEditedBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      evidences: {
        orderBy: { createdAt: "desc" },
      },
      statusTransitions: {
        orderBy: { createdAt: "asc" },
        include: {
          changedByUser: {
            select: { id: true, name: true, role: true },
          },
        },
      },
      artifacts: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!record) {
    return fail("Ficha no encontrada", 404);
  }

  return ok(record);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("record:update");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const current = await prisma.record.findUnique({ where: { id } });
  if (!current) {
    return fail("Ficha no encontrada", 404);
  }

  const parsed = await parseBody(request, recordPatchSchema);
  if (parsed.error) {
    return parsed.error;
  }

  const nextArea = parsed.data.currentArea ?? inferCurrentAreaByRole(auth.user.role);

  const updated = await prisma.record.update({
    where: { id },
    data: {
      payload: parsed.data.payload,
      currentArea: nextArea,
      version: { increment: 1 },
      lastEditedById: auth.user.id,
      lastEditedAt: new Date(),
    },
  });

  await writeAudit({
    action: AuditAction.UPDATE,
    entityType: EntityType.RECORD,
    entityId: id,
    userId: auth.user.id,
    caseId: current.caseId,
    recordId: id,
    before: current,
    after: updated,
  });

  await notify({
    type: NotificationType.RECORD_UPDATED,
    title: "Ficha actualizada",
    message: `La ficha ${id.slice(0, 8)} fue actualizada por ${auth.user.name}`,
    caseId: current.caseId,
    recordId: id,
    roles: ["FLAGRANCIA", "MP", "LITIGACION", "SUPERVISOR", "ADMIN"],
  });

  return ok(updated);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("record:delete");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const current = await prisma.record.findUnique({ where: { id } });
  if (!current) {
    return fail("Ficha no encontrada", 404);
  }

  await prisma.record.delete({ where: { id } });

  try {
    await writeAudit({
      action: AuditAction.DELETE,
      entityType: EntityType.RECORD,
      entityId: id,
      userId: auth.user.id,
      caseId: current.caseId,
      // No referenciar recordId como FK porque la ficha ya fue borrada.
      // Guardar solo un resumen minimiza riesgo de errores/limites en diffJson.
      before: {
        id: current.id,
        caseId: current.caseId,
        status: current.status,
        version: current.version,
        createdAt: current.createdAt,
      },
    });
  } catch (error) {
    console.error("writeAudit(record.delete) failed", error);
  }

  return ok({ deleted: true });
}
