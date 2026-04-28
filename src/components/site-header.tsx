import { LayoutDashboard, Plus, QrCode } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <QrCode className="size-4" />
          </span>
          <span>Qrft</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
            <LayoutDashboard className="size-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <Button size="sm" render={<Link href="/create" />}>
            <Plus className="size-4" />
            Erstellen
          </Button>
        </nav>
      </div>
    </header>
  );
}
