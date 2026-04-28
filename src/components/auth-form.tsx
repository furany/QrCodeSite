"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Mail, Lock, User } from "lucide-react";
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password || (mode === "register" && !name)) {
        throw new Error("Bitte fülle alle Felder aus.");
      }

      if (password.length < 8) {
        throw new Error("Passwort muss mindestens 8 Zeichen lang sein.");
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
        {mode === "register" && (
          <p className="text-xs text-muted-foreground">
            Mindestens 8 Zeichen, besser mehr für Sicherheit.
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
