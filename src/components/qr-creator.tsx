"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Image as ImageIcon,
  Link2,
  Printer,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authorizedFetch } from "@/lib/client-auth";
import {
  normalizeUrlInput,
  parseCode,
  parseHttpUrl,
} from "@/lib/validation";
import { QrPreview, downloadQr, type QrOptions } from "@/components/qr-preview";

type DotType =
  | "rounded"
  | "dots"
  | "classy"
  | "classy-rounded"
  | "square"
  | "extra-rounded";
type CornerSquareType = "dot" | "square" | "extra-rounded";
type CodeStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const PRESETS: Record<string, { from: string; to: string; bg: string }> = {
  Wald: { from: "#047857", to: "#0891b2", bg: "#ffffff" },
  Koralle: { from: "#e11d48", to: "#f59e0b", bg: "#ffffff" },
  Tinte: { from: "#111827", to: "#2563eb", bg: "#ffffff" },
  Moos: { from: "#365314", to: "#65a30d", bg: "#f8fafc" },
  Mono: { from: "#020617", to: "#020617", bg: "#ffffff" },
};

const EXPORT_SIZES = ["512", "1024", "2048", "4096"] as const;

export function QrCreator() {
  const [tab, setTab] = useState<"static" | "dynamic">("static");
  const [preset, setPreset] = useState<keyof typeof PRESETS>("Wald");
  const [dotType, setDotType] = useState<DotType>("rounded");
  const [cornerType, setCornerType] =
    useState<CornerSquareType>("extra-rounded");
  const [logo, setLogo] = useState<string | null>(null);
  const [transparent, setTransparent] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [exportSize, setExportSize] =
    useState<(typeof EXPORT_SIZES)[number]>("1024");
  const [staticData, setStaticData] = useState("https://example.com");
  const [dynUrl, setDynUrl] = useState("https://example.com");
  const [dynTitle, setDynTitle] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [asyncCodeStatus, setAsyncCodeStatus] = useState<CodeStatus>("idle");
  const [expiresEnabled, setExpiresEnabled] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [dynLoading, setDynLoading] = useState(false);
  const [dynResult, setDynResult] = useState<{
    shortUrl: string;
    code: string;
  } | null>(null);

  const normalizedDynamicUrl = parseHttpUrl(dynUrl);
  const customCodeValue = customCode ? parseCode(customCode) : null;
  const customCodeError =
    customCode && !customCodeValue
      ? "Nutze 4-50 Zeichen: Kleinbuchstaben, Zahlen und Bindestriche."
      : null;
  const expiresError = null;
  const codeStatus: CodeStatus = !customCode
    ? "idle"
    : !customCodeValue
      ? "invalid"
      : asyncCodeStatus;
  const qrData =
    tab === "static"
      ? staticData.trim() || "https://example.com"
      : dynResult?.shortUrl ?? normalizedDynamicUrl ?? "https://example.com";
  const canDownload = tab === "static" ? Boolean(staticData.trim()) : !!dynResult;

  useEffect(() => {
    if (!customCodeValue) return;

    const timeout = window.setTimeout(async () => {
      setAsyncCodeStatus("checking");
      try {
        const res = await authorizedFetch(`/api/qr?code=${customCodeValue}`);
        if (!res.ok) {
          setAsyncCodeStatus("idle");
          return;
        }
        const body = (await res.json()) as { available: boolean; valid: boolean };
        setAsyncCodeStatus(body.valid && body.available ? "available" : "taken");
      } catch {
        setAsyncCodeStatus("idle");
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [customCode, customCodeValue]);

  const options: QrOptions = useMemo(() => {
    const p = PRESETS[preset];
    const from = printMode ? "#000000" : p.from;
    const to = printMode ? "#000000" : p.to;
    const background = printMode ? "#ffffff" : transparent ? "transparent" : p.bg;

    return {
      type: "svg",
      data: qrData,
      margin: printMode ? 12 : 8,
      qrOptions: { errorCorrectionLevel: logo ? "H" : "M" },
      backgroundOptions: { color: background },
      dotsOptions: {
        type: printMode ? "square" : dotType,
        gradient: {
          type: "linear",
          rotation: Math.PI / 4,
          colorStops: [
            { offset: 0, color: from },
            { offset: 1, color: to },
          ],
        },
      },
      cornersSquareOptions: {
        type: printMode ? "square" : cornerType,
        color: from,
      },
      cornersDotOptions: { type: "dot", color: to },
      image: logo ?? undefined,
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 4,
        imageSize: logo ? 0.3 : 0,
      },
    };
  }, [cornerType, dotType, logo, preset, printMode, qrData, transparent]);

  const designWarnings = useMemo(() => {
    if (printMode) return [];

    const p = PRESETS[preset];
    const warnings: string[] = [];
    if (transparent) {
      warnings.push("Transparente Codes vorher auf dem echten Hintergrund testen.");
    }
    if (logo) {
      warnings.push("Mit Logo unbedingt einen Testscan machen.");
    }
    const ratio = Math.min(
      contrastRatio(p.from, p.bg),
      contrastRatio(p.to, p.bg),
    );
    if (ratio < 3) {
      warnings.push("Der Farbkontrast ist niedrig. Für Druck besser Druckmodus nutzen.");
    }
    return warnings;
  }, [logo, preset, printMode, transparent]);

  function onLogoUpload(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Logo ist zu groß. Maximal 1 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  function normalizeDynamicUrl() {
    if (!dynUrl.trim()) return;
    setDynUrl(normalizeUrlInput(dynUrl));
  }

  function normalizeStaticContent() {
    const value = staticData.trim();
    if (/^[^\s@]+\.[^\s@]+/.test(value)) {
      setStaticData(normalizeUrlInput(value));
    }
  }

  async function createDynamic() {
    const parsedTarget = parseHttpUrl(dynUrl);
    if (!parsedTarget) {
      toast.error("Bitte gib eine gültige http(s)-URL ein.");
      return;
    }
    if (customCode && !customCodeValue) {
      toast.error("Der gewünschte Slug ist ungültig.");
      return;
    }
    if (codeStatus === "taken") {
      toast.error("Dieser Slug ist bereits vergeben.");
      return;
    }
    if (
      expiresEnabled &&
      expiresAt &&
      new Date(expiresAt).getTime() <= Date.now()
    ) {
      toast.error("Das Ablaufdatum muss in der Zukunft liegen.");
      return;
    }

    setDynLoading(true);
    try {
      const res = await authorizedFetch("/api/qr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetUrl: parsedTarget,
          title: dynTitle || null,
          code: customCodeValue,
          expiresAt: expiresEnabled && expiresAt ? expiresAt : null,
        }),
      });

      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          res.status === 401
            ? "Admin-Passwort erforderlich."
            : msg.error ?? "Fehler beim Erstellen.",
        );
      }

      const json = (await res.json()) as { code: string; shortUrl: string };
      setDynResult(json);
      toast.success("Dynamischer QR-Code erstellt.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setDynLoading(false);
    }
  }

  async function copyShortUrl() {
    if (!dynResult) return;
    await navigator.clipboard.writeText(dynResult.shortUrl);
    toast.success("Kurz-URL kopiert.");
  }

  function download(format: "png" | "svg") {
    if (!canDownload) {
      toast.error("Speichere den dynamischen Code zuerst.");
      return;
    }
    const size = Number.parseInt(exportSize, 10);
    const name = filenameForQr({
      title: tab === "dynamic" ? dynTitle : "qr-code",
      code: tab === "dynamic" ? dynResult?.code : undefined,
    });
    void downloadQr(options, format, size, name);
  }

  return (
    <div className="pb-20 lg:pb-0">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
        <Card className="order-2 border-border bg-card p-4 shadow-sm lg:order-1 sm:p-5">
          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="static">Statisch</TabsTrigger>
              <TabsTrigger value="dynamic">Dynamisch</TabsTrigger>
            </TabsList>

            <TabsContent value="static" className="mt-5 space-y-4">
              <Field label="URL oder Text" htmlFor="data">
                <Input
                  id="data"
                  value={staticData}
                  onBlur={normalizeStaticContent}
                  onChange={(event) => setStaticData(event.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </TabsContent>

            <TabsContent value="dynamic" className="mt-5 space-y-4">
              <Field
                label="Ziel-URL"
                htmlFor="dyn-url"
                error={
                  dynUrl.trim() && !normalizedDynamicUrl
                    ? "Bitte gib eine gültige http(s)-URL ein."
                    : null
                }
              >
                <Input
                  id="dyn-url"
                  value={dynUrl}
                  onBlur={normalizeDynamicUrl}
                  onChange={(event) => {
                    setDynUrl(event.target.value);
                    setDynResult(null);
                  }}
                  placeholder="https://..."
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Bezeichnung" htmlFor="dyn-title">
                  <Input
                    id="dyn-title"
                    value={dynTitle}
                    maxLength={120}
                    onChange={(event) => setDynTitle(event.target.value)}
                    placeholder="Speisekarte, Flyer, Kampagne"
                  />
                </Field>
                <Field
                  label="Eigener Slug"
                  htmlFor="dyn-code"
                  error={customCodeError}
                  hint={codeStatusText(codeStatus)}
                >
                  <div className="flex rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                    <span className="grid h-8 place-items-center border-r border-border px-2 text-sm text-muted-foreground">
                      /r/
                    </span>
                    <Input
                      id="dyn-code"
                      value={customCode}
                      onChange={(event) => {
                        setCustomCode(event.target.value.toLowerCase());
                        setDynResult(null);
                      }}
                      className="border-0 focus-visible:ring-0"
                      placeholder="menu-berlin"
                    />
                  </div>
                </Field>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="expires-enabled" className="text-sm">
                    Ablaufdatum setzen
                  </Label>
                  <Switch
                    id="expires-enabled"
                    checked={expiresEnabled}
                    onCheckedChange={setExpiresEnabled}
                  />
                </div>
                {expiresEnabled && (
                  <Field
                    label="Gültig bis"
                    htmlFor="expires-at"
                    error={expiresError}
                    className="mt-3"
                  >
                    <Input
                      id="expires-at"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(event) => setExpiresAt(event.target.value)}
                    />
                  </Field>
                )}
              </div>

              <Button
                className="h-10 w-full"
                onClick={createDynamic}
                disabled={dynLoading || !dynUrl.trim()}
              >
                {dynResult ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                {dynLoading
                  ? "Erstelle..."
                  : dynResult
                    ? "Kurz-URL erstellt"
                    : "Dynamischen Code speichern"}
              </Button>
              {dynResult && (
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Link2 className="size-4" />
                    Kurz-URL
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-md bg-background px-2 py-1 text-xs">
                      {dynResult.shortUrl}
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label="Kurz-URL kopieren"
                      onClick={copyShortUrl}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Separator className="my-5" />

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Farbschema</Label>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(
                  (name) => {
                    const colors = PRESETS[name];
                    const active = preset === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        aria-label={`Farbschema ${name}`}
                        aria-pressed={active}
                        title={name}
                        onClick={() => setPreset(name)}
                        className={`h-10 rounded-lg border transition ${
                          active
                            ? "border-foreground ring-2 ring-ring/30"
                            : "border-border hover:border-foreground/40"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                        }}
                      />
                    );
                  },
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Punkte">
                <Select
                  value={dotType}
                  onValueChange={(value) => setDotType(value as DotType)}
                  disabled={printMode}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rounded">Abgerundet</SelectItem>
                    <SelectItem value="dots">Punkte</SelectItem>
                    <SelectItem value="classy">Classy</SelectItem>
                    <SelectItem value="classy-rounded">Classy rund</SelectItem>
                    <SelectItem value="square">Quadrate</SelectItem>
                    <SelectItem value="extra-rounded">Extra rund</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ecken">
                <Select
                  value={cornerType}
                  onValueChange={(value) =>
                    setCornerType(value as CornerSquareType)
                  }
                  disabled={printMode}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="extra-rounded">Extra rund</SelectItem>
                    <SelectItem value="square">Quadratisch</SelectItem>
                    <SelectItem value="dot">Punkt</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleRow
                id="transparent"
                label="Transparenter Hintergrund"
                checked={transparent}
                disabled={printMode}
                onCheckedChange={setTransparent}
              />
              <ToggleRow
                id="print-mode"
                label="Druckmodus"
                checked={printMode}
                onCheckedChange={setPrintMode}
                icon={<Printer className="size-4" />}
              />
            </div>

            <Field label="Logo" htmlFor="logo">
              <div className="flex items-center gap-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg"
                  onChange={(event) => onLogoUpload(event.target.files?.[0])}
                />
                {logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Logo entfernen"
                    onClick={() => setLogo(null)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </Field>

            {designWarnings.length > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-950">
                {designWarnings.map((warning) => (
                  <div key={warning} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="order-1 border-border bg-card p-4 shadow-sm lg:sticky lg:top-20 lg:order-2">
          <div className="grid place-items-center rounded-lg bg-white p-4 shadow-inner">
            <QrPreview options={options} size={240} />
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <Select
              value={exportSize}
              onValueChange={(value) =>
                setExportSize(value as (typeof EXPORT_SIZES)[number])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-8"
                onClick={() => download("png")}
                disabled={!canDownload}
              >
                <Download className="size-4" />
                PNG
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-8"
                onClick={() => download("svg")}
                disabled={!canDownload}
              >
                <Download className="size-4" />
                SVG
              </Button>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ImageIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              Bei dynamischen Codes wird erst nach dem Speichern die Kurz-URL in
              den QR-Code geschrieben.
            </span>
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 shadow-lg backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-10"
            onClick={() => download("png")}
            disabled={!canDownload}
          >
            <Download className="size-4" />
            PNG
          </Button>
          <Button
            type="button"
            className="h-10"
            onClick={() => download("svg")}
            disabled={!canDownload}
          >
            <Download className="size-4" />
            SVG
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string | null;
  hint?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  disabled,
  icon,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm">
        {icon}
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function codeStatusText(status: CodeStatus) {
  switch (status) {
    case "checking":
      return "Prüfe Verfügbarkeit...";
    case "available":
      return "Slug ist frei.";
    case "taken":
      return "Slug ist bereits vergeben.";
    case "invalid":
      return null;
    default:
      return "Leer lassen für einen automatisch generierten Kurzcode.";
  }
}

function filenameForQr({
  title,
  code,
}: {
  title?: string;
  code?: string;
}) {
  const base = slugify([title, code].filter(Boolean).join("-")) || "qr-code";
  return base;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function contrastRatio(foreground: string, background: string) {
  const fg = relativeLuminance(hexToRgb(foreground));
  const bg = relativeLuminance(hexToRgb(background));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const channels = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
