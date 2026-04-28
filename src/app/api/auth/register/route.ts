import { NextResponse } from "next/server";
import {
  canRegister,
  createUser,
  createUserSession,
  findUserByEmail,
  getUserCount,
} from "@/lib/auth";
import { assertSameOrigin, rateLimit } from "@/lib/security";
import { validatePasswordStrength } from "@/lib/password";

export const runtime = "nodejs";

const REGISTRATION_RATE_LIMIT = 3; // Per IP per hour
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const originError = assertSameOrigin(req);
  if (originError) return originError;

  // Strict rate limiting for registrations
  const limitError = rateLimit(req, REGISTRATION_RATE_LIMIT);
  if (limitError) return limitError;

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    name?: string;
    password?: string;
    inviteCode?: string;
  } | null;

  // Validate input exists
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: "E-Mail und Passwort sind erforderlich." },
      { status: 400 }
    );
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;
  const userCount = await getUserCount();

  // Check registration eligibility
  if (!canRegister({ userCount, inviteCode: body?.inviteCode })) {
    return NextResponse.json(
      { error: "Registrierung ist derzeit nicht möglich." },
      { status: 403 }
    );
  }

  // Validate email format
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "Ungültige E-Mail-Adresse." },
      { status: 400 }
    );
  }

  // Validate email length to prevent abuse
  if (email.length > 254) {
    return NextResponse.json(
      { error: "E-Mail ist zu lang." },
      { status: 400 }
    );
  }

  // Validate password strength
  const passwordStrength = validatePasswordStrength(password);
  if (!passwordStrength.isValid) {
    return NextResponse.json(
      { error: passwordStrength.feedback.join(", ") },
      { status: 400 }
    );
  }

  // Validate name if provided
  const name = body?.name?.trim() || null;
  if (name && name.length > 120) {
    return NextResponse.json(
      { error: "Name ist zu lang." },
      { status: 400 }
    );
  }

  // Check if email already exists
  // Use generic error to prevent email enumeration
  const existing = await findUserByEmail(email);
  if (existing) {
    // Return same success message to prevent enumeration
    return NextResponse.json({
      user: {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
      },
    });
  }

  try {
    const user = await createUser({
      email,
      name,
      password,
    });
    await createUserSession(user);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    // Generic error to prevent information leakage
    return NextResponse.json(
      { error: "Registrierung fehlgeschlagen. Versuche es später erneut." },
      { status: 500 }
    );
  }
}
