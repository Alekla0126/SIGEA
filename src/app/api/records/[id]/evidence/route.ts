import { AuditAction, EntityType, NotificationType } from "@prisma/client";

import { fail, ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/server/services/audit";
import { notify } from "@/server/services/notifications";
import { saveUploadedFile } from "@/server/services/storage";

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("evidence:add");
  if (auth.error) {
    return auth.error;
  }

  const { id: recordId } = await context.params;
  const record = await prisma.record.findUnique({ where: { id: recordId } });
  if (!record) {
    return fail("Ficha no encontrada", 404);
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return fail("Archivo invalido", 400);
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE) {
    return fail("Tamano de archivo invalido (max 20MB)", 400);
  }

  const saved = await saveUploadedFile(file);

  const evidence = await prisma.evidence.create({
    data: {
      recordId,
      filename: saved.filename,
      originalName: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: saved.sizeBytes,
      storagePath: saved.absolutePath,
      uploadedById: auth.user.id,
    },
  });

  await writeAudit({
    action: AuditAction.EVIDENCE,
    entityType: EntityType.EVIDENCE,
    entityId: evidence.id,
    userId: auth.user.id,
    caseId: record.caseId,
    recordId,
    after: {
      originalName: evidence.originalName,
      sizeBytes: evidence.sizeBytes,
      contentType: evidence.contentType,
    },
  });

  await notify({
    type: NotificationType.EVIDENCE_ADDED,
    title: "Evidencia agregada",
    message: `Se agrego evidencia ${evidence.originalName} a la ficha ${recordId.slice(0, 8)}`,
    caseId: record.caseId,
    recordId,
    roles: ["FLAGRANCIA", "MP", "LITIGACION", "SUPERVISOR", "ADMIN"],
  });

  return ok(evidence, 201);
}
