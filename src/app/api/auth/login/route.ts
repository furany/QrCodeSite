import { NextResponse } from "next/server";
import {
  createUserSession,
  findUserByEmail,
  verifyPassword,
} from "@/lib/auth";
import { assertSameOrigin, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const limitError = rateLimit(req, 20);
  if (limitError) return limitError;

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  const user = body?.email ? await findUserByEmail(body.email) : null;
  if (!user || !body?.password || !verifyPassword(body.password, user.passwordHash)) {
    return NextResponse.json(
      { error: "E-Mail oder Passwort ist falsch." },
      { status: 401 },
    );
  }

  await createUserSession(user);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
