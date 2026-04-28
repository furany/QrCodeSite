"use client";

import { useState } from "react";
import {
  Archive,
  Copy,
  ExternalLink,
  Pencil,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DashboardItem } from "@/components/dashboard-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authorizedFetch } from "@/lib/client-auth";
import { parseHttpUrl } from "@/lib/validation";

export function DashboardRow({ item }: { item: DashboardItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [targetUrl, setTargetUrl] = useState(item.targetUrl);
  const [title, setTitle] = useState(item.title ?? "");
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(item.expiresAt));
  const [saving, setSaving] = useState(false);
  const isArchived = Boolean(item.archivedAt);
  const isExpired = item.isExpired;

  async function save() {
    const parsedTarget = parseHttpUrl(targetUrl);
    if (!parsedTarget) {
      toast.error("Bitte gib eine gültige http(s)-URL ein.");
      return;
    }

    setSaving(true);
    try {
      const res = await authorizedFetch(`/api/qr/${item.code}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetUrl: parsedTarget,
          title: title || null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Speichern fehlgeschlagen");
      }

      toast.success("Gespeichert.");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function setArchived(archived: boolean) {
    const res = await authorizedFetch(`/api/qr/${item.code}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archived }),
    });

    if (res.ok) {
      toast.success(archived ? "Archiviert." : "Wiederhergestellt.");
      router.refresh();
    } else {
      toast.error("Aktion fehlgeschlagen.");
    }
  }

  async function duplicate() {
    const res = await authorizedFetch("/api/qr", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetUrl: item.targetUrl,
        title: item.title ? `${item.title} Kopie` : "Kopie",
        expiresAt: item.expiresAt,
      }),
    });

    if (res.ok) {
      const body = (await res.json()) as { shortUrl: string };
      await navigator.clipboard.writeText(body.shortUrl);
      toast.success("Kopie erstellt und Kurz-URL kopiert.");
      router.refresh();
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? "Duplizieren fehlgeschlagen.");
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Kopiert.");
  }

  return (
    <Card className="border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              {item.code}
            </code>
            <h2 className="truncate text-base font-semibold">
              {item.title || "Unbenannter Code"}
            </h2>
            <StatusBadge archived={isArchived} expired={isExpired} />
            <span className="text-xs text-muted-foreground">
              {item.scanCount} Scan{item.scanCount === 1 ? "" : "s"}
            </span>
          </div>

          {!editing ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <a
                  href={item.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 break-all font-mono text-primary hover:underline"
                >
                  {item.shortUrl}
                </a>
                <ExternalLink className="size-3.5 text-muted-foreground" />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Kurz-URL kopieren"
                  onClick={() => void copy(item.shortUrl)}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
              <p className="break-all text-muted-foreground">
                Ziel: {item.targetUrl}
              </p>
              <p className="text-xs text-muted-foreground">
                Erstellt {formatDate(item.createdAt)}
                {item.lastScanAt ? ` · letzter Scan ${formatDate(item.lastScanAt)}` : ""}
                {item.expiresAt ? ` · gültig bis ${formatDate(item.expiresAt)}` : ""}
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr_220px]">
              <Field label="Bezeichnung">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Ziel-URL">
                <Input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
              </Field>
              <Field label="Gültig bis">
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {editing ? (
            <>
              <Button onClick={save} disabled={saving} size="sm">
                <Save className="size-4" />
                Speichern
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Bearbeitung abbrechen"
                onClick={() => setEditing(false)}
              >
                <X className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-4" />
                Bearbeiten
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void duplicate()}>
                <Copy className="size-4" />
                Duplizieren
              </Button>
            </>
          )}
          {isArchived ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void setArchived(false)}
            >
              <RotateCcw className="size-4" />
              Restore
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void setArchived(true)}
            >
              <Archive className="size-4" />
              Archivieren
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function StatusBadge({
  archived,
  expired,
}: {
  archived: boolean;
  expired: boolean;
}) {
  const label = archived ? "Archiv" : expired ? "Abgelaufen" : "Aktiv";
  const className = archived
    ? "bg-muted text-muted-foreground"
    : expired
      ? "bg-amber-100 text-amber-900"
      : "bg-primary/10 text-primary";

  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
