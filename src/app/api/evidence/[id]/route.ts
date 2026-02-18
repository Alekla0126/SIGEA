import { AuditAction, EntityType } from "@prisma/client";
import fs from "node:fs/promises";

import { fail, ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/server/services/audit";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("evidence:delete");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const evidence = await prisma.evidence.findUnique({
    where: { id },
    include: {
      record: {
        select: { caseId: true, deletedAt: true },
      },
    },
  });

  if (!evidence) {
    return fail("Evidencia no encontrada", 404);
  }
  if (evidence.record.deletedAt) {
    return fail("La ficha esta en papelera. Restaurala para modificar evidencias.", 409);
  }

  await prisma.evidence.delete({ where: { id } });

  await fs.unlink(evidence.storagePath).catch(() => null);

  try {
    await writeAudit({
      action: AuditAction.EVIDENCE,
      entityType: EntityType.EVIDENCE,
      entityId: id,
      userId: auth.user.id,
      caseId: evidence.record.caseId,
      recordId: evidence.recordId,
      before: {
        originalName: evidence.originalName,
        sizeBytes: evidence.sizeBytes,
      },
    });
  } catch (error) {
    console.error("writeAudit(evidence.delete) failed", error);
  }

  return ok({ deleted: true });
}
