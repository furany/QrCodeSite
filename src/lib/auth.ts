import crypto from "node:crypto";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { users, type User } from "@/lib/schema";

export const AUTH_COOKIE = "qrft_session";

const newUserId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) return null;

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  return rows[0] ?? null;
}

export async function createUserSession(user: User, req?: Request) {
  const token = signSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  });
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearUserSession(req?: Request) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: 0,
  });
}

export async function createUser({
  email,
  name,
  password,
}: {
  email: string;
  name: string | null;
  password: string;
}) {
  const count = await getUserCount();
  const user: User = {
    id: newUserId(),
    email: normalizeEmail(email),
    name,
    passwordHash: hashPassword(password),
    role: count === 0 ? "admin" : "member",
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(users).values(user);
  return user;
}

export async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getUserCount() {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  return rows[0]?.count ?? 0;
}

export function canRegister({
  userCount,
  inviteCode,
}: {
  userCount: number;
  inviteCode?: string | null;
}) {
  if (userCount === 0) return true;
  if (process.env.REGISTRATION_ENABLED === "true") return true;

  const requiredInvite = process.env.INVITE_CODE;
  return Boolean(requiredInvite && inviteCode && inviteCode === requiredInvite);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [method, salt, hash] = storedHash.split(":");
  if (method !== "scrypt" || !salt || !hash) return false;

  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
}

function signSessionToken(payload: {
  sub: string;
  email: string;
  role: string;
  exp: number;
}) {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");

  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as { sub: string; email: string; role: string; exp: number };

    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function getAuthSecret() {
  return (
    process.env.AUTH_SECRET ??
    process.env.ADMIN_PASSWORD ??
    "dev-only-change-this-secret"
  );
}

function shouldUseSecureCookie(req?: Request) {
  const protocol = requestProtocol(req);
  if (protocol) return protocol === "https";

  const configuredBaseUrl =
    process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL;
  if (configuredBaseUrl) {
    try {
      return new URL(configuredBaseUrl).protocol === "https:";
    } catch {
      return false;
    }
  }

  return process.env.NODE_ENV === "production";
}

function requestProtocol(req?: Request) {
  if (!req) return null;

  const forwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProto) return forwardedProto;

  const forwarded = req.headers.get("forwarded");
  const forwardedMatch = forwarded?.match(/(?:^|;|,\s*)proto=(https?)/i);
  if (forwardedMatch?.[1]) return forwardedMatch[1].toLowerCase();

  return new URL(req.url).protocol.replace(":", "").toLowerCase();
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
