import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { QR_TYPES, validateQrData, type QrType } from "@/lib/qr-types";
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
    .select({ userId: qrCodes.userId, qrType: qrCodes.qrType })
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

  const { targetUrl, qrType, qrData, title, expiresAt, archived } = body as {
    targetUrl?: string;
    qrType?: string;
    qrData?: unknown;
    title?: string | null;
    expiresAt?: string | null;
    archived?: boolean;
  };
  const parsedTargetUrl =
    targetUrl !== undefined ? parseHttpUrl(targetUrl) : undefined;
  const parsedQrType = qrType !== undefined ? parseQrType(qrType) : undefined;
  const nextQrType = parsedQrType ?? parseQrType(existing[0].qrType) ?? "url";
  const parsedExpiresAt =
    expiresAt !== undefined ? parseNullableDate(expiresAt) : undefined;

  if (qrType !== undefined && !parsedQrType) {
    return NextResponse.json(
      { error: "qrType ist ungültig." },
      { status: 400 },
    );
  }

  if (nextQrType === "url" && targetUrl !== undefined && !parsedTargetUrl) {
    return NextResponse.json(
      { error: "targetUrl muss eine http(s)-URL sein" },
      { status: 400 },
    );
  }

  if (nextQrType === "url" && qrType !== undefined && !parsedTargetUrl) {
    return NextResponse.json(
      { error: "Für Website-QR-Codes ist eine gültige Ziel-URL erforderlich." },
      { status: 400 },
    );
  }

  const normalizedQrData =
    qrData !== undefined ? normalizeQrData(qrData) : undefined;

  if (qrData !== undefined && !normalizedQrData) {
    return NextResponse.json(
      { error: "qrData muss ein Objekt mit Textwerten sein." },
      { status: 400 },
    );
  }

  if (nextQrType !== "url" && normalizedQrData) {
    const validationError = validateQrData(nextQrType, normalizedQrData);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
  }

  if (
    nextQrType !== "url" &&
    qrType !== undefined &&
    normalizedQrData === undefined
  ) {
    return NextResponse.json(
      { error: "Für diesen QR-Code-Typ sind Inhaltsdaten erforderlich." },
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
  if (qrType !== undefined) values.qrType = nextQrType;
  if (nextQrType === "url") {
    if (parsedTargetUrl) values.targetUrl = parsedTargetUrl;
    if (qrType !== undefined) values.qrData = null;
  } else {
    if (qrType !== undefined) values.targetUrl = `${new URL(req.url).origin}/r/`;
    if (normalizedQrData !== undefined) {
      values.qrData = JSON.stringify(normalizedQrData);
    }
  }
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

function parseQrType(value: unknown): QrType | null {
  if (typeof value !== "string") return null;
  return value in QR_TYPES ? (value as QrType) : null;
}

function normalizeQrData(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, String(entry ?? "")]),
  );
}
