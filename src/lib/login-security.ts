import { db } from "@/lib/db";
import { loginAttempts } from "@/lib/schema";
import { and, eq, gt } from "drizzle-orm";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function recordLoginAttempt(
  email: string,
  success: boolean,
  request: Request
) {
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  try {
    await db.insert(loginAttempts).values({
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      success,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Error recording login attempt:", error);
  }
}

export async function checkAccountLockout(email: string): Promise<{
  isLocked: boolean;
  remainingMinutes: number;
}> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - ATTEMPT_WINDOW_MS);

    const recentAttempts = await db
      .select()
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, email.toLowerCase()),
          gt(loginAttempts.createdAt, windowStart)
        )
      );

    const failedAttempts = recentAttempts.filter((a) => !a.success);

    if (failedAttempts.length < MAX_FAILED_ATTEMPTS) {
      return { isLocked: false, remainingMinutes: 0 };
    }

    const oldestFailedAttempt = failedAttempts[0];
    const lockoutExpiresAt = new Date(
      oldestFailedAttempt.createdAt.getTime() + LOCKOUT_DURATION_MS
    );

    if (lockoutExpiresAt <= now) {
      return { isLocked: false, remainingMinutes: 0 };
    }

    const remainingMs = lockoutExpiresAt.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    return { isLocked: true, remainingMinutes };
  } catch (error) {
    console.error("Error checking account lockout:", error);
    return { isLocked: false, remainingMinutes: 0 };
  }
}

function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return undefined;
}
