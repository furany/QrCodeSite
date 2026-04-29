import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qrCodes } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QrType = "url" | "vcard" | "wifi" | "sms" | "email" | "tel" | "event";

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
  if (!data || typeof data !== "object") {
    return unavailableResponse("Ungültige vCard-Daten");
  }
  const { name, email, phone, org, url } = data as Record<string, unknown>;
  const escape = (s: unknown) => String(s || "").replace(/[\n;,]/g, c => `\\${c}`);
  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${escape(name)}
${email ? `EMAIL:${escape(email)}` : ""}
${phone ? `TEL:${escape(phone)}` : ""}
${org ? `ORG:${escape(org)}` : ""}
${url ? `URL:${escape(url)}` : ""}
END:VCARD`;

  return new NextResponse(vcard, {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${name || "contact"}.vcf"`,
      "cache-control": "no-store",
    },
  });
}

function wifiResponse(data: unknown) {
  if (!data || typeof data !== "object") {
    return unavailableResponse("Ungültige WiFi-Daten");
  }
  const { ssid, security, password, hidden } = data as Record<string, unknown>;
  if (!ssid) return unavailableResponse("SSID fehlt");

  const escape = (s: unknown) => String(s || "").replace(/[;,:\\]/g, c => `\\${c}`);
  const hiddenFlag = hidden ? "true" : "false";
  const wifi = `WIFI:T:${escape(security) || "WPA"};S:${escape(ssid)};P:${escape(password)};H:${hiddenFlag};;`;

  return new NextResponse(wifi, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function smsResponse(data: unknown) {
  if (!data || typeof data !== "object") {
    return unavailableResponse("Ungültige SMS-Daten");
  }
  const { phone, message } = data as Record<string, unknown>;
  if (!phone) return unavailableResponse("Telefonnummer fehlt");

  const smsUrl = `sms:${encodeURIComponent(String(phone))}${message ? `?body=${encodeURIComponent(String(message))}` : ""}`;
  return NextResponse.redirect(smsUrl, { status: 307 });
}

function emailResponse(data: unknown) {
  if (!data || typeof data !== "object") {
    return unavailableResponse("Ungültige Email-Daten");
  }
  const { email, subject, body } = data as Record<string, unknown>;
  if (!email) return unavailableResponse("Email-Adresse fehlt");

  const params = new URLSearchParams();
  if (subject) params.append("subject", String(subject));
  if (body) params.append("body", String(body));

  const mailtoUrl = `mailto:${encodeURIComponent(String(email))}${params.toString() ? `?${params.toString()}` : ""}`;
  return NextResponse.redirect(mailtoUrl, { status: 307 });
}

function telResponse(data: unknown) {
  if (!data || typeof data !== "object") {
    return unavailableResponse("Ungültige Tel-Daten");
  }
  const { phone } = data as Record<string, unknown>;
  if (!phone) return unavailableResponse("Telefonnummer fehlt");

  const telUrl = `tel:${encodeURIComponent(String(phone))}`;
  return NextResponse.redirect(telUrl, { status: 307 });
}

function eventResponse(data: unknown) {
  if (!data || typeof data !== "object") {
    return unavailableResponse("Ungültige Event-Daten");
  }
  const { title, startDate, startTime, endDate, endTime, location, description } = data as Record<string, unknown>;
  if (!title || !startDate) return unavailableResponse("Titel und Startdatum sind erforderlich");

  const escape = (s: unknown) => String(s || "").replace(/[\n,;]/g, c => (c === "\n" ? "\\n" : `\\${c}`));
  const start = `${String(startDate).replace(/-/g, "")}${startTime ? `T${String(startTime).replace(/:/g, "")}` : ""}`;
  const end = endDate ? `${String(endDate).replace(/-/g, "")}${endTime ? `T${String(endTime).replace(/:/g, "")}` : ""}` : start;

  const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Qrft//QR Code Events//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${crypto.randomUUID()}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${start}
DTEND:${end}
SUMMARY:${escape(title)}
${location ? `LOCATION:${escape(location)}` : ""}
${description ? `DESCRIPTION:${escape(description)}` : ""}
END:VEVENT
END:VCALENDAR`;

  return new NextResponse(ical, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${String(title)}.ics"`,
      "cache-control": "no-store",
    },
  });
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
      body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f7faf9;color:#10201b}
      main{max-width:32rem;padding:2rem;text-align:center}
      p{color:#52635d;line-height:1.6}
      a{color:#047857}
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
