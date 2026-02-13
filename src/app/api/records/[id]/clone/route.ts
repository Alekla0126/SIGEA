import { AuditAction, CurrentArea, EntityType, NotificationType, type Prisma } from "@prisma/client";

import { fail, ok, requireApiUser } from "@/lib/api";
import { defaultModuleOwner } from "@/lib/records";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/server/services/audit";
import { notify } from "@/server/services/notifications";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("record:create");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const source = await prisma.record.findUnique({ where: { id } });
  if (!source) {
    return fail("Ficha origen no encontrada", 404);
  }

  const owningCase = await prisma.case.findUnique({ where: { id: source.caseId } });
  if (!owningCase) {
    return fail("Caso no encontrado", 404);
  }

  // Prisma JsonValue includes null in its type; normalize to InputJsonValue for inserts.
  const clonedPayload = JSON.parse(JSON.stringify(source.payload)) as Prisma.InputJsonValue;

  const newRecord = await prisma.record.create({
    data: {
      caseId: source.caseId,
      payload: clonedPayload,
      moduleOwner: defaultModuleOwner(auth.user.role),
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
    caseId: source.caseId,
    recordId: newRecord.id,
    after: {
      ...newRecord,
      clonedFromRecordId: source.id,
    },
  });

  await notify({
    type: NotificationType.RECORD_CREATED,
    title: "Ficha clonada",
    message: `Se clono la ficha ${source.id.slice(0, 8)} -> ${newRecord.id.slice(0, 8)} (caso ${owningCase.folio})`,
    caseId: source.caseId,
    recordId: newRecord.id,
    roles: ["LITIGACION", "SUPERVISOR", "ADMIN"],
    metadata: { clonedFromRecordId: source.id },
  });

  return ok(newRecord, 201);
}
