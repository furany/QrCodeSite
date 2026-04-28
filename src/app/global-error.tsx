"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body>
        <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
          <div className="max-w-md text-center">
            <p className="text-sm font-medium text-primary">Fehler</p>
            <h1 className="mt-2 text-3xl font-semibold">
              Etwas ist schiefgelaufen
            </h1>
            <p className="mt-3 text-muted-foreground">
              Bitte versuche es erneut. Falls der Fehler bleibt, pruefe die
              Dokploy-Logs und die Datenbankverbindung.
            </p>
            <Button className="mt-6 h-10" onClick={reset}>
              Erneut versuchen
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
