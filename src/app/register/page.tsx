import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser, getUserCount } from "@/lib/auth";

export const metadata = {
  title: "Registrieren",
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const userCount = await getUserCount();
  const requiresInvite =
    userCount > 0 &&
    process.env.REGISTRATION_ENABLED !== "true" &&
    Boolean(process.env.INVITE_CODE);

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="w-full rounded-lg border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">
          {userCount === 0 ? "Admin-Konto erstellen" : "Registrieren"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {userCount === 0
            ? "Das erste Konto wird automatisch Admin."
            : "Neue Konten sollten in Produktion nur per Einladung erstellt werden."}
        </p>
        <div className="mt-5">
          <AuthForm mode="register" requiresInvite={requiresInvite} />
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Schon registriert?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Einloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
