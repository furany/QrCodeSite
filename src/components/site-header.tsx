import { LayoutDashboard, LogIn, Plus, QrCode, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/60 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2 font-semibold no-underline transition-opacity hover:opacity-80"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-md">
            <QrCode className="size-5" />
          </span>
          <span className="hidden sm:inline text-lg">Qrft</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex"
                render={<Link href="/dashboard" />}
              >
                <LayoutDashboard className="size-4" />
                <span className="hidden md:inline ml-1">Dashboard</span>
              </Button>
              <Button
                size="sm"
                className="shadow-glow"
                render={<Link href="/create" />}
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline ml-1">Code</span>
              </Button>
              <div className="ml-2 h-6 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/dashboard" />}
                title={user.name || user.email}
              >
                <span className="size-8 grid place-items-center rounded-full bg-primary/10 text-primary font-medium text-xs">
                  {(user.name || user.email)[0].toUpperCase()}
                </span>
              </Button>
              <LogoutButton showLabel />
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/login" />}
              >
                <LogIn className="size-4" />
                <span className="hidden sm:inline ml-1">Login</span>
              </Button>
              <Button
                size="sm"
                className="shadow-glow"
                render={<Link href="/register" />}
              >
                <UserPlus className="size-4" />
                <span className="hidden sm:inline ml-1">Registrieren</span>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
