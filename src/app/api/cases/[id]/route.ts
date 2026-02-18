import { AuditAction, EntityType } from "@prisma/client";

import { casePatchSchema } from "@/lib/validators";
import { fail, ok, parseBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/server/services/audit";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("case:read");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const oneCase = await prisma.case.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      deletedBy: {
        select: { id: true, name: true, role: true },
      },
      records: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: { select: { id: true, name: true, role: true } },
          lastEditedBy: { select: { id: true, name: true, role: true } },
          statusTransitions: {
            orderBy: { createdAt: "asc" },
            include: {
              changedByUser: {
                select: { id: true, name: true, role: true },
              },
            },
          },
          evidences: {
            select: {
              id: true,
              originalName: true,
              contentType: true,
              sizeBytes: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          artifacts: {
            select: {
              id: true,
              format: true,
              status: true,
              fileName: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      audits: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      },
    },
  });

  if (!oneCase) {
    return fail("Caso no encontrado", 404);
  }

  return ok(oneCase);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("case:update");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const parsed = await parseBody(request, casePatchSchema);
  if (parsed.error) {
    return parsed.error;
  }

  const current = await prisma.case.findUnique({ where: { id } });
  if (!current) {
    return fail("Caso no encontrado", 404);
  }

  if (current.deletedAt) {
    return fail("El caso esta en papelera. Restaura el caso para editarlo.", 409);
  }

  if (parsed.data.folio && parsed.data.folio !== current.folio) {
    const duplicate = await prisma.case.findUnique({ where: { folio: parsed.data.folio } });
    if (duplicate) {
      return fail("El folio ya existe", 409);
    }
  }

  const updated = await prisma.case.update({
    where: { id },
    data: parsed.data,
  });

  await writeAudit({
    action: AuditAction.UPDATE,
    entityType: EntityType.CASE,
    entityId: id,
    userId: auth.user.id,
    caseId: id,
    before: current,
    after: updated,
  });

  return ok(updated);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("case:delete");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const current = await prisma.case.findUnique({ where: { id } });
  if (!current) {
    return fail("Caso no encontrado", 404);
  }

  if (current.deletedAt) {
    return fail("El caso ya esta en papelera.", 409);
  }

  const trashed = await prisma.case.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: auth.user.id,
    },
  });

  await writeAudit({
    action: AuditAction.DELETE,
    entityType: EntityType.CASE,
    entityId: id,
    userId: auth.user.id,
    caseId: id,
    before: current,
    after: trashed,
  });

  return ok({ trashed: true });
}
