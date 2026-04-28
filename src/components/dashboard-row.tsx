"use client";

import { useState } from "react";
import { Copy, ExternalLink, Pencil, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authorizedFetch } from "@/lib/client-auth";
import { parseHttpUrl } from "@/lib/validation";

export function DashboardRow({
  code,
  initialTargetUrl,
  initialTitle,
  scanCount,
  createdAt,
  lastScanAt,
  shortUrl,
}: {
  code: string;
  initialTargetUrl: string;
  initialTitle: string | null;
  scanCount: number;
  createdAt: string;
  lastScanAt: string | null;
  shortUrl: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [targetUrl, setTargetUrl] = useState(initialTargetUrl);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsedTarget = parseHttpUrl(targetUrl);
    if (!parsedTarget) {
      toast.error("Bitte gib eine gültige http(s)-URL ein.");
      return;
    }

    setSaving(true);
    try {
      const res = await authorizedFetch(`/api/qr/${code}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetUrl: parsedTarget,
          title: title || null,
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

  async function remove() {
    if (!confirm("QR-Code wirklich löschen? Bestehende Scans laufen ins Leere.")) {
      return;
    }

    const res = await authorizedFetch(`/api/qr/${code}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Gelöscht.");
      router.refresh();
    } else {
      toast.error("Loeschen fehlgeschlagen.");
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
              {code}
            </code>
            <h2 className="truncate text-base font-semibold">
              {initialTitle || "Unbenannter Code"}
            </h2>
            <span className="text-xs text-muted-foreground">
              {scanCount} Scan{scanCount === 1 ? "" : "s"}
            </span>
          </div>

          {!editing ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 break-all font-mono text-primary hover:underline"
                >
                  {shortUrl}
                </a>
                <ExternalLink className="size-3.5 text-muted-foreground" />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Kurz-URL kopieren"
                  onClick={() => void copy(shortUrl)}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
              <p className="break-all text-muted-foreground">
                Ziel: {initialTargetUrl}
              </p>
              <p className="text-xs text-muted-foreground">
                Erstellt {new Date(createdAt).toLocaleDateString("de-DE")}
                {lastScanAt
                  ? ` · letzter Scan ${new Date(lastScanAt).toLocaleDateString(
                      "de-DE",
                    )}`
                  : ""}
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Bezeichnung</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ziel-URL</Label>
                <Input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
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
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              Bearbeiten
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="QR-Code löschen"
            onClick={() => void remove()}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
