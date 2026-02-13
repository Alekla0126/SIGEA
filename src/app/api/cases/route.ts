import { AuditAction, EntityType } from "@prisma/client";

import { caseCreateSchema } from "@/lib/validators";
import { fail, ok, parseBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/server/services/audit";

export async function GET() {
  const auth = await requireApiUser("case:read");
  if (auth.error) {
    return auth.error;
  }

  const cases = await prisma.case.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: { id: true, name: true, role: true },
      },
      records: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      _count: {
        select: {
          records: true,
        },
      },
    },
  });

  return ok(cases);
}

export async function POST(request: Request) {
  const auth = await requireApiUser("case:create");
  if (auth.error) {
    return auth.error;
  }

  const parsed = await parseBody(request, caseCreateSchema);
  if (parsed.error) {
    return parsed.error;
  }

  const existing = await prisma.case.findUnique({ where: { folio: parsed.data.folio } });
  if (existing) {
    return fail("El folio ya existe", 409);
  }

  const newCase = await prisma.case.create({
    data: {
      folio: parsed.data.folio,
      title: parsed.data.title,
      description: parsed.data.description,
      createdById: auth.user.id,
    },
  });

  await writeAudit({
    action: AuditAction.CREATE,
    entityType: EntityType.CASE,
    entityId: newCase.id,
    userId: auth.user.id,
    caseId: newCase.id,
    after: newCase,
  });

  return ok(newCase, 201);
}
