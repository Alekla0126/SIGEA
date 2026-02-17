import { AuditAction, EntityType } from "@prisma/client";

import { fail, ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/server/services/audit";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("case:purge");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const current = await prisma.case.findUnique({ where: { id } });
  if (!current) {
    return fail("Caso no encontrado", 404);
  }

  if (!current.deletedAt) {
    return fail("Primero envia el caso a papelera.", 409);
  }

  await prisma.case.delete({ where: { id } });

  try {
    await writeAudit({
      action: AuditAction.DELETE,
      entityType: EntityType.CASE,
      entityId: id,
      userId: auth.user.id,
      // No referenciar caseId como FK porque el caso ya fue borrado.
      before: {
        id: current.id,
        folio: current.folio,
        title: current.title,
        deletedAt: current.deletedAt,
        createdAt: current.createdAt,
      },
    });
  } catch (error) {
    console.error("writeAudit(case.purge) failed", error);
  }

  return ok({ purged: true });
}

