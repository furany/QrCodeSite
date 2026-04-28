import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/env";

const writeBuckets = new Map<string, { count: number; resetAt: number }>();

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return null;

  const allowedHosts = new Set([
    new URL(req.url).host,
    new URL(getBaseUrl(req.url)).host,
  ]);

  try {
    if (allowedHosts.has(new URL(origin).host)) return null;
  } catch {
    return NextResponse.json({ error: "Ungültiger Origin" }, { status: 403 });
  }

  return NextResponse.json({ error: "Ungültiger Origin" }, { status: 403 });
}

export function rateLimit(req: Request, limit = 60, windowMs = 60_000) {
  const key = clientKey(req);
  const now = Date.now();
  const bucket = writeBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    writeBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= limit) return null;

  return NextResponse.json(
    { error: "Zu viele Anfragen. Bitte kurz warten." },
    { status: 429 },
  );
}

function clientKey(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "local";
}
