import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { ApiKeyManager } from "@/components/api-key-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Einstellungen",
  description: "Account-Einstellungen und API-Keys verwalten",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/settings");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <p className="text-sm font-medium text-primary">Konto</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Einstellungen</h1>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Profil</h2>
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                E-Mail
              </p>
              <p className="mt-1 text-sm">{user.email}</p>
            </div>
            {user.name && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Name
                </p>
                <p className="mt-1 text-sm">{user.name}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">API Keys</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Verwende API Keys, um QR-Codes programmgesteuert zu erstellen. Jeder Key
            gewährt Zugriff auf die QR-Code-API.
          </p>
          <ApiKeyManager />
        </Card>

        <Card className="border-border bg-blue-50 dark:bg-blue-950/30 p-4 text-sm">
          <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            API-Dokumentation (bald verfügbar)
          </p>
          <p className="text-blue-800 dark:text-blue-200">
            Vollständige REST-API-Dokumentation mit Beispielen kommt bald. Die API
            ermöglicht es dir, QR-Codes zu erstellen, zu bearbeiten und zu löschen.
          </p>
        </Card>
      </div>
    </div>
  );
}
