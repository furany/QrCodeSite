import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { qrCodes, type QrCode } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { DashboardRow } from "@/components/dashboard-row";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard — Qrft",
};

export default async function DashboardPage() {
  let rows: QrCode[] = [];
  let dbError: string | null = null;
  try {
    rows = await db
      .select()
      .from(qrCodes)
      .orderBy(desc(qrCodes.createdAt));
  } catch (e) {
    dbError =
      e instanceof Error ? e.message : "Datenbank nicht erreichbar";
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Verwalte deine dynamischen QR-Codes und ändere ihre Ziele.
          </p>
        </div>
        <Button render={<Link href="/create" />}>Neuer Code</Button>
      </div>

      {dbError && (
        <Card className="mb-6 border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p className="font-medium">Datenbank-Verbindung fehlgeschlagen</p>
          <p className="mt-1 text-muted-foreground">{dbError}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Prüfe <code className="font-mono">DATABASE_URL</code> in deiner
            .env oder im Dokploy-Service.
          </p>
        </Card>
      )}

      {rows.length === 0 && !dbError && (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">
            Noch keine dynamischen Codes. Erstelle deinen ersten unter{" "}
            <Link href="/create" className="underline">
              /create
            </Link>
            .
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <DashboardRow
            key={r.code}
            code={r.code}
            initialTargetUrl={r.targetUrl}
            initialTitle={r.title}
            scanCount={r.scanCount}
            createdAt={r.createdAt.toISOString()}
            shortUrl={`${base.replace(/\/$/, "")}/r/${r.code}`}
          />
        ))}
      </div>
    </div>
  );
}
