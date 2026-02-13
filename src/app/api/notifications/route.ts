import { ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireApiUser("notification:read");
  if (auth.error) {
    return auth.error;
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok(notifications);
}
