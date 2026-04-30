import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import {
  getCurrentUser,
  getUserCount,
  isRegistrationClosed,
  isRegistrationInviteOnly,
} from "@/lib/auth";

export const metadata = {
  title: "Registrieren",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const next = safeNextPath((await searchParams).next);
  if (user) redirect(next);

  const userCount = await getUserCount();
  const requiresInvite = isRegistrationInviteOnly(userCount);
  const registrationClosed = isRegistrationClosed(userCount);

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="w-full rounded-lg border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">
          {userCount === 0 ? "Admin-Konto erstellen" : "Registrieren"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {userCount === 0
            ? "Das erste Konto wird automatisch Admin."
            : requiresInvite
              ? "Erstelle dein Konto mit deinem Einladungscode."
              : registrationClosed
                ? "Registrierung ist derzeit geschlossen."
                : "Erstelle ein Konto, um dynamische QR-Codes zu speichern und zu bearbeiten."}
        </p>
        <div className="mt-5">
          {registrationClosed ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Bitte logge dich mit einem bestehenden Konto ein oder kontaktiere
              den Betreiber der Seite.
            </div>
          ) : (
            <AuthForm
              mode="register"
              next={next}
              requiresInvite={requiresInvite}
            />
          )}
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Schon registriert?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-primary hover:underline"
          >
            Einloggen
          </Link>
        </p>
      </div>
    </div>
  );
}

function safeNextPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}
