"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authorizedFetch } from "@/lib/client-auth";

type ApiKeyData = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt?: string;
};

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<{
    id: string;
    key: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const res = await authorizedFetch("/api/keys");
      if (res.ok) {
        const data = (await res.json()) as ApiKeyData[];
        setKeys(data);
      }
    } catch (error) {
      console.error("Error loading keys:", error);
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) {
      toast.error("Name erforderlich.");
      return;
    }

    setLoading(true);
    try {
      const res = await authorizedFetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (!res.ok) {
        throw new Error("Fehler beim Erstellen des API Keys.");
      }

      const data = (await res.json()) as {
        id: string;
        key: string;
        name: string;
      };
      setCreatedKey(data);
      setNewKeyName("");
      await loadKeys();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("Wirklich löschen?")) return;

    try {
      const res = await authorizedFetch(`/api/keys?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setKeys(keys.filter((k) => k.id !== id));
        toast.success("API Key gelöscht.");
      } else {
        toast.error("Fehler beim Löschen.");
      }
    } catch (error) {
      toast.error("Fehler beim Löschen.");
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Kopiert!");
  }

  return (
    <div className="space-y-4">
      {createdKey && (
        <div className="rounded-lg border border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-3">
          <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            Neuer API Key erstellt
          </p>
          <div className="flex items-center gap-2 bg-background rounded px-2 py-1 text-xs font-mono mb-2">
            <code className="flex-1 break-all">{createdKey.key}</code>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => void copyToClipboard(createdKey.key)}
            >
              <Copy className="size-3" />
            </Button>
          </div>
          <p className="text-xs text-green-800 dark:text-green-200">
            Speichere diesen Key sicher. Du kannst ihn später nicht mehr sehen.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => setCreatedKey(null)}
          >
            Verstanden
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="key-name">Name für neuen API Key</Label>
        <div className="flex gap-2">
          <Input
            id="key-name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="z.B. Mobile App, CI/CD Pipeline"
            disabled={loading}
          />
          <Button onClick={createKey} disabled={loading || !newKeyName.trim()}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Erstellen"
            )}
          </Button>
        </div>
      </div>

      {keys.length > 0 && (
        <div className="space-y-2">
          <Label>Deine API Keys</Label>
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{key.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {key.keyPrefix}...
                  </p>
                  {key.lastUsedAt && (
                    <p className="text-xs text-muted-foreground">
                      Zuletzt verwendet:{" "}
                      {new Date(key.lastUsedAt).toLocaleDateString("de-DE")}
                    </p>
                  )}
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => void deleteKey(key.id)}
                  title="Löschen"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {keys.length === 0 && !createdKey && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Noch keine API Keys erstellt. Erstelle einen, um die API zu nutzen.
        </div>
      )}
    </div>
  );
}
