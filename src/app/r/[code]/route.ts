import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { qrCodes } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const rows = await db
    .select({ targetUrl: qrCodes.targetUrl })
    .from(qrCodes)
    .where(eq(qrCodes.code, code))
    .limit(1);

  if (rows.length === 0) {
    return new NextResponse("QR-Code nicht gefunden", { status: 404 });
  }

  // fire-and-forget Counter — kein await, blockt Redirect nicht
  void db
    .update(qrCodes)
    .set({
      scanCount: sql`${qrCodes.scanCount} + 1`,
      lastScanAt: new Date(),
    })
    .where(eq(qrCodes.code, code));

  return NextResponse.redirect(rows[0].targetUrl, { status: 307 });
}
