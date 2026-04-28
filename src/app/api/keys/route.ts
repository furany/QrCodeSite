import { db } from "@/lib/db";
import { apiKeys } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const keys = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, user.id));

    const safe = keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
    }));

    return Response.json(safe);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return Response.json(
      { error: "Fehler beim Abrufen der API Keys" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name: string;
    };

    if (!body.name) {
      return Response.json({ error: "Name erforderlich" }, { status: 400 });
    }

    const rawKey = `qrft_${crypto.randomUUID().replace(/-/g, "").substring(0, 32)}`;
    const keyHash = hashPassword(rawKey);
    const keyPrefix = rawKey.substring(0, 12);

    const created = await db
      .insert(apiKeys)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        name: body.name,
        keyHash,
        keyPrefix,
      })
      .returning();

    return Response.json({
      id: created[0].id,
      name: created[0].name,
      keyPrefix: created[0].keyPrefix,
      createdAt: created[0].createdAt,
      key: rawKey,
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    return Response.json(
      { error: "Fehler beim Erstellen des API Keys" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "ID erforderlich" }, { status: 400 });
    }

    const result = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id)))
      .returning();

    if (!result.length) {
      return Response.json({ error: "API Key nicht gefunden" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return Response.json(
      { error: "Fehler beim Löschen des API Keys" },
      { status: 500 }
    );
  }
}
