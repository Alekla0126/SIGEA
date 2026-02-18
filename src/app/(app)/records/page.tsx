import { RecordsBoard } from "@/components/records/records-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionPage } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/types";

export default async function RecordsListPage() {
  const session = await requireSessionPage("record:read");

  const activeRecords = await prisma.record.findMany({
    where: {
      case: { deletedAt: null },
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    include: {
      case: {
        select: {
          id: true,
          folio: true,
          title: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          evidences: true,
          artifacts: true,
        },
      },
    },
  });

  const trashedRecords = await prisma.record.findMany({
    where: {
      deletedAt: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      case: {
        select: {
          id: true,
          folio: true,
          title: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          evidences: true,
          artifacts: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fichas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Lista global de fichas (todas las areas). Para crear una ficha nueva, primero abre un caso.
          </p>
        </CardContent>
      </Card>

      <RecordsBoard
        role={session.role as Role}
        initialRecords={activeRecords as unknown as Parameters<typeof RecordsBoard>[0]["initialRecords"]}
        initialTrashRecords={trashedRecords as unknown as Parameters<typeof RecordsBoard>[0]["initialTrashRecords"]}
      />
    </div>
  );
}
