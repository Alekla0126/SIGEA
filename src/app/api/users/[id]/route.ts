import { AuditAction, EntityType } from "@prisma/client";

import { hashPassword } from "@/lib/auth";
import { fail, ok, parseBody, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { userPatchSchema } from "@/lib/validators";
import { writeAudit } from "@/server/services/audit";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("user:manage");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id },
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

  if (!user) {
    return fail("Usuario no encontrado", 404);
  }

  return ok(user);
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
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) {
    return fail("Usuario no encontrado", 404);
  }

  const parsed = await parseBody(request, userPatchSchema);
  if (parsed.error) {
    return parsed.error;
  }

  if (parsed.data.email && parsed.data.email.toLowerCase() !== current.email) {
    const duplicate = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (duplicate) {
      return fail("El correo ya esta registrado", 409);
    }
  }

  const updateData: {
    name?: string;
    email?: string;
    role?: typeof current.role;
    isActive?: boolean;
    passwordHash?: string;
  } = {
    name: parsed.data.name,
    email: parsed.data.email?.toLowerCase(),
    role: parsed.data.role,
    isActive: parsed.data.isActive,
  };

  if (parsed.data.password) {
    updateData.passwordHash = await hashPassword(parsed.data.password);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
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
    action: AuditAction.UPDATE,
    entityType: EntityType.USER,
    entityId: id,
    userId: auth.user.id,
    before: {
      name: current.name,
      email: current.email,
      role: current.role,
      isActive: current.isActive,
    },
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
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) {
    return fail("Usuario no encontrado", 404);
  }

  if (current.id === auth.user.id) {
    return fail("No puedes borrar tu propio usuario", 400);
  }

  await prisma.user.delete({ where: { id } });

  await writeAudit({
    action: AuditAction.DELETE,
    entityType: EntityType.USER,
    entityId: id,
    userId: auth.user.id,
    before: {
      name: current.name,
      email: current.email,
      role: current.role,
    },
  });

  return ok({ deleted: true });
}
