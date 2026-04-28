import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { getBaseUrl } from "@/lib/env";
import { qrCodes } from "@/lib/schema";
import { parseHttpUrl, parseTitle } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const newCode = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 7);

export async function POST(req: Request) {
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
  const parsedTargetUrl = parseHttpUrl(targetUrl);

  if (!parsedTargetUrl) {
    return NextResponse.json(
      { error: "targetUrl muss eine http(s)-URL sein" },
      { status: 400 },
    );
  }

  const code = await insertQrCode(parsedTargetUrl, parseTitle(title));
  const shortUrl = `${getBaseUrl(req.url)}/r/${code}`;

  return NextResponse.json({ code, shortUrl });
}

export async function GET() {
  const rows = await db.select().from(qrCodes).orderBy(qrCodes.createdAt);
  return NextResponse.json({ items: rows });
}

async function insertQrCode(targetUrl: string, title: string | null) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await db.insert(qrCodes).values({
        code,
        targetUrl,
        title,
      });
      return code;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  throw new Error("Konnte keinen eindeutigen QR-Code erzeugen.");
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
