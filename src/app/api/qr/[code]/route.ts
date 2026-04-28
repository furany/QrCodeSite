import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { qrCodes } from "@/lib/schema";

const URL_RE = /^https?:\/\/.+/i;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }
  const { targetUrl, title } = body as {
    targetUrl?: string;
    title?: string | null;
  };
  if (targetUrl !== undefined) {
    if (typeof targetUrl !== "string" || !URL_RE.test(targetUrl)) {
      return NextResponse.json(
        { error: "targetUrl muss eine http(s)-URL sein" },
        { status: 400 },
      );
    }
  }

  const updated = await db
    .update(qrCodes)
    .set({
      ...(targetUrl !== undefined ? { targetUrl } : {}),
      ...(title !== undefined ? { title } : {}),
      updatedAt: new Date(),
    })
    .where(eq(qrCodes.code, code))
    .returning();

  if (updated.length === 0) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json({ item: updated[0] });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const deleted = await db
    .delete(qrCodes)
    .where(eq(qrCodes.code, code))
    .returning();
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
