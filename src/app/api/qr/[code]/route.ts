import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qrCodes, type NewQrCode } from "@/lib/schema";
import { parseHttpUrl, parseTitle } from "@/lib/validation";

export const runtime = "nodejs";

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
  const parsedTargetUrl =
    targetUrl !== undefined ? parseHttpUrl(targetUrl) : undefined;

  if (targetUrl !== undefined && !parsedTargetUrl) {
    return NextResponse.json(
      { error: "targetUrl muss eine http(s)-URL sein" },
      { status: 400 },
    );
  }

  const values: Partial<NewQrCode> = {
    updatedAt: new Date(),
  };
  if (parsedTargetUrl) values.targetUrl = parsedTargetUrl;
  if (title !== undefined) values.title = parseTitle(title);

  const updated = await db
    .update(qrCodes)
    .set(values)
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
