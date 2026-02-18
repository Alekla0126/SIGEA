import { notFound } from "next/navigation";

import { CaseDetailView } from "@/components/cases/case-detail";
import { requireSessionPage } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/types";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSessionPage("case:read");
  const { id } = await params;

  const oneCase = await prisma.case.findUnique({
    where: { id },
    include: {
      records: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          createdBy: {
            select: { id: true, name: true, role: true },
          },
          statusTransitions: {
            orderBy: { createdAt: "asc" },
            include: {
              changedByUser: {
                select: { id: true, name: true, role: true },
              },
            },
          },
        },
      },
      audits: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      },
    },
  });

  if (!oneCase) {
    notFound();
  }

  return <CaseDetailView data={oneCase as unknown as Parameters<typeof CaseDetailView>[0]["data"]} role={session.role as Role} />;
}
