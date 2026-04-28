"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Image as ImageIcon,
  Link2,
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
import { parseHttpUrl } from "@/lib/validation";
import { QrPreview, downloadQr, type QrOptions } from "@/components/qr-preview";

type DotType =
  | "rounded"
  | "dots"
  | "classy"
  | "classy-rounded"
  | "square"
  | "extra-rounded";
type CornerSquareType = "dot" | "square" | "extra-rounded";

const PRESETS: Record<string, { from: string; to: string; bg: string }> = {
  Wald: { from: "#047857", to: "#0891b2", bg: "#ffffff" },
  Koralle: { from: "#e11d48", to: "#f59e0b", bg: "#ffffff" },
  Tinte: { from: "#111827", to: "#2563eb", bg: "#ffffff" },
  Moos: { from: "#365314", to: "#65a30d", bg: "#f8fafc" },
  Mono: { from: "#020617", to: "#020617", bg: "#ffffff" },
};

export function QrCreator() {
  const [tab, setTab] = useState<"static" | "dynamic">("static");
  const [preset, setPreset] = useState<keyof typeof PRESETS>("Wald");
  const [dotType, setDotType] = useState<DotType>("rounded");
  const [cornerType, setCornerType] =
    useState<CornerSquareType>("extra-rounded");
  const [logo, setLogo] = useState<string | null>(null);
  const [transparent, setTransparent] = useState(false);
  const [staticData, setStaticData] = useState("https://example.com");
  const [dynUrl, setDynUrl] = useState("https://example.com");
  const [dynTitle, setDynTitle] = useState("");
  const [dynLoading, setDynLoading] = useState(false);
  const [dynResult, setDynResult] = useState<{
    shortUrl: string;
    code: string;
  } | null>(null);

  const qrData =
    tab === "static"
      ? staticData.trim() || "https://example.com"
      : dynResult?.shortUrl ?? (dynUrl.trim() || "https://example.com");
  const canDownload = tab === "static" ? Boolean(staticData.trim()) : !!dynResult;

  const options: QrOptions = useMemo(() => {
    const p = PRESETS[preset];
    return {
      type: "svg",
      data: qrData,
      margin: 8,
      qrOptions: { errorCorrectionLevel: logo ? "H" : "M" },
      backgroundOptions: { color: transparent ? "transparent" : p.bg },
      dotsOptions: {
        type: dotType,
        gradient: {
          type: "linear",
          rotation: Math.PI / 4,
          colorStops: [
            { offset: 0, color: p.from },
            { offset: 1, color: p.to },
          ],
        },
      },
      cornersSquareOptions: { type: cornerType, color: p.from },
      cornersDotOptions: { type: "dot", color: p.to },
      image: logo ?? undefined,
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 4,
        imageSize: 0.32,
      },
    };
  }, [cornerType, dotType, logo, preset, qrData, transparent]);

  function onLogoUpload(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Logo ist zu gross. Maximal 1 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function createDynamic() {
    const parsedTarget = parseHttpUrl(dynUrl);
    if (!parsedTarget) {
      toast.error("Bitte gib eine gültige http(s)-URL ein.");
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
    void downloadQr(options, format);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
      <Card className="order-2 border-border bg-card p-4 shadow-sm lg:order-1 sm:p-5">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="static">Statisch</TabsTrigger>
            <TabsTrigger value="dynamic">Dynamisch</TabsTrigger>
          </TabsList>

          <TabsContent value="static" className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="data">URL oder Text</Label>
              <Input
                id="data"
                value={staticData}
                onChange={(event) => setStaticData(event.target.value)}
                placeholder="https://..."
              />
            </div>
          </TabsContent>

          <TabsContent value="dynamic" className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dyn-url">Ziel-URL</Label>
              <Input
                id="dyn-url"
                value={dynUrl}
                onChange={(event) => {
                  setDynUrl(event.target.value);
                  setDynResult(null);
                }}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dyn-title">Bezeichnung</Label>
              <Input
                id="dyn-title"
                value={dynTitle}
                onChange={(event) => setDynTitle(event.target.value)}
                placeholder="Speisekarte, Flyer, Kampagne"
              />
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
            <div className="space-y-2">
              <Label>Punkte</Label>
              <Select
                value={dotType}
                onValueChange={(value) => setDotType(value as DotType)}
              >
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label>Ecken</Label>
              <Select
                value={cornerType}
                onValueChange={(value) =>
                  setCornerType(value as CornerSquareType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="extra-rounded">Extra rund</SelectItem>
                  <SelectItem value="square">Quadratisch</SelectItem>
                  <SelectItem value="dot">Punkt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
            <Label htmlFor="transparent" className="text-sm">
              Transparenter Hintergrund
            </Label>
            <Switch
              id="transparent"
              checked={transparent}
              onCheckedChange={setTransparent}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo</Label>
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
          </div>
        </div>
      </Card>

      <Card className="order-1 border-border bg-card p-4 shadow-sm lg:sticky lg:top-20 lg:order-2">
        <div className="grid place-items-center rounded-lg bg-white p-4 shadow-inner">
          <QrPreview options={options} size={240} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
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
            variant="secondary"
            className="h-10"
            onClick={() => download("svg")}
            disabled={!canDownload}
          >
            <Download className="size-4" />
            SVG
          </Button>
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
  );
}
