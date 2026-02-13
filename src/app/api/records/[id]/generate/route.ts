import { ArtifactFormat, ArtifactStatus, AuditAction, EntityType } from "@prisma/client";

import { fail, ok, requireApiUser } from "@/lib/api";
import { fichaPayloadSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { generatePdf, generatePptx } from "@/server/docgen/service";
import { writeAudit } from "@/server/services/audit";
import { saveArtifactBuffer } from "@/server/services/storage";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("artifact:generate");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const formatQuery = new URL(request.url).searchParams.get("format")?.toLowerCase();

  if (formatQuery !== "pptx" && formatQuery !== "pdf") {
    return fail("Formato invalido. Use pptx o pdf", 400);
  }

  const record = await prisma.record.findUnique({ where: { id } });
  if (!record) {
    return fail("Ficha no encontrada", 404);
  }

  const parsedPayload = fichaPayloadSchema.safeParse(record.payload);
  if (!parsedPayload.success) {
    return fail("La ficha tiene payload invalido", 409, parsedPayload.error.flatten());
  }

  let buffer: Buffer;
  let extension: string;
  let format: ArtifactFormat;

  try {
    if (formatQuery === "pptx") {
      const photoEvidence = await prisma.evidence.findFirst({
        where: {
          recordId: id,
          contentType: { in: ["image/png", "image/jpeg", "image/jpg", "image/webp"] },
        },
        orderBy: { createdAt: "asc" },
        select: { storagePath: true },
      });

      buffer = await generatePptx(parsedPayload.data, { photoPath: photoEvidence?.storagePath ?? null });
      extension = "pptx";
      format = ArtifactFormat.PPTX;
    } else {
      buffer = await generatePdf(parsedPayload.data);
      extension = "pdf";
      format = ArtifactFormat.PDF;
    }
  } catch (error) {
    await prisma.artifact.create({
      data: {
        recordId: id,
        format: formatQuery === "pptx" ? ArtifactFormat.PPTX : ArtifactFormat.PDF,
        status: ArtifactStatus.FAILED,
        fileName: `${id}.${formatQuery}`,
        storagePath: "",
        sizeBytes: 0,
        generatedById: auth.user.id,
      },
    });

    return fail("Error al generar documento", 500, {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  const saved = await saveArtifactBuffer(`record-${id}.${extension}`, buffer);

  const artifact = await prisma.artifact.create({
    data: {
      recordId: id,
      format,
      status: ArtifactStatus.READY,
      fileName: saved.fileName,
      storagePath: saved.storagePath,
      sizeBytes: saved.sizeBytes,
      generatedById: auth.user.id,
    },
  });

  await writeAudit({
    action: AuditAction.GENERATE_ARTIFACT,
    entityType: EntityType.ARTIFACT,
    entityId: artifact.id,
    userId: auth.user.id,
    caseId: record.caseId,
    recordId: id,
    after: {
      format: artifact.format,
      sizeBytes: artifact.sizeBytes,
      fileName: artifact.fileName,
    },
  });

  return ok(artifact, 201);
}
