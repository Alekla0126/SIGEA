import { AuditAction, EntityType } from "@prisma/client";

import { fail, ok, parseBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { catalogPatchSchema } from "@/lib/validators";
import { writeAudit } from "@/server/services/audit";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("record:read");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const item = await prisma.catalogItem.findUnique({ where: { id } });

  if (!item) {
    return fail("Catalogo no encontrado", 404);
  }

  return ok(item);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("user:manage");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const current = await prisma.catalogItem.findUnique({ where: { id } });
  if (!current) {
    return fail("Catalogo no encontrado", 404);
  }

  const parsed = await parseBody(request, catalogPatchSchema);
  if (parsed.error) {
    return parsed.error;
  }

  const nextCategory = parsed.data.category ?? current.category;
  const nextCode = parsed.data.code ?? current.code;

  if (nextCategory !== current.category || nextCode !== current.code) {
    const duplicate = await prisma.catalogItem.findUnique({
      where: {
        category_code: {
          category: nextCategory,
          code: nextCode,
        },
      },
    });

    if (duplicate && duplicate.id !== id) {
      return fail("Ya existe ese codigo en la categoria", 409);
    }
  }

  const updated = await prisma.catalogItem.update({
    where: { id },
    data: parsed.data,
  });

  await writeAudit({
    action: AuditAction.UPDATE,
    entityType: EntityType.CATALOG,
    entityId: id,
    userId: auth.user.id,
    before: current,
    after: updated,
  });

  return ok(updated);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("user:manage");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const current = await prisma.catalogItem.findUnique({ where: { id } });
  if (!current) {
    return fail("Catalogo no encontrado", 404);
  }

  await prisma.catalogItem.delete({ where: { id } });

  await writeAudit({
    action: AuditAction.DELETE,
    entityType: EntityType.CATALOG,
    entityId: id,
    userId: auth.user.id,
    before: current,
  });

  return ok({ deleted: true });
}
