import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  await clearUserSession(req);
  return NextResponse.json({ ok: true });
}
