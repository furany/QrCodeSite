"use client";

import { useState } from "react";
import { Copy, Pencil, Save, Trash2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function DashboardRow({
  code,
  initialTargetUrl,
  initialTitle,
  scanCount,
  createdAt,
  shortUrl,
}: {
  code: string;
  initialTargetUrl: string;
  initialTitle: string | null;
  scanCount: number;
  createdAt: string;
  shortUrl: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [targetUrl, setTargetUrl] = useState(initialTargetUrl);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/qr/${code}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUrl, title: title || null }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Speichern fehlgeschlagen");
      }
      toast.success("Gespeichert");
      setEditing(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("QR-Code wirklich löschen? Bestehende Scans laufen ins Leere.")) {
      return;
    }
    const res = await fetch(`/api/qr/${code}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Gelöscht");
      router.refresh();
    } else {
      toast.error("Löschen fehlgeschlagen");
    }
  }

  return (
    <Card className="border-border/60 bg-card/40 p-5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-gradient-to-br from-fuchsia-500/20 via-violet-500/20 to-cyan-400/20 px-2 py-0.5 font-mono text-xs text-violet-300">
              {code}
            </span>
            {initialTitle && !editing && (
              <span className="font-medium">{initialTitle}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {scanCount} Scan{scanCount === 1 ? "" : "s"} ·{" "}
              {new Date(createdAt).toLocaleDateString("de-DE")}
            </span>
          </div>

          {!editing ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a
                href={shortUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all font-mono text-sm text-violet-300 hover:underline"
              >
                {shortUrl} <ExternalLink className="size-3" />
              </a>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(shortUrl);
                  toast.success("Kopiert");
                }}
              >
                <Copy className="size-3.5" />
              </Button>
              <span className="text-muted-foreground">→</span>
              <span className="break-all text-sm text-muted-foreground">
                {initialTargetUrl}
              </span>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Bezeichnung</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
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
            <Button onClick={save} disabled={saving} size="sm">
              <Save className="size-4" /> Speichern
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" /> Bearbeiten
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={remove}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
