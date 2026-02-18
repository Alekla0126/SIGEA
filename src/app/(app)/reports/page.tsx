import { requireSessionPage } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { recordStatusLabel } from "@/lib/labels";

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
    prisma.case.count({ where: { deletedAt: null } }),
    prisma.record.count({ where: { case: { deletedAt: null }, deletedAt: null } }),
    prisma.evidence.count({ where: { record: { case: { deletedAt: null }, deletedAt: null } } }),
    prisma.record.count({ where: { status: "APPROVED", case: { deletedAt: null }, deletedAt: null } }),
    prisma.record.count({ where: { status: "NEEDS_CHANGES", case: { deletedAt: null }, deletedAt: null } }),
    prisma.record.groupBy({ by: ["status"], where: { case: { deletedAt: null }, deletedAt: null }, _count: { _all: true } }),
    prisma.artifact.groupBy({ by: ["format"], where: { record: { case: { deletedAt: null }, deletedAt: null } }, _count: { _all: true } }),
  ]);

  const monthsToShow = 12;
  const monthKeys = buildRecentMonthKeysUtc(monthsToShow);
  const oldestMonthStart = startOfMonthUtc(parseMonthKeyUtc(monthKeys[0] ?? monthKeyUtc(new Date())));

  const [casesRecent, recordsRecent, evidenceRecent, artifactsRecent, transitionsRecent] = await Promise.all([
    prisma.case.findMany({
      where: { createdAt: { gte: oldestMonthStart }, deletedAt: null },
      select: { createdAt: true },
    }),
    prisma.record.findMany({
      where: { createdAt: { gte: oldestMonthStart }, case: { deletedAt: null }, deletedAt: null },
      select: { createdAt: true },
    }),
    prisma.evidence.findMany({
      where: { createdAt: { gte: oldestMonthStart }, record: { case: { deletedAt: null }, deletedAt: null } },
      select: { createdAt: true },
    }),
    prisma.artifact.findMany({
      where: { createdAt: { gte: oldestMonthStart }, record: { case: { deletedAt: null }, deletedAt: null } },
      select: { createdAt: true, format: true },
    }),
    prisma.statusTransition.findMany({
      where: {
        createdAt: { gte: oldestMonthStart },
        toStatus: { in: ["APPROVED", "NEEDS_CHANGES"] },
        record: { case: { deletedAt: null }, deletedAt: null },
      },
      select: { createdAt: true, toStatus: true },
    }),
  ]);

  const monthly = makeMonthlyKpis({
    monthKeys,
    cases: casesRecent,
    records: recordsRecent,
    evidence: evidenceRecent,
    artifacts: artifactsRecent,
    transitions: transitionsRecent,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard SIGEA</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tablero operativo para seguimiento de productividad, revision y salida documental.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Casos" value={totalCases} />
        <Metric title="Fichas" value={totalRecords} />
        <Metric title="Evidencias" value={totalEvidence} />
        <Metric title="Aprobadas" value={totalApproved} />
        <Metric title="Requieren cambios" value={totalNeedsChanges} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estatus de fichas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusCounts.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p> : null}
            {statusCounts.map((entry) => (
              <p key={entry.status} className="text-sm text-muted-foreground">
                {recordStatusLabel(entry.status)}: {entry._count._all}
              </p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Documentos generados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {artifactsByFormat.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos.</p> : null}
            {artifactsByFormat.map((entry) => (
              <p key={entry.format} className="text-sm text-muted-foreground">
                {entry.format}: {entry._count._all}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard por mes (ultimos {monthsToShow} meses)</CardTitle>
        </CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Mes</th>
                    <th className="py-2 pr-3">Casos</th>
                    <th className="py-2 pr-3">Fichas</th>
                    <th className="py-2 pr-3">Aprobadas</th>
                    <th className="py-2 pr-3">Cambios</th>
                    <th className="py-2 pr-3">Evidencias</th>
                    <th className="py-2 pr-3">PPTX</th>
                    <th className="py-2 pr-3">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((row) => (
                    <tr key={row.monthKey} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium text-foreground">{monthLabelEs(row.monthKey)}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.cases}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.records}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.approved}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.needsChanges}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.evidence}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.pptx}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{row.pdf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

type MonthKey = `${number}-${string}`;

function monthKeyUtc(date: Date): MonthKey {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseMonthKeyUtc(key: MonthKey) {
  const [yRaw, mRaw] = key.split("-");
  const y = Number(yRaw);
  const m = Number(mRaw);
  return new Date(Date.UTC(y, Math.max(0, m - 1), 1, 0, 0, 0, 0));
}

function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addMonthsUtc(date: Date, delta: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1, 0, 0, 0, 0));
}

function buildRecentMonthKeysUtc(count: number) {
  const capped = Math.max(1, Math.min(36, count));
  const now = startOfMonthUtc(new Date());
  const keys: MonthKey[] = [];
  for (let i = capped - 1; i >= 0; i -= 1) {
    keys.push(monthKeyUtc(addMonthsUtc(now, -i)));
  }
  return keys;
}

function monthLabelEs(key: MonthKey) {
  const [yRaw, mRaw] = key.split("-");
  const year = yRaw;
  const month = Number(mRaw);
  const names = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  const name = names[Math.max(1, Math.min(12, month)) - 1] || key;
  return `${name} ${year}`;
}

type MonthlyKpiRow = {
  monthKey: MonthKey;
  cases: number;
  records: number;
  evidence: number;
  approved: number;
  needsChanges: number;
  pptx: number;
  pdf: number;
};

function makeMonthlyKpis(input: {
  monthKeys: MonthKey[];
  cases: Array<{ createdAt: Date }>;
  records: Array<{ createdAt: Date }>;
  evidence: Array<{ createdAt: Date }>;
  artifacts: Array<{ createdAt: Date; format: "PPTX" | "PDF" }>;
  transitions: Array<{ createdAt: Date; toStatus: string }>;
}): MonthlyKpiRow[] {
  const map = new Map<MonthKey, MonthlyKpiRow>();

  for (const key of input.monthKeys) {
    map.set(key, {
      monthKey: key,
      cases: 0,
      records: 0,
      evidence: 0,
      approved: 0,
      needsChanges: 0,
      pptx: 0,
      pdf: 0,
    });
  }

  for (const item of input.cases) {
    const key = monthKeyUtc(item.createdAt);
    const row = map.get(key);
    if (row) row.cases += 1;
  }

  for (const item of input.records) {
    const key = monthKeyUtc(item.createdAt);
    const row = map.get(key);
    if (row) row.records += 1;
  }

  for (const item of input.evidence) {
    const key = monthKeyUtc(item.createdAt);
    const row = map.get(key);
    if (row) row.evidence += 1;
  }

  for (const item of input.artifacts) {
    const key = monthKeyUtc(item.createdAt);
    const row = map.get(key);
    if (!row) continue;
    if (item.format === "PPTX") row.pptx++;
    if (item.format === "PDF") row.pdf++;
  }

  for (const item of input.transitions) {
    const key = monthKeyUtc(item.createdAt);
    const row = map.get(key);
    if (!row) continue;
    if (item.toStatus === "APPROVED") row.approved++;
    if (item.toStatus === "NEEDS_CHANGES") row.needsChanges++;
  }

  return Array.from(map.values());
}
