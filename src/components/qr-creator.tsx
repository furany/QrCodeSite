"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code,
  Copy,
  Download,
  Image as ImageIcon,
  Link2,
  Printer,
  Save,
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
import { QrPreview, downloadQr, getSvgString, type QrOptions } from "@/components/qr-preview";
import {
  generateQrData,
  validateQrData,
  QR_TYPES,
  type QrType,
} from "@/lib/qr-types";

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
  const [tab, setTab] = useState<"static" | "dynamic" | "batch">("static");
  const [qrType, setQrType] = useState<QrType>("url");
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
  const [qrTypeData, setQrTypeData] = useState<Record<string, string>>({});
  const [dynUrl, setDynUrl] = useState("https://example.com");
  const [dynQrType, setDynQrType] = useState<QrType>("url");
  const [dynQrData, setDynQrData] = useState<Record<string, string>>({});
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
  const [templates, setTemplates] = useState<
    Array<{
      id: string;
      name: string;
      description?: string;
      preset: string;
      dotType: string;
      cornerType: string;
      transparent: boolean;
      printMode: boolean;
    }>
  >([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [batchItems, setBatchItems] = useState<
    Array<{ id: string; name: string; url: string }>
  >([]);
  const [batchCsvText, setBatchCsvText] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);

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
  const qrData = useMemo(() => {
    if (tab === "dynamic") {
      if (dynQrType === "url") {
        return dynResult?.shortUrl ?? normalizedDynamicUrl ?? "https://example.com";
      }
      return dynResult?.shortUrl ?? generateQrData(dynQrType, dynQrData) ?? "https://example.com";
    }
    if (qrType === "url") {
      return staticData.trim() || "https://example.com";
    }
    return generateQrData(qrType, qrTypeData) || "https://example.com";
  }, [tab, qrType, staticData, qrTypeData, dynResult?.shortUrl, normalizedDynamicUrl, dynQrType, dynQrData]);

  const typeValidationError = useMemo(() => {
    if (tab !== "static" || qrType === "url") return null;
    return validateQrData(qrType, qrTypeData);
  }, [tab, qrType, qrTypeData]);

  const canDownload = useMemo(() => {
    if (tab === "static") {
      if (qrType === "url") return Boolean(staticData.trim());
      return !typeValidationError;
    }
    if (tab === "batch") {
      return false;
    }
    return !!dynResult;
  }, [tab, qrType, staticData, typeValidationError, dynResult]);

  useEffect(() => {
    loadTemplates();
  }, []);

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

  async function loadTemplates() {
    try {
      const res = await authorizedFetch("/api/templates");
      if (res.ok) {
        const data = (await res.json()) as typeof templates;
        setTemplates(data);
      }
    } catch {
      // Silently fail if user is not authenticated
    }
  }

  async function saveTemplate() {
    if (!templateName.trim()) {
      toast.error("Vorlagen-Name erforderlich.");
      return;
    }

    try {
      const res = await authorizedFetch("/api/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: templateDesc,
          preset,
          dotType,
          cornerType,
          transparent,
          printMode,
        }),
      });

      if (!res.ok) {
        throw new Error("Fehler beim Speichern der Vorlage.");
      }

      const template = (await res.json()) as (typeof templates)[0];
      setTemplates([...templates, template]);
      setShowSaveTemplate(false);
      setTemplateName("");
      setTemplateDesc("");
      toast.success("Vorlage gespeichert.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler beim Speichern.");
    }
  }

  function loadTemplate(template: (typeof templates)[0]) {
    setPreset(template.preset as keyof typeof PRESETS);
    setDotType(template.dotType as DotType);
    setCornerType(template.cornerType as CornerSquareType);
    setTransparent(template.transparent);
    setPrintMode(template.printMode);
    toast.success(`Vorlage "${template.name}" geladen.`);
  }

  async function deleteTemplate(templateId: string) {
    try {
      const res = await authorizedFetch(`/api/templates?id=${templateId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Fehler beim Löschen der Vorlage.");
      }

      setTemplates(templates.filter((t) => t.id !== templateId));
      toast.success("Vorlage gelöscht.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler beim Löschen.");
    }
  }

  function parseBatchCsv(csv: string) {
    const lines = csv.trim().split("\n").filter((line) => line.trim());
    const items: Array<{ id: string; name: string; url: string }> = [];

    lines.forEach((line, idx) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        const name = parts[0] || `Code ${idx + 1}`;
        const url = parts[1];
        if (url) {
          items.push({
            id: crypto.randomUUID(),
            name,
            url,
          });
        }
      }
    });

    return items;
  }

  function handleBatchCsvChange(csv: string) {
    setBatchCsvText(csv);
    const items = parseBatchCsv(csv);
    setBatchItems(items);
  }

  async function createBatchQrCodes() {
    if (batchItems.length === 0) {
      toast.error("Bitte füge mindestens einen QR-Code hinzu.");
      return;
    }

    const MAX_BATCH_SIZE = 100;
    if (batchItems.length > MAX_BATCH_SIZE) {
      toast.error(`Maximal ${MAX_BATCH_SIZE} QR-Codes pro Batch. Du hast ${batchItems.length} eingegeben.`);
      return;
    }

    const invalidItems = batchItems.filter(
      (item) => !parseHttpUrl(item.url)
    );
    if (invalidItems.length > 0) {
      toast.error(
        `${invalidItems.length} URL(s) sind ungültig. Überprüfe das CSV-Format.`
      );
      return;
    }

    setBatchLoading(true);
    const created: Array<{ name: string; code: string; shortUrl: string }> = [];

    try {
      for (const item of batchItems) {
        const res = await authorizedFetch("/api/qr", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            targetUrl: parseHttpUrl(item.url),
            title: item.name,
            code: null,
            expiresAt: null,
          }),
        });

        if (res.ok) {
          const json = (await res.json()) as {
            code: string;
            shortUrl: string;
          };
          created.push({
            name: item.name,
            code: json.code,
            shortUrl: json.shortUrl,
          });
        }
      }

      if (created.length > 0) {
        toast.success(`${created.length} QR-Codes erstellt.`);
        downloadBatchCsv(created);
        setBatchCsvText("");
        setBatchItems([]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Fehler beim Erstellen."
      );
    } finally {
      setBatchLoading(false);
    }
  }

  function downloadBatchCsv(
    created: Array<{ name: string; code: string; shortUrl: string }>
  ) {
    const headers = ["Name", "Code", "Short URL", "Full URL"].join(",");
    const rows = created.map((item) =>
      [
        `"${item.name.replace(/"/g, '""')}"`,
        item.code,
        item.shortUrl,
        `${typeof window !== "undefined" ? window.location.origin : ""}${item.shortUrl}`,
      ].join(",")
    );
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `batch-qr-codes-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

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

    let targetUrl = "";
    let qrData = null;
    let isDynamic = true;

    if (dynQrType === "url") {
      const parsedTarget = parseHttpUrl(dynUrl);
      if (!parsedTarget) {
        toast.error("Bitte gib eine gültige http(s)-URL ein.");
        return;
      }
      targetUrl = parsedTarget;
      isDynamic = false;
    } else {
      const validationError = validateQrData(dynQrType, dynQrData);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      targetUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/r/`;
      qrData = dynQrData;
    }

    setDynLoading(true);
    try {
      const res = await authorizedFetch("/api/qr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          qrType: dynQrType,
          qrData,
          title: dynTitle || null,
          code: customCodeValue,
          expiresAt: expiresEnabled && expiresAt ? expiresAt : null,
          isDynamic,
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

  async function copySvgEmbed() {
    if (!canDownload) {
      toast.error("Speichere den dynamischen Code zuerst.");
      return;
    }
    try {
      const svg = await getSvgString(options, 256);
      if (!svg) {
        toast.error("SVG konnte nicht generiert werden.");
        return;
      }
      await navigator.clipboard.writeText(svg);
      toast.success("SVG-Code kopiert.");
    } catch (error) {
      toast.error("Fehler beim Kopieren des SVG-Codes.");
    }
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="static">Statisch</TabsTrigger>
              <TabsTrigger value="dynamic">Dynamisch</TabsTrigger>
              <TabsTrigger value="batch">Batch</TabsTrigger>
            </TabsList>

            <TabsContent value="static" className="mt-5 space-y-4">
              <Field label="QR-Code Typ">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {(Object.keys(QR_TYPES) as QrType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setQrType(type);
                        setQrTypeData({});
                      }}
                      className={`rounded-lg border-2 p-3 text-center text-sm transition ${
                        qrType === type
                          ? "border-ring bg-primary/10 text-primary font-semibold"
                          : "border-border hover:border-foreground/30"
                      }`}
                      title={QR_TYPES[type].description}
                    >
                      <div className="text-lg mb-1">{QR_TYPES[type].icon}</div>
                      <div className="text-xs">{QR_TYPES[type].label}</div>
                    </button>
                  ))}
                </div>
              </Field>

              {qrType === "url" && (
                <Field label="URL oder Text" htmlFor="data">
                  <Input
                    id="data"
                    value={staticData}
                    onBlur={normalizeStaticContent}
                    onChange={(event) => setStaticData(event.target.value)}
                    placeholder="https://..."
                  />
                </Field>
              )}

              {qrType === "tel" && (
                <Field label="Telefonnummer" htmlFor="tel-field">
                  <Input
                    id="tel-field"
                    type="tel"
                    value={qrTypeData.phone || ""}
                    onChange={(e) =>
                      setQrTypeData({ ...qrTypeData, phone: e.target.value })
                    }
                    placeholder="+49123456789"
                  />
                </Field>
              )}

              {qrType === "sms" && (
                <>
                  <Field label="Telefonnummer" htmlFor="sms-phone">
                    <Input
                      id="sms-phone"
                      type="tel"
                      value={qrTypeData.phone || ""}
                      onChange={(e) =>
                        setQrTypeData({ ...qrTypeData, phone: e.target.value })
                      }
                      placeholder="+49123456789"
                    />
                  </Field>
                  <Field label="Nachricht" htmlFor="sms-message">
                    <Input
                      id="sms-message"
                      value={qrTypeData.message || ""}
                      onChange={(e) =>
                        setQrTypeData({ ...qrTypeData, message: e.target.value })
                      }
                      placeholder="Optionale Nachricht"
                    />
                  </Field>
                </>
              )}

              {qrType === "email" && (
                <>
                  <Field label="E-Mail-Adresse" htmlFor="email-field">
                    <Input
                      id="email-field"
                      type="email"
                      value={qrTypeData.email || ""}
                      onChange={(e) =>
                        setQrTypeData({ ...qrTypeData, email: e.target.value })
                      }
                      placeholder="contact@example.com"
                    />
                  </Field>
                  <Field label="Betreff" htmlFor="email-subject">
                    <Input
                      id="email-subject"
                      value={qrTypeData.subject || ""}
                      onChange={(e) =>
                        setQrTypeData({ ...qrTypeData, subject: e.target.value })
                      }
                      placeholder="Optionaler Betreff"
                    />
                  </Field>
                  <Field label="Nachricht" htmlFor="email-body">
                    <Input
                      id="email-body"
                      value={qrTypeData.body || ""}
                      onChange={(e) =>
                        setQrTypeData({ ...qrTypeData, body: e.target.value })
                      }
                      placeholder="Optionale Nachricht"
                    />
                  </Field>
                </>
              )}

              {qrType === "vcard" && (
                <>
                  <Field label="Name" htmlFor="vcard-name">
                    <Input
                      id="vcard-name"
                      value={qrTypeData.name || ""}
                      onChange={(e) =>
                        setQrTypeData({ ...qrTypeData, name: e.target.value })
                      }
                      placeholder="Max Mustermann"
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="E-Mail" htmlFor="vcard-email">
                      <Input
                        id="vcard-email"
                        type="email"
                        value={qrTypeData.email || ""}
                        onChange={(e) =>
                          setQrTypeData({
                            ...qrTypeData,
                            email: e.target.value,
                          })
                        }
                        placeholder="max@example.com"
                      />
                    </Field>
                    <Field label="Telefon" htmlFor="vcard-phone">
                      <Input
                        id="vcard-phone"
                        type="tel"
                        value={qrTypeData.phone || ""}
                        onChange={(e) =>
                          setQrTypeData({
                            ...qrTypeData,
                            phone: e.target.value,
                          })
                        }
                        placeholder="+49123456789"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Organisation" htmlFor="vcard-org">
                      <Input
                        id="vcard-org"
                        value={qrTypeData.org || ""}
                        onChange={(e) =>
                          setQrTypeData({ ...qrTypeData, org: e.target.value })
                        }
                        placeholder="Firmenname"
                      />
                    </Field>
                    <Field label="Website" htmlFor="vcard-url">
                      <Input
                        id="vcard-url"
                        type="url"
                        value={qrTypeData.url || ""}
                        onChange={(e) =>
                          setQrTypeData({ ...qrTypeData, url: e.target.value })
                        }
                        placeholder="https://example.com"
                      />
                    </Field>
                  </div>
                </>
              )}

              {qrType === "wifi" && (
                <>
                  <Field label="SSID (Netzwerkname)" htmlFor="wifi-ssid">
                    <Input
                      id="wifi-ssid"
                      value={qrTypeData.ssid || ""}
                      onChange={(e) =>
                        setQrTypeData({ ...qrTypeData, ssid: e.target.value })
                      }
                      placeholder="MyNetwork"
                    />
                  </Field>
                  <Field label="Sicherheit" htmlFor="wifi-security">
                    <Select
                      value={(qrTypeData.security as string) || "WPA"}
                      onValueChange={(value) => {
                        if (value) {
                          setQrTypeData({ ...qrTypeData, security: value });
                        }
                      }}
                    >
                      <SelectTrigger id="wifi-security">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WPA">WPA/WPA2</SelectItem>
                        <SelectItem value="WEP">WEP</SelectItem>
                        <SelectItem value="open">Offen (kein Passwort)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  {qrTypeData.security !== "open" && (
                    <Field label="Passwort" htmlFor="wifi-password">
                      <Input
                        id="wifi-password"
                        type="password"
                        value={qrTypeData.password || ""}
                        onChange={(e) =>
                          setQrTypeData({
                            ...qrTypeData,
                            password: e.target.value,
                          })
                        }
                        placeholder="Netzwerkpasswort"
                      />
                    </Field>
                  )}
                  <ToggleRow
                    id="wifi-hidden"
                    label="Verstecktes Netzwerk"
                    checked={qrTypeData.hidden === "true"}
                    onCheckedChange={(checked) =>
                      setQrTypeData({
                        ...qrTypeData,
                        hidden: checked ? "true" : "false",
                      })
                    }
                  />
                </>
              )}

              {qrType === "event" && (
                <>
                  <Field label="Veranstaltungstitel" htmlFor="event-title">
                    <Input
                      id="event-title"
                      value={qrTypeData.title || ""}
                      onChange={(e) =>
                        setQrTypeData({ ...qrTypeData, title: e.target.value })
                      }
                      placeholder="Konferenz 2026"
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Startdatum" htmlFor="event-start-date">
                      <Input
                        id="event-start-date"
                        type="date"
                        value={qrTypeData.startDate || ""}
                        onChange={(e) =>
                          setQrTypeData({
                            ...qrTypeData,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Startuhrzeit" htmlFor="event-start-time">
                      <Input
                        id="event-start-time"
                        type="time"
                        value={qrTypeData.startTime || ""}
                        onChange={(e) =>
                          setQrTypeData({
                            ...qrTypeData,
                            startTime: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Enddatum" htmlFor="event-end-date">
                      <Input
                        id="event-end-date"
                        type="date"
                        value={qrTypeData.endDate || ""}
                        onChange={(e) =>
                          setQrTypeData({
                            ...qrTypeData,
                            endDate: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Enduhrzeit" htmlFor="event-end-time">
                      <Input
                        id="event-end-time"
                        type="time"
                        value={qrTypeData.endTime || ""}
                        onChange={(e) =>
                          setQrTypeData({
                            ...qrTypeData,
                            endTime: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Ort" htmlFor="event-location">
                    <Input
                      id="event-location"
                      value={qrTypeData.location || ""}
                      onChange={(e) =>
                        setQrTypeData({
                          ...qrTypeData,
                          location: e.target.value,
                        })
                      }
                      placeholder="Berlin Convention Center"
                    />
                  </Field>
                  <Field label="Beschreibung" htmlFor="event-description">
                    <Input
                      id="event-description"
                      value={qrTypeData.description || ""}
                      onChange={(e) =>
                        setQrTypeData({
                          ...qrTypeData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Weitere Details zur Veranstaltung"
                    />
                  </Field>
                </>
              )}

              {typeValidationError && (
                <div className="flex gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <p>{typeValidationError}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="dynamic" className="mt-5 space-y-4">
              <Field label="QR-Code Typ">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {(Object.keys(QR_TYPES) as QrType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setDynQrType(type);
                        setDynQrData({});
                        setDynResult(null);
                      }}
                      className={`rounded-lg border-2 p-3 text-center text-sm transition ${
                        dynQrType === type
                          ? "border-ring bg-primary/10 text-primary font-semibold"
                          : "border-border hover:border-foreground/30"
                      }`}
                      title={QR_TYPES[type].description}
                    >
                      <div className="text-lg mb-1">{QR_TYPES[type].icon}</div>
                      <div className="text-xs">{QR_TYPES[type].label}</div>
                    </button>
                  ))}
                </div>
              </Field>

              {dynQrType === "url" && (
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
              )}

              {dynQrType === "tel" && (
                <Field label="Telefonnummer" htmlFor="dyn-tel">
                  <Input
                    id="dyn-tel"
                    type="tel"
                    value={dynQrData.phone || ""}
                    onChange={(e) => {
                      setDynQrData({ ...dynQrData, phone: e.target.value });
                      setDynResult(null);
                    }}
                    placeholder="+49123456789"
                  />
                </Field>
              )}

              {dynQrType === "sms" && (
                <>
                  <Field label="Telefonnummer" htmlFor="dyn-sms-phone">
                    <Input
                      id="dyn-sms-phone"
                      type="tel"
                      value={dynQrData.phone || ""}
                      onChange={(e) => {
                        setDynQrData({ ...dynQrData, phone: e.target.value });
                        setDynResult(null);
                      }}
                      placeholder="+49123456789"
                    />
                  </Field>
                  <Field label="Nachricht (optional)" htmlFor="dyn-sms-msg">
                    <Input
                      id="dyn-sms-msg"
                      value={dynQrData.message || ""}
                      onChange={(e) => {
                        setDynQrData({ ...dynQrData, message: e.target.value });
                        setDynResult(null);
                      }}
                      placeholder="Nachricht"
                    />
                  </Field>
                </>
              )}

              {dynQrType === "email" && (
                <>
                  <Field label="E-Mail-Adresse" htmlFor="dyn-email">
                    <Input
                      id="dyn-email"
                      type="email"
                      value={dynQrData.email || ""}
                      onChange={(e) => {
                        setDynQrData({ ...dynQrData, email: e.target.value });
                        setDynResult(null);
                      }}
                      placeholder="contact@example.com"
                    />
                  </Field>
                  <Field label="Betreff (optional)" htmlFor="dyn-email-subject">
                    <Input
                      id="dyn-email-subject"
                      value={dynQrData.subject || ""}
                      onChange={(e) => {
                        setDynQrData({ ...dynQrData, subject: e.target.value });
                        setDynResult(null);
                      }}
                      placeholder="Betreff"
                    />
                  </Field>
                  <Field label="Nachricht (optional)" htmlFor="dyn-email-body">
                    <Input
                      id="dyn-email-body"
                      value={dynQrData.body || ""}
                      onChange={(e) => {
                        setDynQrData({ ...dynQrData, body: e.target.value });
                        setDynResult(null);
                      }}
                      placeholder="Nachricht"
                    />
                  </Field>
                </>
              )}

              {dynQrType === "vcard" && (
                <>
                  <Field label="Name" htmlFor="dyn-vcard-name">
                    <Input
                      id="dyn-vcard-name"
                      value={dynQrData.name || ""}
                      onChange={(e) => {
                        setDynQrData({ ...dynQrData, name: e.target.value });
                        setDynResult(null);
                      }}
                      placeholder="Max Mustermann"
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="E-Mail (optional)" htmlFor="dyn-vcard-email">
                      <Input
                        id="dyn-vcard-email"
                        type="email"
                        value={dynQrData.email || ""}
                        onChange={(e) => {
                          setDynQrData({ ...dynQrData, email: e.target.value });
                          setDynResult(null);
                        }}
                        placeholder="max@example.com"
                      />
                    </Field>
                    <Field label="Telefon (optional)" htmlFor="dyn-vcard-phone">
                      <Input
                        id="dyn-vcard-phone"
                        type="tel"
                        value={dynQrData.phone || ""}
                        onChange={(e) => {
                          setDynQrData({ ...dynQrData, phone: e.target.value });
                          setDynResult(null);
                        }}
                        placeholder="+49123456789"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Organisation (optional)" htmlFor="dyn-vcard-org">
                      <Input
                        id="dyn-vcard-org"
                        value={dynQrData.org || ""}
                        onChange={(e) => {
                          setDynQrData({ ...dynQrData, org: e.target.value });
                          setDynResult(null);
                        }}
                        placeholder="Firmenname"
                      />
                    </Field>
                    <Field label="Website (optional)" htmlFor="dyn-vcard-url">
                      <Input
                        id="dyn-vcard-url"
                        type="url"
                        value={dynQrData.url || ""}
                        onChange={(e) => {
                          setDynQrData({ ...dynQrData, url: e.target.value });
                          setDynResult(null);
                        }}
                        placeholder="https://example.com"
                      />
                    </Field>
                  </div>
                </>
              )}

              {dynQrType === "wifi" && (
                <>
                  <Field label="SSID (Netzwerkname)" htmlFor="dyn-wifi-ssid">
                    <Input
                      id="dyn-wifi-ssid"
                      value={dynQrData.ssid || ""}
                      onChange={(e) => {
                        setDynQrData({ ...dynQrData, ssid: e.target.value });
                        setDynResult(null);
                      }}
                      placeholder="MyNetwork"
                    />
                  </Field>
                  <Field label="Sicherheit" htmlFor="dyn-wifi-security">
                    <Select
                      value={(dynQrData.security as string) || "WPA"}
                      onValueChange={(value) => {
                        if (value) {
                          setDynQrData({ ...dynQrData, security: value });
                          setDynResult(null);
                        }
                      }}
                    >
                      <SelectTrigger id="dyn-wifi-security">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WPA">WPA/WPA2</SelectItem>
                        <SelectItem value="WEP">WEP</SelectItem>
                        <SelectItem value="open">Offen (kein Passwort)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  {dynQrData.security !== "open" && (
                    <Field label="Passwort" htmlFor="dyn-wifi-password">
                      <Input
                        id="dyn-wifi-password"
                        type="password"
                        value={dynQrData.password || ""}
                        onChange={(e) => {
                          setDynQrData({ ...dynQrData, password: e.target.value });
                          setDynResult(null);
                        }}
                        placeholder="Netzwerkpasswort"
                      />
                    </Field>
                  )}
                  <ToggleRow
                    id="dyn-wifi-hidden"
                    label="Verstecktes Netzwerk"
                    checked={dynQrData.hidden === "true"}
                    onCheckedChange={(checked) => {
                      setDynQrData({
                        ...dynQrData,
                        hidden: checked ? "true" : "false",
                      });
                      setDynResult(null);
                    }}
                  />
                </>
              )}

              {dynQrType === "event" && (
                <>
                  <Field label="Veranstaltungstitel" htmlFor="dyn-event-title">
                    <Input
                      id="dyn-event-title"
                      value={dynQrData.title || ""}
                      onChange={(e) => {
                        setDynQrData({ ...dynQrData, title: e.target.value });
                        setDynResult(null);
                      }}
                      placeholder="Konferenz 2026"
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Startdatum" htmlFor="dyn-event-start-date">
                      <Input
                        id="dyn-event-start-date"
                        type="date"
                        value={dynQrData.startDate || ""}
                        onChange={(e) => {
                          setDynQrData({ ...dynQrData, startDate: e.target.value });
                          setDynResult(null);
                        }}
                      />
                    </Field>
                    <Field label="Startuhrzeit" htmlFor="dyn-event-start-time">
                      <Input
                        id="dyn-event-start-time"
                        type="time"
                        value={dynQrData.startTime || ""}
                        onChange={(e) => {
                          setDynQrData({ ...dynQrData, startTime: e.target.value });
                          setDynResult(null);
                        }}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Enddatum (optional)" htmlFor="dyn-event-end-date">
                      <Input
                        id="dyn-event-end-date"
                        type="date"
                        value={dynQrData.endDate || ""}
                        onChange={(e) => {
                          setDynQrData({ ...dynQrData, endDate: e.target.value });
                          setDynResult(null);
                        }}
                      />
                    </Field>
                    <Field label="Enduhrzeit (optional)" htmlFor="dyn-event-end-time">
                      <Input
                        id="dyn-event-end-time"
                        type="time"
                        value={dynQrData.endTime || ""}
                        onChange={(e) => {
                          setDynQrData({ ...dynQrData, endTime: e.target.value });
                          setDynResult(null);
                        }}
                      />
                    </Field>
                  </div>
                  <Field label="Ort (optional)" htmlFor="dyn-event-location">
                    <Input
                      id="dyn-event-location"
                      value={dynQrData.location || ""}
                      onChange={(e) => {
                        setDynQrData({ ...dynQrData, location: e.target.value });
                        setDynResult(null);
                      }}
                      placeholder="Berlin Convention Center"
                    />
                  </Field>
                  <Field label="Beschreibung (optional)" htmlFor="dyn-event-desc">
                    <Input
                      id="dyn-event-desc"
                      value={dynQrData.description || ""}
                      onChange={(e) => {
                        setDynQrData({ ...dynQrData, description: e.target.value });
                        setDynResult(null);
                      }}
                      placeholder="Weitere Details"
                    />
                  </Field>
                </>
              )}

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
                disabled={dynLoading || (dynQrType === "url" && !dynUrl.trim())}
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

            <TabsContent value="batch" className="mt-5 space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                <p className="font-medium mb-2">CSV-Format:</p>
                <code className="text-xs bg-background px-2 py-1 rounded block overflow-auto max-h-20">
                  Name, URL{"\n"}Google, https://google.com{"\n"}GitHub, https://github.com
                </code>
                <p className="mt-2 text-xs">
                  Eine Zeile pro QR-Code. Name ist optional (wird sonst auto-generiert).
                </p>
              </div>

              <Field label="CSV-Daten eingeben oder hochladen" htmlFor="batch-csv">
                <textarea
                  id="batch-csv"
                  value={batchCsvText}
                  onChange={(e) => handleBatchCsvChange(e.target.value)}
                  placeholder="Name, URL&#10;Google, https://google.com&#10;GitHub, https://github.com"
                  className="min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>

              {batchItems.length > 0 && (
                <div className="space-y-2">
                  <Label>{batchItems.length} QR-Codes zum Erstellen</Label>
                  <div className="max-h-64 overflow-auto rounded-lg border border-border">
                    {batchItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 border-b border-border last:border-0 p-2 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.url}
                          </p>
                        </div>
                        <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={createBatchQrCodes}
                disabled={batchLoading || batchItems.length === 0}
              >
                {batchLoading ? (
                  <>
                    <Wand2 className="size-4 animate-spin" />
                    Erstelle {batchItems.length} Codes...
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4" />
                    {batchItems.length} Codes erstellen
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          <Separator className="my-5" />

          <div className="space-y-5">
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Gespeicherte Vorlagen</Label>
                <div className="grid gap-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-2 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{template.name}</p>
                        {template.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={() => loadTemplate(template)}
                        >
                          Laden
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => deleteTemplate(template.id)}
                          title="Vorlage löschen"
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setShowSaveTemplate(true)}
            >
              <Save className="size-4" />
              Design als Vorlage speichern
            </Button>

            {showSaveTemplate && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
                <h3 className="text-sm font-semibold">Vorlage speichern</h3>
                <Field label="Vorlagen-Name" htmlFor="template-name">
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="z.B. Corporate Design"
                    autoFocus
                  />
                </Field>
                <Field label="Beschreibung" htmlFor="template-desc">
                  <Input
                    id="template-desc"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Optionale Notiz"
                  />
                </Field>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={saveTemplate}
                  >
                    Speichern
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowSaveTemplate(false);
                      setTemplateName("");
                      setTemplateDesc("");
                    }}
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

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
          <Button
            type="button"
            variant="outline"
            className="w-full mt-4 h-8"
            onClick={copySvgEmbed}
            disabled={!canDownload}
            title="SVG-Code zum Einbetten kopieren"
          >
            <Code className="size-4" />
            SVG Code
          </Button>

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
