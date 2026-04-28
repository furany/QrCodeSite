import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardList, type DashboardItem } from "@/components/dashboard-list";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth";
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
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  let rows: QrCode[] = [];
  let dbError: string | null = null;

  try {
    rows =
      user.role === "admin"
        ? await db.select().from(qrCodes).orderBy(desc(qrCodes.createdAt))
        : await db
            .select()
            .from(qrCodes)
            .where(eq(qrCodes.userId, user.id))
            .orderBy(desc(qrCodes.createdAt));
  } catch (error) {
    dbError =
      error instanceof Error ? error.message : "Datenbank nicht erreichbar";
  }

  const base = getBaseUrl();
  const now = new Date();
  const items: DashboardItem[] = rows.map((row) => ({
    code: row.code,
    targetUrl: row.targetUrl,
    title: row.title,
    scanCount: row.scanCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastScanAt: row.lastScanAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    isExpired: row.expiresAt ? row.expiresAt <= now : false,
    shortUrl: `${base}/r/${row.code}`,
  }));
  const activeRows = rows.filter((row) => !row.archivedAt);
  const totalScans = rows.reduce((sum, row) => sum + row.scanCount, 0);
  const popularCodes = [...activeRows]
    .sort((a, b) => b.scanCount - a.scanCount)
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">
            {user.name || user.email}
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Dashboard</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Dynamische Codes, Ziel-URLs und Scan-Zahlen an einem Ort.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="h-10" render={<Link href="/create" />}>
            <Plus className="size-4" />
            Neuer Code
          </Button>
          <Button
            variant="secondary"
            className="h-10"
            render={<Link href="/dashboard/settings" />}
          >
            <Settings className="size-4" />
            Einstellungen
          </Button>
          <LogoutButton />
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Aktive Codes" value={activeRows.length.toString()} />
        <Metric label="Scans gesamt" value={totalScans.toString()} />
        <Metric
          label="Durchschn. pro Code"
          value={
            activeRows.length > 0
              ? Math.round(totalScans / activeRows.length).toString()
              : "0"
          }
        />
        <Metric
          label="Letzter Scan"
          value={
            latestScan(rows)?.toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }) ?? "-"
          }
        />
      </div>

      {dbError ? (
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
      ) : (
        <>
          {popularCodes.length > 0 && (
            <Card className="mb-5 border-border bg-card p-4 shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Populär</h2>
              <div className="space-y-2">
                {popularCodes.map((code) => (
                  <div
                    key={code.code}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {code.title || code.code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {code.scanCount} Scans
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <DashboardList items={items} />
        </>
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

function latestScan(rows: QrCode[]) {
  const scans = rows
    .map((row) => row.lastScanAt)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime());
  return scans[0];
}
