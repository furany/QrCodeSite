import { asc, desc, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/env";
import { qrCodes } from "@/lib/schema";
import { assertSameOrigin, rateLimit } from "@/lib/security";
import {
  parseCode,
  parseHttpUrl,
  parseNullableDate,
  parseTitle,
} from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const newCode = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 7);

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const limitError = rateLimit(req, 30);
  if (limitError) return limitError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Bitte einloggen." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const { targetUrl, qrType, qrData, title, code, expiresAt, isDynamic } = body as {
    targetUrl?: string;
    qrType?: string;
    qrData?: unknown;
    title?: string | null;
    code?: string | null;
    expiresAt?: string | null;
    isDynamic?: boolean;
  };

  const type = (qrType || "url") as string;
  const parsedCode = code ? parseCode(code) : null;
  const parsedExpiresAt = parseNullableDate(expiresAt);

  if (parsedExpiresAt === undefined) {
    return NextResponse.json(
      { error: "expiresAt muss ein gültiges Datum sein" },
      { status: 400 },
    );
  }

  let parsedTargetUrl: string | null;
  let dataToStore: string | null = null;

  if (isDynamic && type !== "url") {
    // Dynamic non-URL types: store data, targetUrl is just the redirect endpoint
    const validationError = validateQrData(type, qrData);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 },
      );
    }
    parsedTargetUrl = `${new URL(req.url).origin}/r/`;
    dataToStore = JSON.stringify(qrData);
  } else {
    // URL types (static or dynamic)
    parsedTargetUrl = parseHttpUrl(targetUrl);
    if (!parsedTargetUrl) {
      return NextResponse.json(
        { error: "targetUrl muss eine http(s)-URL sein" },
        { status: 400 },
      );
    }
  }

  if (code && !parsedCode) {
    return NextResponse.json(
      {
        error:
          "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.",
      },
      { status: 400 },
    );
  }

  try {
    const createdCode = await insertQrCode({
      code: parsedCode,
      targetUrl: parsedTargetUrl,
      qrType: type,
      qrData: dataToStore,
      title: parseTitle(title),
      expiresAt: parsedExpiresAt,
      userId: user.id,
    });
    const shortUrl = `${getBaseUrl(req.url)}/r/${createdCode}`;

    return NextResponse.json({ code: createdCode, shortUrl });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Dieser Slug ist bereits vergeben." },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Bitte einloggen." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const parsedCode = parseCode(code);
    if (!parsedCode) {
      return NextResponse.json({ available: false, valid: false });
    }

    const existing = await db
      .select({ code: qrCodes.code })
      .from(qrCodes)
      .where(eq(qrCodes.code, parsedCode))
      .limit(1);

    return NextResponse.json({
      available: existing.length === 0,
      valid: true,
      code: parsedCode,
    });
  }

  const rows =
    user.role === "admin"
      ? await db
          .select()
          .from(qrCodes)
          .orderBy(desc(qrCodes.createdAt), asc(qrCodes.code))
      : await db
          .select()
          .from(qrCodes)
          .where(eq(qrCodes.userId, user.id))
          .orderBy(desc(qrCodes.createdAt), asc(qrCodes.code));

  return NextResponse.json({ items: rows });
}

async function insertQrCode({
  code,
  targetUrl,
  qrType,
  qrData,
  title,
  expiresAt,
  userId,
}: {
  code: string | null;
  targetUrl: string;
  qrType: string;
  qrData: string | null;
  title: string | null;
  expiresAt: Date | null;
  userId: string;
}) {
  if (code) {
    await db.insert(qrCodes).values({
      code,
      targetUrl,
      qrType,
      qrData,
      title,
      expiresAt,
      userId,
    });
    return code;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const generatedCode = newCode();
    try {
      await db.insert(qrCodes).values({
        code: generatedCode,
        targetUrl,
        qrType,
        qrData,
        title,
        expiresAt,
        userId,
      });
      return generatedCode;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  throw new Error("Konnte keinen eindeutigen QR-Code erzeugen.");
}

function validateQrData(type: string, data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return "Ungültige Daten für den QR-Code-Typ";
  }

  const obj = data as Record<string, unknown>;

  switch (type) {
    case "vcard": {
      if (!obj.name || typeof obj.name !== "string") {
        return "Name ist erforderlich für vCard";
      }
      return null;
    }
    case "wifi": {
      if (!obj.ssid || typeof obj.ssid !== "string") {
        return "SSID ist erforderlich für WiFi";
      }
      return null;
    }
    case "sms": {
      if (!obj.phone || typeof obj.phone !== "string") {
        return "Telefonnummer ist erforderlich für SMS";
      }
      return null;
    }
    case "email": {
      if (!obj.email || typeof obj.email !== "string") {
        return "Email-Adresse ist erforderlich";
      }
      return null;
    }
    case "tel": {
      if (!obj.phone || typeof obj.phone !== "string") {
        return "Telefonnummer ist erforderlich für Tel";
      }
      return null;
    }
    case "event": {
      if (!obj.title || typeof obj.title !== "string") {
        return "Titel ist erforderlich für Event";
      }
      if (!obj.startDate || typeof obj.startDate !== "string") {
        return "Startdatum ist erforderlich für Event";
      }
      return null;
    }
    default:
      return null;
  }
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
