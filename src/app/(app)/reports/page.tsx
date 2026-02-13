import { requireSessionPage } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReportsPage() {
  await requireSessionPage("report:read");

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
    prisma.record.count({ where: { status: "APPROVED" } }),
    prisma.record.count({ where: { status: "NEEDS_CHANGES" } }),
    prisma.record.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.artifact.groupBy({ by: ["format"], _count: { _all: true } }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>KPIs SIGEA</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Tablero operativo para seguimiento de productividad, revision y salida documental.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Casos" value={totalCases} />
        <Metric title="Fichas" value={totalRecords} />
        <Metric title="Evidencias" value={totalEvidence} />
        <Metric title="Aprobadas" value={totalApproved} />
        <Metric title="Needs Changes" value={totalNeedsChanges} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estatus de fichas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusCounts.length === 0 ? <p className="text-sm text-slate-500">Sin datos.</p> : null}
            {statusCounts.map((entry) => (
              <p key={entry.status} className="text-sm text-slate-700">
                {entry.status}: {entry._count._all}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Documentos generados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {artifactsByFormat.length === 0 ? <p className="text-sm text-slate-500">Sin datos.</p> : null}
            {artifactsByFormat.map((entry) => (
              <p key={entry.format} className="text-sm text-slate-700">
                {entry.format}: {entry._count._all}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-slate-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
