import { db } from "@/lib/db";
import { qrStyleTemplates } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await db
      .select()
      .from(qrStyleTemplates)
      .where(eq(qrStyleTemplates.userId, user.id));

    return Response.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return Response.json(
      { error: "Fehler beim Abrufen der Templates" },
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
      description?: string;
      preset: string;
      dotType: string;
      cornerType: string;
      transparent: boolean;
      printMode: boolean;
    };

    if (!body.name) {
      return Response.json({ error: "Name erforderlich" }, { status: 400 });
    }

    const template = await db
      .insert(qrStyleTemplates)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        name: body.name,
        description: body.description,
        preset: body.preset,
        dotType: body.dotType,
        cornerType: body.cornerType,
        transparent: body.transparent,
        printMode: body.printMode,
      })
      .returning();

    return Response.json(template[0], { status: 201 });
  } catch (error) {
    console.error("Error saving template:", error);
    return Response.json(
      { error: "Fehler beim Speichern des Templates" },
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
      .delete(qrStyleTemplates)
      .where(
        and(
          eq(qrStyleTemplates.id, id),
          eq(qrStyleTemplates.userId, user.id)
        )
      )
      .returning();

    if (!result.length) {
      return Response.json({ error: "Template nicht gefunden" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return Response.json(
      { error: "Fehler beim Löschen des Templates" },
      { status: 500 }
    );
  }
}
