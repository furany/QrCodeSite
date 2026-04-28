import Link from "next/link";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/20">
            <QrCode className="size-4" />
          </div>
          <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            Qrft
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Button variant="ghost" size="sm" render={<Link href="/create" />}>
            Erstellen
          </Button>
          <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
            Dashboard
          </Button>
          <Button size="sm" className="ml-2" render={<Link href="/create" />}>
            Loslegen
          </Button>
        </nav>
      </div>
    </header>
  );
}
