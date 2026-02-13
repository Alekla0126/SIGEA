import { notFound } from "next/navigation";

import { RecordEditor } from "@/components/records/record-editor";
import { appConfig } from "@/lib/config";
import { requireSessionPage } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/types";

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionPage("record:read");
  const { id } = await params;

  const record = await prisma.record.findUnique({
    where: { id },
    include: {
      case: {
        select: {
          id: true,
          folio: true,
          title: true,
        },
      },
      evidences: {
        orderBy: { createdAt: "desc" },
      },
      artifacts: {
        orderBy: { createdAt: "desc" },
      },
      statusTransitions: {
        orderBy: { createdAt: "asc" },
        include: {
          changedByUser: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!record) {
    notFound();
  }

  return (
    <RecordEditor
      record={record as unknown as Parameters<typeof RecordEditor>[0]["record"]}
      role={session.role as Role}
      litigacionReadyEnabled={appConfig.litigacionCanSetReady}
      litigacionCanDeleteEvidence={appConfig.litigacionCanDeleteEvidence}
    />
  );
}
