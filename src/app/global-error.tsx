"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="de">
      <body className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <Card className="glass-md w-full max-w-md p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="grid size-20 place-items-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-10" />
            </div>
          </div>

          <h1 className="mb-3 text-3xl font-semibold">Etwas ist schief gelaufen</h1>
          <p className="mb-2 text-muted-foreground">
            Ein unerwarteter Fehler ist aufgetreten.
          </p>

          {error.message && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-muted-foreground overflow-auto max-h-24">
              <code className="text-xs break-all">{error.message}</code>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={reset} size="lg">
              Erneut versuchen
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => (window.location.href = "/")}
            >
              Zur Startseite
            </Button>
          </div>

          {error.digest && (
            <p className="mt-4 text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </Card>
      </body>
    </html>
  );
}
