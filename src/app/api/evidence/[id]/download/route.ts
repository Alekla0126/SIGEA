import { fail, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/server/services/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("record:read");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const evidence = await prisma.evidence.findUnique({ where: { id } });
  if (!evidence) {
    return fail("Evidencia no encontrada", 404);
  }

  try {
    const fileBuffer = await readStoredFile(evidence.storagePath);
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": evidence.contentType,
        "Content-Disposition": `attachment; filename=\"${encodeURIComponent(evidence.originalName)}\"`,
      },
    });
  } catch {
    return fail("No se pudo leer el archivo", 500);
  }
}
