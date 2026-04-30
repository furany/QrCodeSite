import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const next = safeNextPath((await searchParams).next);
  if (user) redirect(next);

  return (
    <AuthShell
      title="Einloggen"
      text="Melde dich an, um dynamische QR-Codes zu erstellen und zu verwalten."
      footer={
        <>
          Noch kein Konto?{" "}
          <Link
            href={`/register?next=${encodeURIComponent(next)}`}
            className="text-primary hover:underline"
          >
            Registrieren
          </Link>
        </>
      }
    >
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}

function AuthShell({
  title,
  text,
  footer,
  children,
}: {
  title: string;
  text: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
      <div className="w-full rounded-lg border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
        <div className="mt-5">{children}</div>
        <p className="mt-5 text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  );
}

function safeNextPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}
