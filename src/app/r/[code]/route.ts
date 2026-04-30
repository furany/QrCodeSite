import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateQrData, type QrType } from "@/lib/qr-types";
import { qrCodes } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const rows = await db
    .select({
      targetUrl: qrCodes.targetUrl,
      qrType: qrCodes.qrType,
      qrData: qrCodes.qrData,
      title: qrCodes.title,
      archivedAt: qrCodes.archivedAt,
      expiresAt: qrCodes.expiresAt,
    })
    .from(qrCodes)
    .where(eq(qrCodes.code, code))
    .limit(1);

  if (rows.length === 0) {
    return unavailableResponse("QR-Code nicht gefunden");
  }

  const row = rows[0];
  if (row.archivedAt) {
    return unavailableResponse("Dieser QR-Code ist archiviert");
  }

  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return unavailableResponse("Dieser QR-Code ist abgelaufen");
  }

  void db
    .update(qrCodes)
    .set({
      scanCount: sql`${qrCodes.scanCount} + 1`,
      lastScanAt: new Date(),
    })
    .where(eq(qrCodes.code, code))
    .catch(() => undefined);

  const qrType = (row.qrType || "url") as QrType;
  let qrData = null;
  if (row.qrData) {
    try {
      qrData = JSON.parse(row.qrData);
    } catch {
      return unavailableResponse("Ungültige QR-Code-Daten");
    }
  }

  switch (qrType) {
    case "vcard":
      return vcardResponse(qrData);
    case "wifi":
      return wifiResponse(qrData);
    case "sms":
      return smsResponse(qrData);
    case "email":
      return emailResponse(qrData);
    case "tel":
      return telResponse(qrData);
    case "event":
      return eventResponse(qrData);
    default:
      return NextResponse.redirect(row.targetUrl, { status: 307 });
  }
}

function vcardResponse(data: unknown) {
  const normalized = normalizeQrData(data);
  if (!normalized) return unavailableResponse("Ungültige vCard-Daten");

  const vcard = generateQrData("vcard", normalized);
  const filename = filenameForDownload(
    normalized.name || normalized.lastName || "contact",
    "vcf",
  );

  return new NextResponse(vcard, {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

function wifiResponse(data: unknown) {
  const normalized = normalizeQrData(data);
  if (!normalized) return unavailableResponse("Ungültige WLAN-Daten");
  if (!normalized.ssid) return unavailableResponse("SSID fehlt");

  return new NextResponse(generateQrData("wifi", normalized), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function smsResponse(data: unknown) {
  const normalized = normalizeQrData(data);
  if (!normalized) return unavailableResponse("Ungültige SMS-Daten");
  if (!normalized.phone) return unavailableResponse("Telefonnummer fehlt");

  const smsUrl = `sms:${encodeURIComponent(normalized.phone)}${
    normalized.message ? `?body=${encodeURIComponent(normalized.message)}` : ""
  }`;
  return NextResponse.redirect(smsUrl, { status: 307 });
}

function emailResponse(data: unknown) {
  const normalized = normalizeQrData(data);
  if (!normalized) return unavailableResponse("Ungültige E-Mail-Daten");
  if (!normalized.email) return unavailableResponse("E-Mail-Adresse fehlt");

  return NextResponse.redirect(generateQrData("email", normalized), {
    status: 307,
  });
}

function telResponse(data: unknown) {
  const normalized = normalizeQrData(data);
  if (!normalized) return unavailableResponse("Ungültige Telefon-Daten");
  if (!normalized.phone) return unavailableResponse("Telefonnummer fehlt");

  return NextResponse.redirect(generateQrData("tel", normalized), {
    status: 307,
  });
}

function eventResponse(data: unknown) {
  const normalized = normalizeQrData(data);
  if (!normalized) return unavailableResponse("Ungültige Event-Daten");
  if (!normalized.title || !normalized.startDate) {
    return unavailableResponse("Titel und Startdatum sind erforderlich");
  }

  const filename = filenameForDownload(normalized.title, "ics");

  return new NextResponse(generateQrData("event", normalized), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

function normalizeQrData(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, String(entry ?? "")]),
  );
}

function filenameForDownload(name: string, extension: string) {
  const safe =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "download";
  return `${safe}.${extension}`;
}

function unavailableResponse(message: string) {
  return new NextResponse(
    `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${message} | Qrft</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f8fafc;color:#0f172a}
      main{max-width:34rem;padding:2rem;text-align:center}
      h1{letter-spacing:-.03em}
      p{color:#52616b;line-height:1.6}
      a{color:#2563eb}
    </style>
  </head>
  <body>
    <main>
      <h1>${message}</h1>
      <p>Der dynamische Kurzlink kann gerade nicht weiterleiten. Bitte prüfe den Code oder kontaktiere den Herausgeber.</p>
      <a href="/">Zur Startseite</a>
    </main>
  </body>
</html>`,
    {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
