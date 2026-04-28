import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-12">
      <Card className="glass-md w-full p-8 text-center sm:p-10">
        <div className="mb-6 flex justify-center">
          <div className="grid size-20 place-items-center rounded-full bg-primary/10 text-primary">
            <Search className="size-10" />
          </div>
        </div>

        <p className="text-sm font-medium text-primary mb-3">404</p>
        <h1 className="mb-3 text-4xl font-semibold sm:text-5xl">Seite nicht gefunden</h1>
        <p className="mb-6 text-muted-foreground max-w-md mx-auto">
          Die angefragte Seite existiert nicht oder wurde verschoben. Hier kannst du wieder anfangen.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            render={<Link href="/" />}
          >
            <Home className="size-4" />
            Startseite
          </Button>
          <Button
            variant="outline"
            size="lg"
            render={<Link href="/create" />}
          >
            QR-Code erstellen
          </Button>
        </div>
      </Card>
    </div>
  );
}
