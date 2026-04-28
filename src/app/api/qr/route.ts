import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { qrCodes } from "@/lib/schema";

export const dynamic = "force-dynamic";

const newCode = customAlphabet(
  "23456789abcdefghjkmnpqrstuvwxyz",
  7,
);

const URL_RE = /^https?:\/\/.+/i;

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
  if (!targetUrl || typeof targetUrl !== "string" || !URL_RE.test(targetUrl)) {
    return NextResponse.json(
      { error: "targetUrl muss eine http(s)-URL sein" },
      { status: 400 },
    );
  }

  const code = newCode();
  await db.insert(qrCodes).values({
    code,
    targetUrl,
    title: title ?? null,
  });

  const base =
    process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
  const shortUrl = `${base.replace(/\/$/, "")}/r/${code}`;
  return NextResponse.json({ code, shortUrl });
}

export async function GET() {
  const rows = await db
    .select()
    .from(qrCodes)
    .orderBy(qrCodes.createdAt);
  return NextResponse.json({ items: rows });
}
