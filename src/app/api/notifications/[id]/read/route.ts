import { fail, ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser("notification:read");
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== auth.user.id) {
    return fail("Notificacion no encontrada", 404);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return ok(updated);
}
