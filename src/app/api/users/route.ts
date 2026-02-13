import { AuditAction, EntityType } from "@prisma/client";

import { hashPassword } from "@/lib/auth";
import { fail, ok, parseBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { userCreateSchema } from "@/lib/validators";
import { writeAudit } from "@/server/services/audit";

export async function GET() {
  const auth = await requireApiUser("user:manage");
  if (auth.error) {
    return auth.error;
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return ok(users);
}

export async function POST(request: Request) {
  const auth = await requireApiUser("user:manage");
  if (auth.error) {
    return auth.error;
  }

  const parsed = await parseBody(request, userCreateSchema);
  if (parsed.error) {
    return parsed.error;
  }

  const duplicate = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (duplicate) {
    return fail("El correo ya esta registrado", 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await writeAudit({
    action: AuditAction.CREATE,
    entityType: EntityType.USER,
    entityId: user.id,
    userId: auth.user.id,
    after: user,
  });

  return ok(user, 201);
}
