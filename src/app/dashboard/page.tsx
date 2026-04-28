import { desc } from "drizzle-orm";
import Link from "next/link";
import { BarChart3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardRow } from "@/components/dashboard-row";
import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/env";
import { qrCodes, type QrCode } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Dashboard",
  description: "Dynamische QR-Codes verwalten und Scan-Zahlen prüfen.",
};

export default async function DashboardPage() {
  let rows: QrCode[] = [];
  let dbError: string | null = null;

  try {
    rows = await db.select().from(qrCodes).orderBy(desc(qrCodes.createdAt));
  } catch (error) {
    dbError =
      error instanceof Error ? error.message : "Datenbank nicht erreichbar";
  }

  const base = getBaseUrl();
  const totalScans = rows.reduce((sum, row) => sum + row.scanCount, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Qrft Admin</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Dynamische Codes, Ziel-URLs und Scan-Zahlen an einem Ort.
          </p>
        </div>
        <Button className="h-10" render={<Link href="/create" />}>
          <Plus className="size-4" />
          Neuer Code
        </Button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Codes" value={rows.length.toString()} />
        <Metric label="Scans" value={totalScans.toString()} />
        <Metric
          label="Letzter Code"
          value={
            rows[0]?.createdAt
              ? rows[0].createdAt.toLocaleDateString("de-DE")
              : "-"
          }
        />
      </div>

      {dbError && (
        <Card className="mb-5 border-destructive/30 bg-destructive/10 p-4 text-sm">
          <p className="font-medium text-destructive">
            Datenbank-Verbindung fehlgeschlagen
          </p>
          <p className="mt-1 text-muted-foreground">{dbError}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Prüfe DATABASE_URL in Dokploy und ob der Migrationlauf beim Start
            erfolgreich war.
          </p>
        </Card>
      )}

      {rows.length === 0 && !dbError ? (
        <Card className="grid min-h-56 place-items-center border-dashed p-8 text-center">
          <div>
            <BarChart3 className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">Noch keine dynamischen Codes</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Erstelle den ersten Code und die Scans erscheinen hier.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <DashboardRow
              key={row.code}
              code={row.code}
              initialTargetUrl={row.targetUrl}
              initialTitle={row.title}
              scanCount={row.scanCount}
              createdAt={row.createdAt.toISOString()}
              lastScanAt={row.lastScanAt?.toISOString() ?? null}
              shortUrl={`${base}/r/${row.code}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </Card>
  );
}
