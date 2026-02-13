import { RecordsBoard } from "@/components/records/records-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionPage } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

export default async function RecordsListPage() {
  await requireSessionPage("record:read");

  const records = await prisma.record.findMany({
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
          <p className="text-sm text-slate-600">
            Lista global de fichas (todas las areas). Para crear una ficha nueva, primero abre un caso.
          </p>
        </CardContent>
      </Card>

      <RecordsBoard initialRecords={records as unknown as Parameters<typeof RecordsBoard>[0]["initialRecords"]} />
    </div>
  );
}
