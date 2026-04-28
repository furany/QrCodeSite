import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowLeft, QrCode as QrCodeIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { qrCodes } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "QR-Code Analytics",
  description: "Detaillierte Scan-Statistiken für QR-Codes",
};

export default async function AnalyticsPage({
  params,
}: {
  params: { code: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const code = params.code;
  const qrCode = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.code, code));

  if (qrCode.length === 0 || qrCode[0].userId !== user.id) {
    redirect("/dashboard");
  }

  const row = qrCode[0];
  const now = new Date();
  const isExpired = row.expiresAt ? row.expiresAt <= now : false;
  const daysOld = Math.floor(
    (now.getTime() - row.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const scansPerDay = daysOld > 0 ? (row.scanCount / daysOld).toFixed(1) : "0";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <p className="text-sm font-medium text-primary">Analytics</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            {row.title || "QR-Code"}
          </h1>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Scans gesamt
          </p>
          <p className="mt-2 text-3xl font-semibold">{row.scanCount}</p>
        </Card>

        <Card className="border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Scans pro Tag
          </p>
          <p className="mt-2 text-3xl font-semibold">{scansPerDay}</p>
        </Card>

        <Card className="border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Alter (Tage)
          </p>
          <p className="mt-2 text-3xl font-semibold">{daysOld}</p>
        </Card>

        <Card className="border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Status
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div
              className={`size-2 rounded-full ${
                isExpired ? "bg-red-600" : "bg-green-600"
              }`}
            />
            <span className="text-sm font-semibold">
              {isExpired ? "Abgelaufen" : "Aktiv"}
            </span>
          </div>
        </Card>
      </div>

      <Card className="border-border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Code Information</h2>

        <div className="grid gap-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Kurzlink
            </p>
            <code className="mt-1 block rounded-md bg-muted px-3 py-2 text-sm font-mono text-foreground">
              {`${typeof window !== "undefined" ? window.location.origin : ""}${code === "?" ? "" : `/r/${code}`}`}
            </code>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Ziel-URL
            </p>
            <a
              href={row.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block break-all text-sm text-primary hover:underline"
            >
              {row.targetUrl}
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Erstellt
              </p>
              <p className="mt-1 text-sm">
                {row.createdAt.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {row.lastScanAt && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Letzter Scan
                </p>
                <p className="mt-1 text-sm">
                  {row.lastScanAt.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}

            {row.expiresAt && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Gültig bis
                </p>
                <p className="mt-1 text-sm">
                  {row.expiresAt.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="mt-4 border-border bg-blue-50 dark:bg-blue-950/30 p-4 text-sm text-muted-foreground">
        <QrCodeIcon className="size-4 inline mr-2" />
        <span>Hinweis: Detaillierte Charts werden in Kürze verfügbar sein.</span>
      </Card>
    </div>
  );
}
