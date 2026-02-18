import { CasesBoard } from "@/components/cases/cases-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionPage } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import type { CaseItem, Role } from "@/lib/types";

export default async function CasesPage() {
  const session = await requireSessionPage("case:read");

  const cases = await prisma.case.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      records: {
        where: { deletedAt: null },
        select: {
          id: true,
          status: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          records: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Casos y fichas consecutivas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Flujo oficial: Flagrancia / MP capturan y Litigacion edita fichas existentes sin crear ni borrar.
          </p>
        </CardContent>
      </Card>
      <CasesBoard initialCases={cases as unknown as CaseItem[]} role={session.role as Role} />
    </div>
  );
}
