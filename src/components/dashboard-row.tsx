"use client";

import { useState } from "react";
import {
  Archive,
  BarChart3,
  Copy,
  ExternalLink,
  Pencil,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DashboardItem } from "@/components/dashboard-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authorizedFetch } from "@/lib/client-auth";
import { normalizeUrlInput, parseHttpUrl } from "@/lib/validation";
import {
  QR_TYPES,
  validateQrData,
  wifiRequiresPassword,
  type QrType,
} from "@/lib/qr-types";

export function DashboardRow({ item }: { item: DashboardItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [targetUrl, setTargetUrl] = useState(item.targetUrl);
  const [qrType, setQrType] = useState<QrType>(item.qrType);
  const [qrData, setQrData] = useState<Record<string, string>>(
    item.qrData ?? defaultDataForType(item.qrType),
  );
  const [title, setTitle] = useState(item.title ?? "");
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(item.expiresAt));
  const [saving, setSaving] = useState(false);
  const isArchived = Boolean(item.archivedAt);
  const isExpired = item.isExpired;

  async function save() {
    const body: {
      targetUrl?: string;
      qrType: QrType;
      qrData?: Record<string, string> | null;
      title: string | null;
      expiresAt: string | null;
    } = {
      qrType,
      title: title || null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    if (qrType === "url") {
      const parsedTarget = parseHttpUrl(targetUrl);
      if (!parsedTarget) {
        toast.error("Bitte gib eine gültige http(s)-URL ein.");
        return;
      }
      body.targetUrl = parsedTarget;
      body.qrData = null;
    } else {
      const normalizedData = normalizeQrDataForType(qrType, qrData);
      const validationError = validateQrData(qrType, normalizedData);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      body.qrData = normalizedData;
    }

    setSaving(true);
    try {
      const res = await authorizedFetch(`/api/qr/${item.code}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const responseBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(responseBody.error ?? "Speichern fehlgeschlagen");
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
        qrType: item.qrType,
        qrData: item.qrData,
        isDynamic: item.qrType !== "url",
        title: item.title ? `${item.title} Kopie` : "Kopie",
        expiresAt: item.expiresAt,
      }),
    });

    if (res.ok) {
      const responseBody = (await res.json()) as { shortUrl: string };
      await navigator.clipboard.writeText(responseBody.shortUrl);
      toast.success("Kopie erstellt und Kurz-URL kopiert.");
      router.refresh();
    } else {
      const responseBody = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      toast.error(responseBody.error ?? "Duplizieren fehlgeschlagen.");
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Kopiert.");
  }

  function startEditing() {
    resetEditState();
    setEditing(true);
  }

  function cancelEditing() {
    resetEditState();
    setEditing(false);
  }

  function resetEditState() {
    setQrType(item.qrType);
    setQrData(item.qrData ?? defaultDataForType(item.qrType));
    setTargetUrl(item.targetUrl);
    setTitle(item.title ?? "");
    setExpiresAt(toDatetimeLocal(item.expiresAt));
  }

  function changeQrType(nextType: QrType) {
    setQrType(nextType);
    setQrData(
      nextType === item.qrType
        ? item.qrData ?? defaultDataForType(nextType)
        : defaultDataForType(nextType),
    );
    if (nextType === "url") {
      setTargetUrl(item.qrType === "url" ? item.targetUrl : "");
    }
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
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {QR_TYPES[item.qrType].label}
            </span>
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
                {item.qrType === "url"
                  ? `Ziel: ${item.targetUrl}`
                  : `Inhalt: ${summaryForItem(item)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Erstellt {formatDate(item.createdAt)}
                {item.lastScanAt
                  ? ` · letzter Scan ${formatDate(item.lastScanAt)}`
                  : ""}
                {item.expiresAt
                  ? ` · gültig bis ${formatDate(item.expiresAt)}`
                  : ""}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
                <Field label="Typ">
                  <Select
                    value={qrType}
                    onValueChange={(value) => changeQrType(value as QrType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(QR_TYPES) as QrType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {QR_TYPES[type].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Bezeichnung">
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </Field>
                <Field label="Gültig bis">
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                  />
                </Field>
              </div>

              {qrType === "url" ? (
                <Field label="Ziel-URL">
                  <Input
                    value={targetUrl}
                    onBlur={() => {
                      if (targetUrl.trim()) {
                        setTargetUrl(normalizeUrlInput(targetUrl));
                      }
                    }}
                    onChange={(event) => setTargetUrl(event.target.value)}
                    placeholder="https://example.com"
                  />
                </Field>
              ) : (
                <QrDataFields
                  type={qrType}
                  data={qrData}
                  onChange={setQrData}
                  idPrefix={`edit-${item.code}`}
                />
              )}
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
                onClick={cancelEditing}
              >
                <X className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                render={<Link href={`/dashboard/analytics/${item.code}`} />}
              >
                <BarChart3 className="size-4" />
                Analytics
              </Button>
              <Button variant="secondary" size="sm" onClick={startEditing}>
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

function QrDataFields({
  type,
  data,
  idPrefix,
  onChange,
}: {
  type: Exclude<QrType, "url">;
  data: Record<string, string>;
  idPrefix: string;
  onChange: (data: Record<string, string>) => void;
}) {
  function update(key: string, value: string) {
    onChange({ ...data, [key]: value });
  }

  switch (type) {
    case "tel":
      return (
        <Field label="Telefonnummer">
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            value={data.phone || ""}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="+49123456789"
          />
        </Field>
      );

    case "sms":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telefonnummer">
            <Input
              id={`${idPrefix}-sms-phone`}
              type="tel"
              value={data.phone || ""}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="+49123456789"
            />
          </Field>
          <Field label="Nachricht">
            <Input
              id={`${idPrefix}-sms-message`}
              value={data.message || ""}
              onChange={(event) => update("message", event.target.value)}
              placeholder="Optionale Nachricht"
            />
          </Field>
        </div>
      );

    case "email":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="E-Mail-Adresse">
              <Input
                id={`${idPrefix}-email`}
                type="email"
                value={data.email || ""}
                onChange={(event) => update("email", event.target.value)}
                placeholder="kontakt@example.com"
              />
            </Field>
            <Field label="Betreff">
              <Input
                id={`${idPrefix}-email-subject`}
                value={data.subject || ""}
                onChange={(event) => update("subject", event.target.value)}
                placeholder="Optionaler Betreff"
              />
            </Field>
          </div>
          <Field label="Nachricht">
            <textarea
              id={`${idPrefix}-email-body`}
              value={data.body || ""}
              onChange={(event) => update("body", event.target.value)}
              placeholder="Optionale Nachricht"
              className={textareaClassName}
            />
          </Field>
        </div>
      );

    case "vcard":
      return (
        <div className="space-y-3">
          <Field label="Anzeigename">
            <Input
              id={`${idPrefix}-vcard-name`}
              value={data.name || ""}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Max Mustermann"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vorname">
              <Input
                id={`${idPrefix}-vcard-first-name`}
                value={data.firstName || ""}
                onChange={(event) => update("firstName", event.target.value)}
                placeholder="Max"
              />
            </Field>
            <Field label="Nachname">
              <Input
                id={`${idPrefix}-vcard-last-name`}
                value={data.lastName || ""}
                onChange={(event) => update("lastName", event.target.value)}
                placeholder="Mustermann"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="E-Mail">
              <Input
                id={`${idPrefix}-vcard-email`}
                type="email"
                value={data.email || ""}
                onChange={(event) => update("email", event.target.value)}
                placeholder="max@example.com"
              />
            </Field>
            <Field label="Telefon">
              <Input
                id={`${idPrefix}-vcard-phone`}
                type="tel"
                value={data.phone || ""}
                onChange={(event) => update("phone", event.target.value)}
                placeholder="+49123456789"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Telefon Arbeit">
              <Input
                id={`${idPrefix}-vcard-work-phone`}
                type="tel"
                value={data.workPhone || ""}
                onChange={(event) => update("workPhone", event.target.value)}
                placeholder="+49 30 123456"
              />
            </Field>
            <Field label="Position">
              <Input
                id={`${idPrefix}-vcard-job-title`}
                value={data.jobTitle || ""}
                onChange={(event) => update("jobTitle", event.target.value)}
                placeholder="Founder"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Organisation">
              <Input
                id={`${idPrefix}-vcard-org`}
                value={data.org || ""}
                onChange={(event) => update("org", event.target.value)}
                placeholder="Firma"
              />
            </Field>
            <Field label="Abteilung">
              <Input
                id={`${idPrefix}-vcard-department`}
                value={data.department || ""}
                onChange={(event) => update("department", event.target.value)}
                placeholder="Marketing"
              />
            </Field>
            <Field label="Website">
              <Input
                id={`${idPrefix}-vcard-url`}
                type="url"
                value={data.url || ""}
                onBlur={() => {
                  if (data.url?.trim()) update("url", normalizeUrlInput(data.url));
                }}
                onChange={(event) => update("url", event.target.value)}
                placeholder="https://example.com"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Straße">
              <Input
                id={`${idPrefix}-vcard-street`}
                value={data.street || ""}
                onChange={(event) => update("street", event.target.value)}
                placeholder="Musterstraße 1"
              />
            </Field>
            <Field label="Ort">
              <Input
                id={`${idPrefix}-vcard-city`}
                value={data.city || ""}
                onChange={(event) => update("city", event.target.value)}
                placeholder="Berlin"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="PLZ">
              <Input
                id={`${idPrefix}-vcard-postal-code`}
                value={data.postalCode || ""}
                onChange={(event) => update("postalCode", event.target.value)}
                placeholder="10115"
              />
            </Field>
            <Field label="Region">
              <Input
                id={`${idPrefix}-vcard-region`}
                value={data.region || ""}
                onChange={(event) => update("region", event.target.value)}
                placeholder="Berlin"
              />
            </Field>
            <Field label="Land">
              <Input
                id={`${idPrefix}-vcard-country`}
                value={data.country || ""}
                onChange={(event) => update("country", event.target.value)}
                placeholder="Deutschland"
              />
            </Field>
          </div>
          <Field label="Notiz">
            <textarea
              id={`${idPrefix}-vcard-note`}
              value={data.note || ""}
              onChange={(event) => update("note", event.target.value)}
              placeholder="Optionaler Hinweis"
              className={textareaClassName}
            />
          </Field>
        </div>
      );

    case "wifi":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SSID">
              <Input
                id={`${idPrefix}-wifi-ssid`}
                value={data.ssid || ""}
                onChange={(event) => update("ssid", event.target.value)}
                placeholder="Mein Netzwerk"
              />
            </Field>
            <Field label="Sicherheit">
              <Select
                value={data.security === "open" ? "nopass" : data.security || "WPA"}
                onValueChange={(value) => {
                  if (value) update("security", value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WPA">WPA/WPA2</SelectItem>
                  <SelectItem value="WPA2">WPA2</SelectItem>
                  <SelectItem value="WPA3">WPA3</SelectItem>
                  <SelectItem value="WPA2-WPA3">WPA2/WPA3 Mixed</SelectItem>
                  <SelectItem value="WEP">WEP</SelectItem>
                  <SelectItem value="nopass">Offen</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {wifiRequiresPassword(data.security) && (
            <Field label="Passwort">
              <Input
                id={`${idPrefix}-wifi-password`}
                type="password"
                value={data.password || ""}
                onChange={(event) => update("password", event.target.value)}
                placeholder="Netzwerkpasswort"
              />
            </Field>
          )}
          <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={data.hidden === "true"}
              onChange={(event) =>
                update("hidden", event.target.checked ? "true" : "false")
              }
            />
            Verstecktes Netzwerk
          </label>
        </div>
      );

    case "event":
      return (
        <div className="space-y-3">
          <Field label="Veranstaltungstitel">
            <Input
              id={`${idPrefix}-event-title`}
              value={data.title || ""}
              onChange={(event) => update("title", event.target.value)}
              placeholder="Konferenz 2026"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Startdatum">
              <Input
                id={`${idPrefix}-event-start-date`}
                type="date"
                value={data.startDate || ""}
                onChange={(event) => update("startDate", event.target.value)}
              />
            </Field>
            <Field label="Startuhrzeit">
              <Input
                id={`${idPrefix}-event-start-time`}
                type="time"
                value={data.startTime || ""}
                onChange={(event) => update("startTime", event.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Enddatum">
              <Input
                id={`${idPrefix}-event-end-date`}
                type="date"
                value={data.endDate || ""}
                onChange={(event) => update("endDate", event.target.value)}
              />
            </Field>
            <Field label="Enduhrzeit">
              <Input
                id={`${idPrefix}-event-end-time`}
                type="time"
                value={data.endTime || ""}
                onChange={(event) => update("endTime", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Ort">
            <Input
              id={`${idPrefix}-event-location`}
              value={data.location || ""}
              onChange={(event) => update("location", event.target.value)}
              placeholder="Berlin"
            />
          </Field>
          <Field label="Beschreibung">
            <textarea
              id={`${idPrefix}-event-description`}
              value={data.description || ""}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Weitere Details"
              className={textareaClassName}
            />
          </Field>
        </div>
      );
  }
}

const textareaClassName =
  "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

function summaryForItem(item: DashboardItem) {
  const data = item.qrData ?? {};

  switch (item.qrType) {
    case "vcard":
      return [data.name, data.org, data.email, data.phone, data.url]
        .filter(Boolean)
        .join(" · ");
    case "wifi":
      return [
        data.ssid ? `WLAN ${data.ssid}` : "WLAN",
        data.security || "WPA",
        data.hidden === "true" ? "versteckt" : null,
      ]
        .filter(Boolean)
        .join(" · ");
    case "sms":
      return [data.phone, data.message].filter(Boolean).join(" · ");
    case "email":
      return [data.email, data.subject].filter(Boolean).join(" · ");
    case "tel":
      return data.phone || "Telefonnummer";
    case "event":
      return [data.title, data.startDate, data.location].filter(Boolean).join(" · ");
    default:
      return item.targetUrl;
  }
}

function defaultDataForType(type: QrType): Record<string, string> {
  return type === "wifi" ? { security: "WPA" } : {};
}

function normalizeQrDataForType(type: QrType, data: Record<string, string>) {
  const normalized = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value.trim()]),
  );

  if (type === "wifi" && !normalized.security) {
    normalized.security = "WPA";
  }

  if (type === "vcard" && normalized.url) {
    normalized.url = normalizeUrlInput(normalized.url);
  }

  return normalized;
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
