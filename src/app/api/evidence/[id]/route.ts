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
        select: { caseId: true },
      },
    },
  });

  if (!evidence) {
    return fail("Evidencia no encontrada", 404);
  }

  await prisma.evidence.delete({ where: { id } });

  await fs.unlink(evidence.storagePath).catch(() => null);

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

  return ok({ deleted: true });
}
