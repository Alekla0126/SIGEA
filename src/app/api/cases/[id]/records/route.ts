import { AuditAction, CurrentArea, EntityType, NotificationType } from "@prisma/client";

import { fail, ok, parseBody, requireApiUser } from "@/lib/api";
import { defaultModuleOwner } from "@/lib/records";
import { recordCreateSchema } from "@/lib/validators";
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

  const { id: caseId } = await context.params;
  const records = await prisma.record.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
    include: {
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
        select: {
          id: true,
          originalName: true,
          contentType: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          evidences: true,
          artifacts: true,
        },
      },
    },
  });

  return ok(records);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("record:create");
  if (auth.error) {
    return auth.error;
  }

  const { id: caseId } = await context.params;
  const owningCase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!owningCase) {
    return fail("Caso no encontrado", 404);
  }

  if (owningCase.deletedAt) {
    return fail("El caso esta en papelera. Restaura el caso para crear fichas.", 409);
  }

  const parsed = await parseBody(request, recordCreateSchema);
  if (parsed.error) {
    return parsed.error;
  }

  const moduleOwner = parsed.data.moduleOwner ?? defaultModuleOwner(auth.user.role);

  const newRecord = await prisma.record.create({
    data: {
      caseId,
      payload: parsed.data.payload,
      moduleOwner,
      currentArea: CurrentArea.FLAGRANCIA,
      createdById: auth.user.id,
      lastEditedById: auth.user.id,
      lastEditedAt: new Date(),
    },
  });

  await writeAudit({
    action: AuditAction.CREATE,
    entityType: EntityType.RECORD,
    entityId: newRecord.id,
    userId: auth.user.id,
    caseId,
    recordId: newRecord.id,
    after: newRecord,
  });

  await notify({
    type: NotificationType.RECORD_CREATED,
    title: "Nueva ficha creada",
    message: `Se creo la ficha ${newRecord.id.slice(0, 8)} para el caso ${owningCase.folio}`,
    caseId,
    recordId: newRecord.id,
    roles: ["LITIGACION", "SUPERVISOR", "ADMIN"],
  });

  return ok(newRecord, 201);
}
