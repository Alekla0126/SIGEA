import { AuditAction, EntityType } from "@prisma/client";

import { fail, ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/server/services/audit";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("record:purge");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const current = await prisma.record.findUnique({ where: { id } });
  if (!current) {
    return fail("Ficha no encontrada", 404);
  }

  if (!current.deletedAt) {
    return fail("Primero envia la ficha a papelera.", 409);
  }

  await prisma.record.delete({ where: { id } });

  try {
    await writeAudit({
      action: AuditAction.DELETE,
      entityType: EntityType.RECORD,
      entityId: id,
      userId: auth.user.id,
      caseId: current.caseId,
      before: {
        id: current.id,
        caseId: current.caseId,
        status: current.status,
        version: current.version,
        deletedAt: current.deletedAt,
        createdAt: current.createdAt,
      },
    });
  } catch (error) {
    console.error("writeAudit(record.purge) failed", error);
  }

  return ok({ purged: true });
}

