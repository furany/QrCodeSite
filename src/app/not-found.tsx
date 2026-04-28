import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 py-16 text-center">
      <div>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Seite nicht gefunden</h1>
        <p className="mt-3 text-muted-foreground">
          Die angefragte Seite existiert nicht oder wurde verschoben.
        </p>
        <Button className="mt-6 h-10" render={<Link href="/" />}>
          Zur Startseite
        </Button>
      </div>
    </div>
  );
}
