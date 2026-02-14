import { fail, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/server/services/storage";

export const runtime = "nodejs";

function contentDisposition(fileName: string) {
  const fallback = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "archivo";
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("record:read");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const artifact = await prisma.artifact.findUnique({ where: { id } });
  if (!artifact) {
    return fail("Archivo no encontrado", 404);
  }

  try {
    const fileBuffer = await readStoredFile(artifact.storagePath);
    const mimeType = artifact.format === "PPTX"
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/pdf";

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": contentDisposition(artifact.fileName),
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch {
    return fail("No se pudo leer el archivo", 500);
  }
}
