import { AuditAction, EntityType } from "@prisma/client";

import { fail, ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/server/services/audit";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("case:restore");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const current = await prisma.case.findUnique({ where: { id } });
  if (!current) {
    return fail("Caso no encontrado", 404);
  }

  if (!current.deletedAt) {
    return fail("El caso no esta en papelera.", 409);
  }

  const restored = await prisma.case.update({
    where: { id },
    data: {
      deletedAt: null,
      deletedById: null,
    },
  });

  await writeAudit({
    action: AuditAction.UPDATE,
    entityType: EntityType.CASE,
    entityId: id,
    userId: auth.user.id,
    caseId: id,
    before: current,
    after: restored,
  });

  return ok({ restored: true });
}

