import { AuditAction, EntityType } from "@prisma/client";

import { fail, ok, parseBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { catalogCreateSchema } from "@/lib/validators";
import { writeAudit } from "@/server/services/audit";

export async function GET(request: Request) {
  const auth = await requireApiUser("record:read");
  if (auth.error) {
    return auth.error;
  }

  const category = new URL(request.url).searchParams.get("category") || undefined;

  const items = await prisma.catalogItem.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });

  return ok(items);
}

export async function POST(request: Request) {
  const auth = await requireApiUser("user:manage");
  if (auth.error) {
    return auth.error;
  }

  const parsed = await parseBody(request, catalogCreateSchema);
  if (parsed.error) {
    return parsed.error;
  }

  const duplicate = await prisma.catalogItem.findUnique({
    where: {
      category_code: {
        category: parsed.data.category,
        code: parsed.data.code,
      },
    },
  });

  if (duplicate) {
    return fail("Ya existe ese codigo en la categoria", 409);
  }

  const created = await prisma.catalogItem.create({
    data: {
      category: parsed.data.category,
      code: parsed.data.code,
      label: parsed.data.label,
      isActive: parsed.data.isActive,
      createdById: auth.user.id,
    },
  });

  await writeAudit({
    action: AuditAction.CREATE,
    entityType: EntityType.CATALOG,
    entityId: created.id,
    userId: auth.user.id,
    after: created,
  });

  return ok(created, 201);
}
