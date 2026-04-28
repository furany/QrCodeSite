"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { validatePasswordStrength, passwordStrengthLabel } from "@/lib/password";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({
  mode,
  next = "/dashboard",
  requiresInvite = false,
}: {
  mode: "login" | "register";
  next?: string;
  requiresInvite?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

  const passwordStrength = useMemo(
    () => validatePasswordStrength(password),
    [password]
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password || (mode === "register" && !name)) {
        throw new Error("Bitte fülle alle Felder aus.");
      }

      if (mode === "register" && !passwordStrength.isValid) {
        throw new Error(
          "Passwort erfüllt nicht die Anforderungen: " +
            passwordStrength.feedback.join(", ")
        );
      }

      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          name: mode === "register" ? name : undefined,
          password,
          inviteCode: mode === "register" && requiresInvite ? inviteCode : undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Aktion fehlgeschlagen. Bitte versuche es später erneut.");
      }

      toast.success(mode === "login" ? "Erfolgreich eingeloggt!" : "Konto erstellt!");
      router.push(next);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <div className="flex gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="size-3.5" /> Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein Name"
            autoComplete="name"
            disabled={loading}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center gap-2">
          <Mail className="size-3.5" /> E-Mail
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="deine@email.de"
          autoComplete="email"
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="flex items-center gap-2">
          <Lock className="size-3.5" /> Passwort
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "login" ? "••••••••" : "Mindestens 8 Zeichen"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          disabled={loading}
          required
        />
        {mode === "register" && password && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    passwordStrength.score === 0
                      ? "w-1/4 bg-red-600"
                      : passwordStrength.score === 1
                        ? "w-2/4 bg-orange-600"
                        : passwordStrength.score === 2
                          ? "w-3/4 bg-yellow-600"
                          : "w-full bg-green-600"
                  }`}
                />
              </div>
              <span className="text-xs font-medium whitespace-nowrap">
                {passwordStrengthLabel(passwordStrength.score)}
              </span>
            </div>
            {passwordStrength.feedback.length > 0 ? (
              <ul className="text-xs text-destructive space-y-1">
                {passwordStrength.feedback.map((msg) => (
                  <li key={msg}>• {msg}</li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="size-3" />
                Passwort erfüllt alle Anforderungen
              </div>
            )}
          </div>
        )}
        {mode === "register" && !password && (
          <p className="text-xs text-muted-foreground">
            Mindestens 8 Zeichen mit Groß-/Kleinbuchstaben, Zahlen und Sonderzeichen.
          </p>
        )}
      </div>

      {requiresInvite && mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="invite">Einladungscode</Label>
          <Input
            id="invite"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Dein Einladungscode"
            disabled={loading}
            required
          />
        </div>
      )}

      <Button
        type="submit"
        className="w-full shadow-glow"
        disabled={loading}
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {mode === "login" ? "Einloggen..." : "Konto wird erstellt..."}
          </>
        ) : mode === "login" ? (
          "Einloggen"
        ) : (
          "Konto erstellen"
        )}
      </Button>

      <p className="text-sm text-muted-foreground">
        {mode === "login"
          ? "Noch kein Konto? "
          : "Bereits registriert? "}
        <a
          href={mode === "login" ? "/register" : "/login"}
          className="font-semibold text-primary hover:underline"
        >
          {mode === "login" ? "Registrieren" : "Einloggen"}
        </a>
      </p>
    </form>
  );
}
