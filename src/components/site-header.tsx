import { LayoutDashboard, LogIn, Plus, QrCode, UserPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/60 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a
          href="/"
          className="group flex items-center gap-2 font-semibold no-underline transition-opacity hover:opacity-80"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-md">
            <QrCode className="size-5" />
          </span>
          <span className="hidden sm:inline text-lg">Qrft</span>
        </a>

        <nav className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <a
                href="/dashboard"
                className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent h-7 gap-1 px-2.5 text-[0.8rem] hidden sm:flex hover:bg-muted hover:text-foreground"
              >
                <LayoutDashboard className="size-3.5" />
                <span className="hidden md:inline ml-1">Dashboard</span>
              </a>
              <a
                href="/create"
                className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent h-7 gap-1 px-2.5 text-[0.8rem] bg-primary text-primary-foreground hover:bg-primary/80 shadow-glow"
              >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline ml-1">Code</span>
              </a>
              <div className="ml-2 h-6 w-px bg-border" />
              <a
                href="/dashboard"
                className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent h-7 gap-1 px-2.5 hover:bg-muted hover:text-foreground"
                title={user.name || user.email}
              >
                <span className="size-8 grid place-items-center rounded-full bg-primary/10 text-primary font-medium text-xs">
                  {(user.name || user.email)[0].toUpperCase()}
                </span>
              </a>
            </>
          ) : (
            <>
              <a
                href="/login"
                className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent h-7 gap-1 px-2.5 text-[0.8rem] hover:bg-muted hover:text-foreground"
              >
                <LogIn className="size-3.5" />
                <span className="hidden sm:inline ml-1">Login</span>
              </a>
              <a
                href="/register"
                className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent h-7 gap-1 px-2.5 text-[0.8rem] bg-primary text-primary-foreground hover:bg-primary/80 shadow-glow"
              >
                <UserPlus className="size-3.5" />
                <span className="hidden sm:inline ml-1">Registrieren</span>
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
