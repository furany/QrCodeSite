import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { qrCodes, type NewQrCode } from "@/lib/schema";
import { assertSameOrigin, rateLimit } from "@/lib/security";
import { parseHttpUrl, parseNullableDate, parseTitle } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const limitError = rateLimit(req, 120);
  if (limitError) return limitError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Bitte einloggen." },
      { status: 401 },
    );
  }

  const { code } = await params;
  const existing = await db
    .select({ userId: qrCodes.userId })
    .from(qrCodes)
    .where(eq(qrCodes.code, code))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  if (!canManageCode(user, existing[0].userId)) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const { targetUrl, title, expiresAt, archived } = body as {
    targetUrl?: string;
    title?: string | null;
    expiresAt?: string | null;
    archived?: boolean;
  };
  const parsedTargetUrl =
    targetUrl !== undefined ? parseHttpUrl(targetUrl) : undefined;
  const parsedExpiresAt =
    expiresAt !== undefined ? parseNullableDate(expiresAt) : undefined;

  if (targetUrl !== undefined && !parsedTargetUrl) {
    return NextResponse.json(
      { error: "targetUrl muss eine http(s)-URL sein" },
      { status: 400 },
    );
  }

  if (parsedExpiresAt === undefined && expiresAt !== undefined) {
    return NextResponse.json(
      { error: "expiresAt muss ein gültiges Datum sein" },
      { status: 400 },
    );
  }

  const values: Partial<NewQrCode> = {
    updatedAt: new Date(),
  };
  if (parsedTargetUrl) values.targetUrl = parsedTargetUrl;
  if (title !== undefined) values.title = parseTitle(title);
  if (expiresAt !== undefined) values.expiresAt = parsedExpiresAt;
  if (archived !== undefined) values.archivedAt = archived ? new Date() : null;

  const updated = await db
    .update(qrCodes)
    .set(values)
    .where(eq(qrCodes.code, code))
    .returning();

  return NextResponse.json({ item: updated[0] });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Bitte einloggen." },
      { status: 401 },
    );
  }

  const { code } = await params;
  const existing = await db
    .select({ userId: qrCodes.userId })
    .from(qrCodes)
    .where(eq(qrCodes.code, code))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  if (!canManageCode(user, existing[0].userId)) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  const deleted = await db
    .delete(qrCodes)
    .where(eq(qrCodes.code, code))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

function canManageCode(user: { id: string; role: string }, ownerId: string | null) {
  return user.role === "admin" || ownerId === user.id;
}
