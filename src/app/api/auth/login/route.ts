import { NextResponse } from "next/server";
import {
  createUserSession,
  findUserByEmail,
  verifyPassword,
} from "@/lib/auth";
import { assertSameOrigin, rateLimit } from "@/lib/security";
import { recordLoginAttempt, checkAccountLockout } from "@/lib/login-security";

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

  const email = body?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "E-Mail ist erforderlich." },
      { status: 400 }
    );
  }

  // Check account lockout
  const lockout = await checkAccountLockout(email);
  if (lockout.isLocked) {
    return NextResponse.json(
      {
        error: `Zu viele fehlgeschlagene Login-Versuche. Versuche es in ${lockout.remainingMinutes} Minuten erneut.`,
      },
      { status: 429 }
    );
  }

  const user = await findUserByEmail(email);
  const passwordValid = user && body?.password && verifyPassword(body.password, user.passwordHash);

  if (!passwordValid) {
    await recordLoginAttempt(email, false, req);
    return NextResponse.json(
      { error: "E-Mail oder Passwort ist falsch." },
      { status: 401 }
    );
  }

  await recordLoginAttempt(email, true, req);
  await createUserSession(user!);

  return NextResponse.json({
    user: {
      id: user!.id,
      email: user!.email,
      name: user!.name,
      role: user!.role,
    },
  });
}
