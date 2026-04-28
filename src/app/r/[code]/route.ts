import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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

  return NextResponse.redirect(row.targetUrl, { status: 307 });
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
