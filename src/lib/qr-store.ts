import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { type QrType } from "@/lib/qr-types";
import { qrCodes } from "@/lib/schema";

const newCode = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 7);

export async function insertQrCode({
  code,
  targetUrl,
  qrType,
  qrData,
  title,
  expiresAt,
  userId,
}: {
  code: string | null;
  targetUrl: string;
  qrType: QrType;
  qrData: string | null;
  title: string | null;
  expiresAt: Date | null;
  userId: string;
}) {
  if (code) {
    await db.insert(qrCodes).values({
      code,
      targetUrl,
      qrType,
      qrData,
      title,
      expiresAt,
      userId,
    });
    return code;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const generatedCode = newCode();
    try {
      await db.insert(qrCodes).values({
        code: generatedCode,
        targetUrl,
        qrType,
        qrData,
        title,
        expiresAt,
        userId,
      });
      return generatedCode;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  throw new Error("Konnte keinen eindeutigen QR-Code erzeugen.");
}

export function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
