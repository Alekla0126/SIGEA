import { AuditAction, EntityType, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AuditInput = {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  userId: string;
  caseId?: string;
  recordId?: string;
  before?: unknown;
  after?: unknown;
  patch?: unknown;
};

export async function writeAudit(input: AuditInput) {
  const diffCandidate =
    input.patch !== undefined
      ? { patch: input.patch }
      : input.before !== undefined || input.after !== undefined
        ? { before: input.before ?? null, after: input.after ?? null }
        : undefined;

  const diffJson: Prisma.InputJsonValue | undefined =
    diffCandidate === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(diffCandidate)) as Prisma.InputJsonValue);

  await prisma.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId,
      caseId: input.caseId,
      recordId: input.recordId,
      diffJson,
    },
  });
}
