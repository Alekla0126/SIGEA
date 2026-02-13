import { RecordStatus } from "@prisma/client";

import { ok, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireApiUser("report:read");
  if (auth.error) {
    return auth.error;
  }

  const [
    totalCases,
    totalRecords,
    totalEvidence,
    totalApproved,
    totalNeedsChanges,
    statusCounts,
    artifactsByFormat,
  ] = await Promise.all([
    prisma.case.count(),
    prisma.record.count(),
    prisma.evidence.count(),
    prisma.record.count({ where: { status: RecordStatus.APPROVED } }),
    prisma.record.count({ where: { status: RecordStatus.NEEDS_CHANGES } }),
    prisma.record.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.artifact.groupBy({
      by: ["format"],
      _count: { _all: true },
    }),
  ]);

  return ok({
    totalCases,
    totalRecords,
    totalEvidence,
    totalApproved,
    totalNeedsChanges,
    approvalRate: totalRecords > 0 ? Number(((totalApproved / totalRecords) * 100).toFixed(2)) : 0,
    statusCounts,
    artifactsByFormat,
  });
}
