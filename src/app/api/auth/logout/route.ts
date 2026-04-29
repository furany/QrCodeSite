import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await clearUserSession(req);
  return NextResponse.json({ ok: true });
}
