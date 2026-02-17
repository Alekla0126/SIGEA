import { ArtifactFormat, ArtifactStatus, AuditAction, EntityType } from "@prisma/client";

import { fail, ok, requireApiUser } from "@/lib/api";
import { fichaPayloadSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { generatePdf, generatePptx } from "@/server/docgen/service";
import { writeAudit } from "@/server/services/audit";
import { saveArtifactBuffer } from "@/server/services/storage";

export const runtime = "nodejs";

function contentDisposition(fileName: string) {
  const fallback = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "archivo";
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

async function generateAndStoreArtifact({
  recordId,
  userId,
  formatQuery,
  template,
}: {
  recordId: string;
  userId: string;
  formatQuery: "pptx" | "pdf";
  template: "mampara" | "tarjeta" | "ficha";
}) {
  const record = await prisma.record.findUnique({ where: { id: recordId } });
  if (!record) {
    return { error: fail("Ficha no encontrada", 404), data: null };
  }

  const parsedPayload = fichaPayloadSchema.safeParse(record.payload);
  if (!parsedPayload.success) {
    return { error: fail("La ficha tiene payload invalido", 409, parsedPayload.error.flatten()), data: null };
  }

  let buffer: Buffer;
  let extension: string;
  let format: ArtifactFormat;

  try {
    const photoEvidence =
      template === "mampara" || template === "tarjeta"
        ? await prisma.evidence.findFirst({
            where: {
              recordId,
              contentType: { in: ["image/png", "image/jpeg", "image/jpg"] },
            },
            // Se usa la imagen mas reciente como foto de la mampara.
            orderBy: { createdAt: "desc" },
            select: { storagePath: true },
          })
        : null;

    if (formatQuery === "pptx") {
      buffer = await generatePptx(parsedPayload.data, {
        template,
        photoPath: photoEvidence?.storagePath ?? null,
      });
      extension = "pptx";
      format = ArtifactFormat.PPTX;
    } else {
      buffer = await generatePdf(parsedPayload.data, {
        template,
        photoPath: photoEvidence?.storagePath ?? null,
      });
      extension = "pdf";
      format = ArtifactFormat.PDF;
    }
  } catch (error) {
    await prisma.artifact.create({
      data: {
        recordId,
        format: formatQuery === "pptx" ? ArtifactFormat.PPTX : ArtifactFormat.PDF,
        status: ArtifactStatus.FAILED,
        fileName: `${recordId}.${formatQuery}`,
        storagePath: "",
        sizeBytes: 0,
        generatedById: userId,
      },
    });

    return {
      error: fail("Error al generar documento", 500, {
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      data: null,
    };
  }

  const saved = await saveArtifactBuffer(
    `record-${recordId}-${template}.${extension}`,
    buffer,
  );

  const artifact = await prisma.artifact.create({
    data: {
      recordId,
      format,
      status: ArtifactStatus.READY,
      fileName: saved.fileName,
      storagePath: saved.storagePath,
      sizeBytes: saved.sizeBytes,
      generatedById: userId,
    },
  });

  await writeAudit({
    action: AuditAction.GENERATE_ARTIFACT,
    entityType: EntityType.ARTIFACT,
    entityId: artifact.id,
    userId,
    caseId: record.caseId,
    recordId,
    after: {
      format: artifact.format,
      sizeBytes: artifact.sizeBytes,
      fileName: artifact.fileName,
      template,
    },
  });

  const mimeType =
    artifact.format === "PPTX"
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/pdf";

  return {
    error: null,
    data: {
      artifact,
      buffer,
      mimeType,
    },
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  // Descarga directa (mas confiable en iPhone): abre la URL y el navegador inicia la descarga.
  const auth = await requireApiUser("artifact:generate");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const formatQuery = searchParams.get("format")?.toLowerCase();

  if (formatQuery !== "pptx" && formatQuery !== "pdf") {
    return fail("Formato invalido. Use pptx o pdf", 400);
  }

  const templateQuery = searchParams.get("template")?.toLowerCase();
  const template = templateQuery || (formatQuery === "pdf" ? "ficha" : "mampara");

  if (template !== "mampara" && template !== "tarjeta" && template !== "ficha") {
    return fail("Template invalido. Use mampara, tarjeta o ficha", 400);
  }

  if (formatQuery === "pdf" && template !== "ficha") {
    return fail("Template invalido para PDF. Use ficha", 400);
  }

  const generated = await generateAndStoreArtifact({
    recordId: id,
    userId: auth.user.id,
    formatQuery,
    template: template as "mampara" | "tarjeta" | "ficha",
  });

  if (generated.error) {
    return generated.error;
  }

  return new Response(new Uint8Array(generated.data.buffer), {
    status: 200,
    headers: {
      "Content-Type": generated.data.mimeType,
      "Content-Disposition": contentDisposition(generated.data.artifact.fileName),
      "Content-Length": String(generated.data.buffer.length),
      "Cache-Control": "no-store",
      "X-Artifact-Id": generated.data.artifact.id,
    },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("artifact:generate");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const formatQuery = searchParams.get("format")?.toLowerCase();

  if (formatQuery !== "pptx" && formatQuery !== "pdf") {
    return fail("Formato invalido. Use pptx o pdf", 400);
  }

  const templateQuery = searchParams.get("template")?.toLowerCase();
  const template = templateQuery || (formatQuery === "pdf" ? "ficha" : "mampara");

  if (template !== "mampara" && template !== "tarjeta" && template !== "ficha") {
    return fail("Template invalido. Use mampara, tarjeta o ficha", 400);
  }

  if (formatQuery === "pdf" && template !== "ficha") {
    return fail("Template invalido para PDF. Use ficha", 400);
  }

  const generated = await generateAndStoreArtifact({
    recordId: id,
    userId: auth.user.id,
    formatQuery,
    template: template as "mampara" | "tarjeta" | "ficha",
  });

  if (generated.error) {
    return generated.error;
  }

  return ok(generated.data.artifact, 201);
}
