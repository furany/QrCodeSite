import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBaseUrl } from "@/lib/env";
import { insertQrCode, isUniqueViolation } from "@/lib/qr-store";
import { assertSameOrigin, rateLimit } from "@/lib/security";
import {
  parseCode,
  parseHttpUrl,
  parseNullableDate,
  parseTitle,
} from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BATCH_SIZE = 100;

type RawBatchItem = {
  row?: unknown;
  name?: unknown;
  title?: unknown;
  targetUrl?: unknown;
  code?: unknown;
  expiresAt?: unknown;
};

type BatchFailure = {
  row: number;
  error: string;
};

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const limitError = rateLimit(req, 10);
  if (limitError) return limitError;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bitte einloggen." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const items = readBatchItems(body);
  if (!items) {
    return NextResponse.json(
      { error: "items muss eine Liste von QR-Codes sein." },
      { status: 400 },
    );
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Bitte füge mindestens einen QR-Code hinzu." },
      { status: 400 },
    );
  }

  if (items.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Maximal ${MAX_BATCH_SIZE} QR-Codes pro Batch.` },
      { status: 400 },
    );
  }

  const created: Array<{
    row: number;
    name: string;
    code: string;
    shortUrl: string;
    targetUrl: string;
  }> = [];
  const failures: BatchFailure[] = [];
  const baseUrl = getBaseUrl(req.url);

  for (const [index, item] of items.entries()) {
    const row = parseRow(item.row, index + 1);
    const targetUrl = parseHttpUrl(item.targetUrl);
    const codeValue = optionalString(item.code);
    const parsedCode = codeValue ? parseCode(codeValue) : null;
    const expiresAtValue = optionalString(item.expiresAt);
    const parsedExpiresAt = parseNullableDate(expiresAtValue);
    const title = parseTitle(item.title ?? item.name);

    if (!targetUrl) {
      failures.push({ row, error: "URL ist ungültig." });
      continue;
    }

    if (codeValue && !parsedCode) {
      failures.push({
        row,
        error: "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.",
      });
      continue;
    }

    if (parsedExpiresAt === undefined) {
      failures.push({ row, error: "Ablaufdatum ist ungültig." });
      continue;
    }

    if (parsedExpiresAt && parsedExpiresAt.getTime() <= Date.now()) {
      failures.push({
        row,
        error: "Ablaufdatum muss in der Zukunft liegen.",
      });
      continue;
    }

    try {
      const code = await insertQrCode({
        code: parsedCode,
        targetUrl,
        qrType: "url",
        qrData: null,
        title,
        expiresAt: parsedExpiresAt,
        userId: user.id,
      });

      created.push({
        row,
        name: title ?? `Code ${row}`,
        code,
        shortUrl: `${baseUrl}/r/${code}`,
        targetUrl,
      });
    } catch (error) {
      failures.push({
        row,
        error: isUniqueViolation(error)
          ? "Dieser Slug ist bereits vergeben."
          : "Erstellung fehlgeschlagen.",
      });
    }
  }

  const status = created.length === 0 && failures.length > 0 ? 400 : 201;
  return NextResponse.json({ items: created, failures }, { status });
}

function readBatchItems(value: unknown): RawBatchItem[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;
  return items.filter(
    (item): item is RawBatchItem =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function parseRow(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return fallback;
  }
  return value;
}

function optionalString(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}
