import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowLeft, QrCode as QrCodeIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/env";
import { QR_TYPES, type QrType } from "@/lib/qr-types";
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
  params: Promise<{ code: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const { code } = await params;
  const rows = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.code, code))
    .limit(1);

  if (
    rows.length === 0 ||
    (user.role !== "admin" && rows[0].userId !== user.id)
  ) {
    redirect("/dashboard");
  }

  const row = rows[0];
  const qrType = parseStoredQrType(row.qrType);
  const qrData = parseStoredQrData(row.qrData);
  const shortUrl = `${getBaseUrl()}/r/${code}`;
  const now = new Date();
  const isExpired = row.expiresAt ? row.expiresAt <= now : false;
  const daysOld = Math.floor(
    (now.getTime() - row.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const scansPerDay = daysOld > 0 ? (row.scanCount / daysOld).toFixed(1) : "0";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/dashboard" />}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <p className="text-sm font-medium text-primary">Analytics</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            {row.title || "QR-Code"}
          </h1>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Scans gesamt" value={row.scanCount.toString()} />
        <Metric label="Scans pro Tag" value={scansPerDay} />
        <Metric label="Alter (Tage)" value={daysOld.toString()} />
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
        <h2 className="mb-4 text-lg font-semibold">Code-Informationen</h2>

        <div className="grid gap-4">
          <InfoBlock label="Kurzlink">
            <code className="block rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground">
              {shortUrl}
            </code>
          </InfoBlock>

          <InfoBlock label="Typ">
            <p className="text-sm">{QR_TYPES[qrType].label}</p>
          </InfoBlock>

          {qrType === "url" ? (
            <InfoBlock label="Ziel-URL">
              <a
                href={row.targetUrl}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-sm text-primary hover:underline"
              >
                {row.targetUrl}
              </a>
            </InfoBlock>
          ) : (
            <InfoBlock label="Inhalt">
              <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                {contentEntries(qrType, qrData).map(([label, value]) => (
                  <div key={label} className="grid gap-1 sm:grid-cols-[140px_1fr]">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {label}
                    </span>
                    <span className="break-all">{value}</span>
                  </div>
                ))}
              </div>
            </InfoBlock>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoBlock label="Erstellt">
              <p className="text-sm">{formatDateTime(row.createdAt)}</p>
            </InfoBlock>

            {row.lastScanAt && (
              <InfoBlock label="Letzter Scan">
                <p className="text-sm">{formatDateTime(row.lastScanAt)}</p>
              </InfoBlock>
            )}

            {row.expiresAt && (
              <InfoBlock label="Gültig bis">
                <p className="text-sm">{formatDateTime(row.expiresAt)}</p>
              </InfoBlock>
            )}
          </div>
        </div>
      </Card>

      <Card className="mt-4 border-border bg-blue-50 p-4 text-sm text-muted-foreground dark:bg-blue-950/30">
        <QrCodeIcon className="mr-2 inline size-4" />
        <span>Hinweis: Detaillierte Charts werden in Kürze verfügbar sein.</span>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Card>
  );
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function parseStoredQrType(value: string): QrType {
  return value in QR_TYPES ? (value as QrType) : "url";
}

function parseStoredQrData(value: string | null) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, entry]) => [key, String(entry ?? "")]),
    );
  } catch {
    return null;
  }
}

function contentEntries(type: QrType, data: Record<string, string> | null) {
  if (!data) return [["Inhalt", "Keine gespeicherten Inhaltsdaten."]];

  const labels: Partial<Record<QrType, Record<string, string>>> = {
    vcard: {
      name: "Name",
      email: "E-Mail",
      phone: "Telefon",
      org: "Organisation",
      url: "Website",
    },
    wifi: {
      ssid: "SSID",
      security: "Sicherheit",
      password: "Passwort",
      hidden: "Versteckt",
    },
    sms: { phone: "Telefon", message: "Nachricht" },
    email: { email: "E-Mail", subject: "Betreff", body: "Nachricht" },
    tel: { phone: "Telefon" },
    event: {
      title: "Titel",
      startDate: "Startdatum",
      startTime: "Startzeit",
      endDate: "Enddatum",
      endTime: "Endzeit",
      location: "Ort",
      description: "Beschreibung",
    },
  };

  const entries = Object.entries(labels[type] ?? {})
    .map(([key, label]) => [label, displayValue(key, data[key])] as const)
    .filter(([, value]) => value);

  return entries.length > 0
    ? entries
    : ([["Inhalt", "Keine gespeicherten Inhaltsdaten."]] as const);
}

function displayValue(key: string, value: string | undefined) {
  if (!value) return "";
  if (key === "hidden") return value === "true" ? "Ja" : "Nein";
  if (key === "password") return "••••••••";
  return value;
}

function formatDateTime(value: Date) {
  return value.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
