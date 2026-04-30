"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Code,
  Contact,
  Copy,
  Download,
  Globe2,
  Image as ImageIcon,
  Link2,
  LogIn,
  Mail,
  MessageSquareText,
  Palette,
  Phone,
  Printer,
  Save,
  UserPlus,
  Wand2,
  Wifi,
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
  parseNullableDate,
} from "@/lib/validation";
import { createRuntimeId } from "@/lib/runtime-id";
import { QrPreview, downloadQr, getSvgString, type QrOptions } from "@/components/qr-preview";
import {
  generateQrData,
  validateQrData,
  wifiRequiresPassword,
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
type DesignColors = { from: string; to: string; bg: string };
type BatchItem = {
  id: string;
  row: number;
  name: string;
  url: string;
  normalizedUrl: string | null;
  code: string;
  parsedCode: string | null;
  expiresAt: string;
  error: string | null;
};
type ValidBatchItem = BatchItem & { normalizedUrl: string; error: null };
type BatchCreatedItem = {
  name: string;
  code: string;
  shortUrl: string;
  targetUrl: string;
};
type StyleTemplate = {
  id: string;
  name: string;
  description?: string;
  preset: string;
  dotType: string;
  cornerType: string;
  transparent: boolean;
  printMode: boolean;
  colorFrom?: string | null;
  colorTo?: string | null;
  backgroundColor?: string | null;
};
type QrCreatorProps = {
  isAuthenticated?: boolean;
};

const PRESETS: Record<string, DesignColors> = {
  Wald: { from: "#047857", to: "#0891b2", bg: "#ffffff" },
  Koralle: { from: "#e11d48", to: "#f59e0b", bg: "#ffffff" },
  Tinte: { from: "#111827", to: "#2563eb", bg: "#ffffff" },
  Moos: { from: "#365314", to: "#65a30d", bg: "#f8fafc" },
  Mono: { from: "#020617", to: "#020617", bg: "#ffffff" },
};

const EXPORT_SIZES = ["512", "1024", "2048", "4096"] as const;
const MAX_BATCH_SIZE = 100;
const QR_TYPE_ICONS: Record<QrType, React.ReactNode> = {
  url: <Globe2 className="size-4" />,
  vcard: <Contact className="size-4" />,
  wifi: <Wifi className="size-4" />,
  sms: <MessageSquareText className="size-4" />,
  email: <Mail className="size-4" />,
  tel: <Phone className="size-4" />,
  event: <CalendarDays className="size-4" />,
};

async function fetchTemplates() {
  try {
    const res = await fetch("/api/templates");
    if (!res.ok) return null;
    return (await res.json()) as StyleTemplate[];
  } catch {
    return null;
  }
}

export function QrCreator({ isAuthenticated = false }: QrCreatorProps) {
  const [tab, setTab] = useState<"static" | "dynamic" | "batch">("static");
  const [qrType, setQrType] = useState<QrType>("url");
  const [preset, setPreset] = useState<string>("Wald");
  const [colors, setColors] = useState<DesignColors>(PRESETS.Wald);
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
  const [templates, setTemplates] = useState<StyleTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchCsvText, setBatchCsvText] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchCreatedItem[]>([]);

  const batchInvalidItems = useMemo(
    () => batchItems.filter((item) => item.error),
    [batchItems],
  );
  const batchValidItems = useMemo(
    () =>
      batchItems.filter(
        (item): item is ValidBatchItem =>
          !item.error && Boolean(item.normalizedUrl),
      ),
    [batchItems],
  );
  const batchLimitExceeded = batchItems.length > MAX_BATCH_SIZE;

  function updateStaticQrTypeData(key: string, value: string) {
    setQrTypeData((current) => ({ ...current, [key]: value }));
  }

  function updateDynamicQrData(key: string, value: string) {
    setDynQrData((current) => ({ ...current, [key]: value }));
    setDynResult(null);
  }

  function showAuthRequiredToast() {
    toast.error(
      "Bitte registriere dich oder logge dich ein, um dynamische QR-Codes zu speichern.",
    );
  }

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
    let cancelled = false;

    void fetchTemplates().then((data) => {
      if (!cancelled && data) {
        setTemplates(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !customCodeValue) return;

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
  }, [customCode, customCodeValue, isAuthenticated]);

  async function saveTemplate() {
    if (!isAuthenticated) {
      showAuthRequiredToast();
      return;
    }

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
          colorFrom: colors.from,
          colorTo: colors.to,
          backgroundColor: colors.bg,
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
    const nextPreset = PRESETS[template.preset] ? template.preset : "Custom";
    const fallbackColors = PRESETS[template.preset] ?? PRESETS.Wald;

    setPreset(nextPreset);
    setColors({
      from: isHexColor(template.colorFrom) ? template.colorFrom : fallbackColors.from,
      to: isHexColor(template.colorTo) ? template.colorTo : fallbackColors.to,
      bg: isHexColor(template.backgroundColor)
        ? template.backgroundColor
        : fallbackColors.bg,
    });
    setDotType(template.dotType as DotType);
    setCornerType(template.cornerType as CornerSquareType);
    setTransparent(template.transparent);
    setPrintMode(template.printMode);
    toast.success(`Vorlage "${template.name}" geladen.`);
  }

  async function deleteTemplate(templateId: string) {
    if (!isAuthenticated) {
      showAuthRequiredToast();
      return;
    }

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

  function applyPreset(name: string) {
    const nextColors = PRESETS[name];
    if (!nextColors) return;
    setPreset(name);
    setColors(nextColors);
  }

  function updateDesignColor(key: keyof DesignColors, value: string) {
    if (!isHexColor(value)) return;
    setPreset("Custom");
    setColors((current) => ({ ...current, [key]: value.toLowerCase() }));
  }

  function parseBatchCsv(csv: string) {
    const delimiter = detectCsvDelimiter(csv);
    const rows = parseCsvRows(csv, delimiter).filter((row) =>
      row.fields.some((field) => field.trim()),
    );
    const header = rows[0] && isBatchHeader(rows[0].fields) ? rows[0].fields : null;
    const dataRows = header ? rows.slice(1) : rows;

    return dataRows.map((row) => {
      const { name, url, code, expiresAt } = parseBatchRow(
        row.fields,
        row.row,
        header,
      );
      const normalizedUrl = parseHttpUrl(url);
      const parsedCode = code ? parseCode(code) : null;
      const parsedExpiresAt = expiresAt ? parseNullableDate(expiresAt) : null;
      const errors: string[] = [];

      if (!url) {
        errors.push("URL fehlt.");
      } else if (!normalizedUrl) {
        errors.push("URL ist ungültig.");
      }

      if (code && !parsedCode) {
        errors.push("Slug ist ungültig.");
      }

      if (parsedExpiresAt === undefined) {
        errors.push("Ablaufdatum ist ungültig.");
      } else if (parsedExpiresAt && parsedExpiresAt.getTime() <= Date.now()) {
        errors.push("Ablaufdatum muss in der Zukunft liegen.");
      }

      return {
        id: createRuntimeId("batch"),
        row: row.row,
        name,
        url,
        normalizedUrl,
        code,
        parsedCode,
        expiresAt,
        error: errors.length ? errors.join(" ") : null,
      };
    });
  }

  function handleBatchCsvChange(csv: string) {
    setBatchCsvText(csv);
    setBatchResult([]);
    const items = parseBatchCsv(csv);
    setBatchItems(items);
  }

  async function handleBatchFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      toast.error("Bitte lade eine CSV- oder TXT-Datei hoch.");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("Die Batch-Datei darf maximal 1 MB groß sein.");
      return;
    }

    const csv = await file.text();
    handleBatchCsvChange(csv);
    toast.success("CSV importiert.");
  }

  function insertBatchExample() {
    handleBatchCsvChange(
      "Name, URL, Slug, Ablaufdatum\nGoogle, https://google.com, google-demo,\nGitHub, https://github.com, github-demo,",
    );
  }

  async function createBatchQrCodes() {
    if (!isAuthenticated) {
      showAuthRequiredToast();
      return;
    }

    if (batchItems.length === 0) {
      toast.error("Bitte füge mindestens einen QR-Code hinzu.");
      return;
    }

    if (batchLimitExceeded) {
      toast.error(
        `Maximal ${MAX_BATCH_SIZE} QR-Codes pro Batch. Du hast ${batchItems.length} eingegeben.`,
      );
      return;
    }

    if (batchInvalidItems.length > 0) {
      toast.error(
        `${batchInvalidItems.length} Zeile(n) sind ungültig. Bitte korrigiere sie vor dem Erstellen.`,
      );
      return;
    }

    setBatchLoading(true);
    setBatchResult([]);
    const created: BatchCreatedItem[] = [];
    const failures: string[] = [];

    try {
      const res = await authorizedFetch("/api/qr/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: batchValidItems.map((item) => ({
            row: item.row,
            name: item.name,
            title: item.name,
            targetUrl: item.normalizedUrl,
            code: item.parsedCode,
            expiresAt: item.expiresAt || null,
          })),
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        items?: Array<{
          row: number;
          name: string;
          code: string;
          shortUrl: string;
          targetUrl: string;
        }>;
        failures?: Array<{ row: number; error: string }>;
      };

      if (!res.ok && !body.items?.length) {
        const failureMessage = (body.failures ?? [])
          .slice(0, 3)
          .map((failure) => `Zeile ${failure.row}: ${failure.error}`)
          .join(" ");
        throw new Error(
          res.status === 401
            ? "Bitte melde dich an, um Batch-QR-Codes zu speichern."
            : failureMessage || body.error || "Batch-Erstellung fehlgeschlagen.",
        );
      }

      created.push(
        ...(body.items ?? []).map((item) => ({
          name: item.name,
          code: item.code,
          shortUrl: item.shortUrl,
          targetUrl: item.targetUrl,
        })),
      );
      failures.push(
        ...(body.failures ?? []).map(
          (failure) => `Zeile ${failure.row}: ${failure.error}`,
        ),
      );

      if (created.length > 0) {
        toast.success(
          failures.length
            ? `${created.length} QR-Codes erstellt, ${failures.length} fehlgeschlagen.`
            : `${created.length} QR-Codes erstellt.`,
        );
        setBatchResult(created);
        downloadBatchCsv(created);
        if (failures.length === 0) {
          setBatchCsvText("");
          setBatchItems([]);
        }
      }

      if (failures.length > 0) {
        toast.error(failures.slice(0, 3).join(" "));
      }

      if (created.length === 0 && failures.length === 0) {
        toast.error("Keine QR-Codes erstellt.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Fehler beim Erstellen.",
      );
    } finally {
      setBatchLoading(false);
    }
  }

  function downloadBatchCsv(created: BatchCreatedItem[]) {
    const headers = ["Name", "Code", "Kurz-URL", "Ziel-URL"].join(",");
    const rows = created.map((item) =>
      [
        csvCell(item.name),
        csvCell(item.code),
        csvCell(toAbsoluteUrl(item.shortUrl)),
        csvCell(item.targetUrl),
      ].join(",")
    );
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `batch-qr-codes-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const options: QrOptions = useMemo(() => {
    const from = printMode ? "#000000" : colors.from;
    const to = printMode ? "#000000" : colors.to;
    const background = printMode
      ? "#ffffff"
      : transparent
        ? "transparent"
        : colors.bg;

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
  }, [colors, cornerType, dotType, logo, printMode, qrData, transparent]);

  const designWarnings = useMemo(() => {
    if (printMode) return [];

    const warnings: string[] = [];
    if (transparent) {
      warnings.push("Transparente Codes vorher auf dem echten Hintergrund testen.");
    }
    if (logo) {
      warnings.push("Mit Logo unbedingt einen Testscan machen.");
    }
    const ratio = Math.min(
      contrastRatio(colors.from, colors.bg),
      contrastRatio(colors.to, colors.bg),
    );
    if (ratio < 3) {
      warnings.push("Der Farbkontrast ist niedrig. Für Druck besser Druckmodus nutzen.");
    }
    return warnings;
  }, [colors, logo, printMode, transparent]);

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
    if (!isAuthenticated) {
      showAuthRequiredToast();
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
            ? "Bitte melde dich an, um dynamische QR-Codes zu speichern."
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
    } catch {
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
        <Card className="order-2 overflow-hidden border-border/70 bg-card/95 p-4 shadow-xl shadow-slate-900/5 lg:order-1 sm:p-5">
          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
            <TabsList className="grid h-11 w-full grid-cols-3 rounded-lg bg-muted/70 p-1">
              <TabsTrigger value="static">Statisch</TabsTrigger>
              <TabsTrigger value="dynamic">Dynamisch</TabsTrigger>
              <TabsTrigger value="batch">Batch</TabsTrigger>
            </TabsList>

            <TabsContent value="static" className="mt-5 space-y-4">
              <Field
                label="Inhaltstyp"
                hint="Statische Codes enthalten den Inhalt direkt im QR-Code."
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {(Object.keys(QR_TYPES) as QrType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setQrType(type);
                        setQrTypeData({});
                      }}
                      className={`rounded-lg border p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${
                        qrType === type
                          ? "border-ring bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background/70 hover:border-foreground/30"
                      }`}
                      title={QR_TYPES[type].description}
                    >
                      <div className="mb-2 grid size-8 place-items-center rounded-md bg-background/80 text-foreground shadow-sm">
                        {QR_TYPE_ICONS[type]}
                      </div>
                      <div className="text-xs font-medium">{QR_TYPES[type].label}</div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {QR_TYPES[type].description}
                      </p>
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
                <VCardFields
                  idPrefix="vcard"
                  data={qrTypeData}
                  onChange={updateStaticQrTypeData}
                />
              )}

              {qrType === "wifi" && (
                <WifiFields
                  idPrefix="wifi"
                  data={qrTypeData}
                  onChange={updateStaticQrTypeData}
                />
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
              {!isAuthenticated && (
                <AuthRequiredPanel text="Dynamische QR-Codes werden in deinem Konto gespeichert. Danach kannst du Ziel, Inhalt, Ablaufdatum und Analytics jederzeit im Dashboard bearbeiten." />
              )}

              <Field
                label="Inhaltstyp"
                hint="Dynamische Codes speichern einen Kurzlink, den du später im Dashboard bearbeiten kannst."
              >
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
                      className={`rounded-lg border p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm ${
                        dynQrType === type
                          ? "border-ring bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background/70 hover:border-foreground/30"
                      }`}
                      title={QR_TYPES[type].description}
                    >
                      <div className="mb-2 grid size-8 place-items-center rounded-md bg-background/80 text-foreground shadow-sm">
                        {QR_TYPE_ICONS[type]}
                      </div>
                      <div className="text-xs font-medium">{QR_TYPES[type].label}</div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {QR_TYPES[type].description}
                      </p>
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
                <VCardFields
                  idPrefix="dyn-vcard"
                  data={dynQrData}
                  onChange={updateDynamicQrData}
                />
              )}

              {dynQrType === "wifi" && (
                <WifiFields
                  idPrefix="dyn-wifi"
                  data={dynQrData}
                  onChange={updateDynamicQrData}
                />
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
                  : !isAuthenticated
                    ? "Einloggen zum Speichern"
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
              {!isAuthenticated && (
                <AuthRequiredPanel text="Batch-Erstellung speichert dynamische Kurzlinks in deinem Konto. Registriere dich kostenlos, bevor du mehrere Codes erzeugst." />
              )}

              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                <p className="font-medium mb-2">Batch-Import</p>
                <code className="text-xs bg-background px-2 py-1 rounded block overflow-auto max-h-20">
                  Name, URL, Slug, Ablaufdatum{"\n"}Google, https://google.com, google-demo,{"\n"}GitHub, https://github.com, github-demo,
                </code>
                <p className="mt-2 text-xs">
                  Komma oder Semikolon funktionieren. Optionale Spalten: Slug, Code, Ablaufdatum oder Gültig bis.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                <Field label="CSV-Datei hochladen" htmlFor="batch-file">
                  <Input
                    id="batch-file"
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={(event) =>
                      void handleBatchFile(event.target.files?.[0])
                    }
                  />
                </Field>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={insertBatchExample}
                  >
                    Beispiel einfügen
                  </Button>
                </div>
              </div>

              <Field label="CSV-Daten" htmlFor="batch-csv">
                <textarea
                  id="batch-csv"
                  value={batchCsvText}
                  onInput={(event) =>
                    handleBatchCsvChange(event.currentTarget.value)
                  }
                  placeholder={"Name, URL, Slug, Ablaufdatum\nGoogle, https://google.com, google-demo,\nGitHub, https://github.com, github-demo,"}
                  className="min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </Field>

              {batchItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>{batchItems.length} Zeile(n) erkannt</Label>
                    <span
                      className={`text-xs ${
                        batchInvalidItems.length || batchLimitExceeded
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {batchValidItems.length} gültig
                      {batchInvalidItems.length
                        ? ` · ${batchInvalidItems.length} fehlerhaft`
                        : ""}
                    </span>
                  </div>
                  {batchLimitExceeded && (
                    <p className="text-xs text-destructive">
                      Maximal {MAX_BATCH_SIZE} QR-Codes pro Batch.
                    </p>
                  )}
                  <div className="max-h-64 overflow-auto rounded-lg border border-border">
                    {batchItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 border-b border-border last:border-0 p-2 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            Zeile {item.row}: {item.name}
                          </p>
                          <p
                            className={`text-xs truncate ${
                              item.error
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {item.error ?? item.normalizedUrl}
                          </p>
                          {!item.error && (item.parsedCode || item.expiresAt) && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {[
                                item.parsedCode ? `Slug: ${item.parsedCode}` : null,
                                item.expiresAt ? `Ablauf: ${item.expiresAt}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                        {item.error ? (
                          <AlertTriangle className="size-4 shrink-0 text-destructive" />
                        ) : (
                          <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={createBatchQrCodes}
                disabled={
                  batchLoading ||
                  batchItems.length === 0 ||
                  batchInvalidItems.length > 0 ||
                  batchLimitExceeded
                }
              >
                {batchLoading ? (
                  <>
                    <Wand2 className="size-4 animate-spin" />
                    Erstelle {batchValidItems.length} Codes...
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4" />
                    {isAuthenticated
                      ? `${batchValidItems.length} Codes erstellen`
                      : "Einloggen zum Erstellen"}
                  </>
                )}
              </Button>

              {batchResult.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {batchResult.length} QR-Codes erstellt
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Die Ergebnis-CSV enthält Kurz-URLs, Slugs und Ziel-URLs.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => downloadBatchCsv(batchResult)}
                    >
                      <Download className="size-4" />
                      CSV erneut laden
                    </Button>
                  </div>
                </div>
              )}
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
              <div className="flex items-center justify-between gap-3">
                <Label className="flex items-center gap-2">
                  <Palette className="size-4" />
                  Designvorlagen
                </Label>
                <span className="text-xs text-muted-foreground">
                  {preset === "Custom" ? "Individuell" : preset}
                </span>
              </div>
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
                        onClick={() => applyPreset(name)}
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

            <div className="grid gap-3 sm:grid-cols-3">
              <ColorPicker
                id="color-from"
                label="Startfarbe"
                value={colors.from}
                disabled={printMode}
                onChange={(value) => updateDesignColor("from", value)}
              />
              <ColorPicker
                id="color-to"
                label="Endfarbe"
                value={colors.to}
                disabled={printMode}
                onChange={(value) => updateDesignColor("to", value)}
              />
              <ColorPicker
                id="color-bg"
                label="Hintergrund"
                value={colors.bg}
                disabled={printMode || transparent}
                displayValue={transparent ? "transparent" : colors.bg}
                onChange={(value) => updateDesignColor("bg", value)}
              />
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
              onClick={() => {
                if (!isAuthenticated) {
                  showAuthRequiredToast();
                  return;
                }
                setShowSaveTemplate(true);
              }}
            >
              <Save className="size-4" />
              {isAuthenticated
                ? "Aktuelles Design speichern"
                : "Einloggen, um Design zu speichern"}
            </Button>

            {showSaveTemplate && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
                <h3 className="text-sm font-semibold">Designvorlage speichern</h3>
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

        <Card className="order-1 overflow-hidden border-border/70 bg-card/95 p-4 shadow-xl shadow-slate-900/5 lg:sticky lg:top-20 lg:order-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Live-Vorschau</p>
              <p className="text-xs text-muted-foreground">
                {printMode ? "Druckoptimiert" : preset === "Custom" ? "Individuelles Design" : preset}
              </p>
            </div>
            <span className="rounded-md border border-border bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
              {exportSize}px
            </span>
          </div>
          <div className="grid place-items-center rounded-lg border border-border/70 bg-white p-4 shadow-inner">
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
            SVG-Code
          </Button>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ImageIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              Dynamische Codes verwenden nach dem Speichern die finale Kurz-URL.
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

function AuthRequiredPanel({ text }: { text: string }) {
  const next = encodeURIComponent("/create");

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
      <div className="flex gap-3">
        <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <LogIn className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Konto erforderlich</p>
          <p className="mt-1 leading-6 text-muted-foreground">{text}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              className="shadow-glow"
              render={<Link href={`/register?next=${next}`} />}
            >
              <UserPlus className="size-4" />
              Kostenlos registrieren
            </Button>
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/login?next=${next}`} />}
            >
              <LogIn className="size-4" />
              Einloggen
            </Button>
          </div>
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

function VCardFields({
  idPrefix,
  data,
  onChange,
}: {
  idPrefix: string;
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Field
        label="Anzeigename"
        htmlFor={`${idPrefix}-name`}
        hint="Wird in Kontakt-Apps als Hauptname angezeigt."
      >
        <Input
          id={`${idPrefix}-name`}
          value={data.name || ""}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder="Max Mustermann"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Vorname" htmlFor={`${idPrefix}-first-name`}>
          <Input
            id={`${idPrefix}-first-name`}
            value={data.firstName || ""}
            onChange={(event) => onChange("firstName", event.target.value)}
            placeholder="Max"
          />
        </Field>
        <Field label="Nachname" htmlFor={`${idPrefix}-last-name`}>
          <Input
            id={`${idPrefix}-last-name`}
            value={data.lastName || ""}
            onChange={(event) => onChange("lastName", event.target.value)}
            placeholder="Mustermann"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="E-Mail" htmlFor={`${idPrefix}-email`}>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={data.email || ""}
            onChange={(event) => onChange("email", event.target.value)}
            placeholder="max@example.com"
          />
        </Field>
        <Field label="Website" htmlFor={`${idPrefix}-url`}>
          <Input
            id={`${idPrefix}-url`}
            type="url"
            value={data.url || ""}
            onBlur={() => {
              if (data.url?.trim()) {
                onChange("url", normalizeUrlInput(data.url));
              }
            }}
            onChange={(event) => onChange("url", event.target.value)}
            placeholder="https://example.com"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mobiltelefon" htmlFor={`${idPrefix}-phone`}>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            value={data.phone || ""}
            onChange={(event) => onChange("phone", event.target.value)}
            placeholder="+49 123 456789"
          />
        </Field>
        <Field label="Telefon Arbeit" htmlFor={`${idPrefix}-work-phone`}>
          <Input
            id={`${idPrefix}-work-phone`}
            type="tel"
            value={data.workPhone || ""}
            onChange={(event) => onChange("workPhone", event.target.value)}
            placeholder="+49 30 123456"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Firma" htmlFor={`${idPrefix}-org`}>
          <Input
            id={`${idPrefix}-org`}
            value={data.org || ""}
            onChange={(event) => onChange("org", event.target.value)}
            placeholder="Firmenname"
          />
        </Field>
        <Field label="Abteilung" htmlFor={`${idPrefix}-department`}>
          <Input
            id={`${idPrefix}-department`}
            value={data.department || ""}
            onChange={(event) => onChange("department", event.target.value)}
            placeholder="Marketing"
          />
        </Field>
        <Field label="Position" htmlFor={`${idPrefix}-job-title`}>
          <Input
            id={`${idPrefix}-job-title`}
            value={data.jobTitle || ""}
            onChange={(event) => onChange("jobTitle", event.target.value)}
            placeholder="Founder"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Field label="Straße und Hausnummer" htmlFor={`${idPrefix}-street`}>
          <Input
            id={`${idPrefix}-street`}
            value={data.street || ""}
            onChange={(event) => onChange("street", event.target.value)}
            placeholder="Musterstraße 1"
          />
        </Field>
        <Field label="Geburtstag" htmlFor={`${idPrefix}-birthday`}>
          <Input
            id={`${idPrefix}-birthday`}
            type="date"
            value={data.birthday || ""}
            onChange={(event) => onChange("birthday", event.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="PLZ" htmlFor={`${idPrefix}-postal-code`}>
          <Input
            id={`${idPrefix}-postal-code`}
            value={data.postalCode || ""}
            onChange={(event) => onChange("postalCode", event.target.value)}
            placeholder="10115"
          />
        </Field>
        <Field label="Ort" htmlFor={`${idPrefix}-city`}>
          <Input
            id={`${idPrefix}-city`}
            value={data.city || ""}
            onChange={(event) => onChange("city", event.target.value)}
            placeholder="Berlin"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bundesland/Region" htmlFor={`${idPrefix}-region`}>
          <Input
            id={`${idPrefix}-region`}
            value={data.region || ""}
            onChange={(event) => onChange("region", event.target.value)}
            placeholder="Berlin"
          />
        </Field>
        <Field label="Land" htmlFor={`${idPrefix}-country`}>
          <Input
            id={`${idPrefix}-country`}
            value={data.country || ""}
            onChange={(event) => onChange("country", event.target.value)}
            placeholder="Deutschland"
          />
        </Field>
      </div>

      <Field label="Notiz" htmlFor={`${idPrefix}-note`}>
        <textarea
          id={`${idPrefix}-note`}
          value={data.note || ""}
          onChange={(event) => onChange("note", event.target.value)}
          placeholder="Optionaler Hinweis, Öffnungszeiten oder Kontext"
          className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Field>
    </div>
  );
}

function WifiFields({
  idPrefix,
  data,
  onChange,
}: {
  idPrefix: string;
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const security = data.security || "WPA";
  const requiresPassword = wifiRequiresPassword(security);

  return (
    <div className="space-y-4">
      <Field label="Netzwerkname (SSID)" htmlFor={`${idPrefix}-ssid`}>
        <Input
          id={`${idPrefix}-ssid`}
          value={data.ssid || ""}
          onChange={(event) => onChange("ssid", event.target.value)}
          placeholder="Studio WLAN"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sicherheit" htmlFor={`${idPrefix}-security`}>
          <Select
            value={security}
            onValueChange={(value) => onChange("security", value ?? "WPA")}
          >
            <SelectTrigger id={`${idPrefix}-security`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WPA">WPA/WPA2</SelectItem>
              <SelectItem value="WPA2">WPA2</SelectItem>
              <SelectItem value="WPA3">WPA3</SelectItem>
              <SelectItem value="WPA2-WPA3">WPA2/WPA3 Mixed</SelectItem>
              <SelectItem value="WEP">WEP</SelectItem>
              <SelectItem value="nopass">Offen (kein Passwort)</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {requiresPassword ? (
          <Field label="Passwort" htmlFor={`${idPrefix}-password`}>
            <Input
              id={`${idPrefix}-password`}
              type="password"
              value={data.password || ""}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder="Netzwerkpasswort"
            />
          </Field>
        ) : (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Offenes Netzwerk: Der QR-Code enthält kein Passwort.
          </div>
        )}
      </div>

      <ToggleRow
        id={`${idPrefix}-hidden`}
        label="Verstecktes Netzwerk"
        checked={data.hidden === "true"}
        onCheckedChange={(checked) =>
          onChange("hidden", checked ? "true" : "false")
        }
      />
    </div>
  );
}

function ColorPicker({
  id,
  label,
  value,
  displayValue,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  displayValue?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-11 rounded-md border border-input bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <code className="min-w-0 truncate rounded-md border border-border bg-muted/40 px-2 py-2 text-xs uppercase text-muted-foreground">
          {displayValue ?? value}
        </code>
      </div>
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

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function parseBatchRow(
  fields: string[],
  row: number,
  header: string[] | null,
) {
  if (header) {
    const name = readBatchColumn(fields, header, [
      "name",
      "titel",
      "title",
      "bezeichnung",
    ]);
    const url = readBatchColumn(fields, header, [
      "url",
      "link",
      "ziel",
      "ziel-url",
      "ziel url",
      "targeturl",
      "target url",
    ]);
    const code = readBatchColumn(fields, header, [
      "slug",
      "code",
      "kurzcode",
      "shortcode",
      "short code",
    ]);
    const expiresAt = readBatchColumn(fields, header, [
      "ablauf",
      "ablaufdatum",
      "gültig bis",
      "gultig bis",
      "gueltig bis",
      "expires",
      "expiresat",
      "expires at",
      "expires_at",
      "valid until",
    ]);

    return {
      name: name || `Code ${row}`,
      url,
      code,
      expiresAt,
    };
  }

  const first = fields[0]?.trim() ?? "";
  const second = fields[1]?.trim() ?? "";
  const third = fields[2]?.trim() ?? "";
  const fourth = fields[3]?.trim() ?? "";
  const secondIsUrl = Boolean(parseHttpUrl(second));

  return {
    name: secondIsUrl ? first || `Code ${row}` : `Code ${row}`,
    url: secondIsUrl ? second : first,
    code: secondIsUrl ? third : second,
    expiresAt: secondIsUrl ? fourth : third,
  };
}

function readBatchColumn(fields: string[], header: string[], aliases: string[]) {
  const index = header.findIndex((field) =>
    aliases.includes(normalizeBatchHeader(field)),
  );
  return index >= 0 ? fields[index]?.trim() ?? "" : "";
}

function normalizeBatchHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function detectCsvDelimiter(csv: string) {
  const firstLine = csv.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const commaCount = countDelimiterOutsideQuotes(firstLine, ",");
  const semicolonCount = countDelimiterOutsideQuotes(firstLine, ";");
  return semicolonCount > commaCount ? ";" : ",";
}

function countDelimiterOutsideQuotes(value: string, delimiter: "," | ";") {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"') {
      if (inQuotes && value[index + 1] === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }

  return count;
}

function parseCsvRows(csv: string, delimiter: "," | ";") {
  const rows: Array<{ fields: string[]; row: number }> = [];
  let fields: string[] = [];
  let field = "";
  let row = 1;
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];

    if (char === '"') {
      if (inQuotes && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      fields.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      fields.push(field);
      rows.push({ fields, row });
      fields = [];
      field = "";
      if (char === "\r" && csv[index + 1] === "\n") {
        index += 1;
      }
      row += 1;
      continue;
    }

    field += char;
  }

  if (field || fields.length > 0) {
    fields.push(field);
    rows.push({ fields, row });
  }

  return rows;
}

function isBatchHeader(fields: string[]) {
  const normalized = fields.map(normalizeBatchHeader);
  const hasUrl = normalized.some((field) =>
    ["url", "link", "ziel", "ziel url", "targeturl", "target url"].includes(
      field,
    ),
  );
  return hasUrl;
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function toAbsoluteUrl(value: string) {
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    return new URL(value, base).href;
  } catch {
    return value;
  }
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
