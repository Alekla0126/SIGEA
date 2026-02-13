import { NotificationType, Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type NotifyInput = {
  type: NotificationType;
  title: string;
  message: string;
  caseId?: string;
  recordId?: string;
  metadata?: unknown;
  userIds?: string[];
  roles?: Role[];
};

export async function notify(input: NotifyInput) {
  const recipients = new Set<string>(input.userIds ?? []);

  if (input.roles && input.roles.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        role: { in: input.roles },
        isActive: true,
      },
      select: { id: true },
    });
    for (const user of users) {
      recipients.add(user.id);
    }
  }

  if (recipients.size === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: Array.from(recipients).map((userId) => ({
      type: input.type,
      title: input.title,
      message: input.message,
      caseId: input.caseId,
      recordId: input.recordId,
      userId,
      metadata: input.metadata ? (input.metadata as object) : undefined,
    })),
  });
}
