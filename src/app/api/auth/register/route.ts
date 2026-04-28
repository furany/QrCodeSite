import { NextResponse } from "next/server";
import {
  canRegister,
  createUser,
  createUserSession,
  findUserByEmail,
  getUserCount,
} from "@/lib/auth";
import { assertSameOrigin, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  const limitError = rateLimit(req, 10);
  if (limitError) return limitError;

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    name?: string;
    password?: string;
    inviteCode?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  const userCount = await getUserCount();

  if (!canRegister({ userCount, inviteCode: body?.inviteCode })) {
    return NextResponse.json(
      { error: "Registrierung ist nur mit Einladung möglich." },
      { status: 403 },
    );
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
      { status: 400 },
    );
  }

  if (password.length < 10) {
    return NextResponse.json(
      { error: "Das Passwort muss mindestens 10 Zeichen haben." },
      { status: 400 },
    );
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "Diese E-Mail ist bereits registriert." },
      { status: 409 },
    );
  }

  const user = await createUser({
    email,
    name: body?.name?.trim() || null,
    password,
  });
  await createUserSession(user);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
