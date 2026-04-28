"use client";

import { useMemo, useState } from "react";
import { Download, Link2, Image as ImageIcon, Wand2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { QrPreview, downloadQr, type QrOptions } from "@/components/qr-preview";

type DotType = "rounded" | "dots" | "classy" | "classy-rounded" | "square" | "extra-rounded";
type CornerSquareType = "dot" | "square" | "extra-rounded";

const PRESETS: Record<string, { from: string; to: string; bg: string }> = {
  "Violett-Cyan": { from: "#8b5cf6", to: "#22d3ee", bg: "#ffffff" },
  "Pink-Orange": { from: "#ec4899", to: "#f97316", bg: "#ffffff" },
  Mitternacht: { from: "#0f172a", to: "#1e293b", bg: "#ffffff" },
  Gold: { from: "#f59e0b", to: "#d97706", bg: "#0f172a" },
  Schwarz: { from: "#000000", to: "#000000", bg: "#ffffff" },
};

export function QrCreator() {
  const [tab, setTab] = useState<"static" | "dynamic">("static");

  // gemeinsame Style-Optionen
  const [preset, setPreset] = useState<keyof typeof PRESETS>("Violett-Cyan");
  const [dotType, setDotType] = useState<DotType>("rounded");
  const [cornerType, setCornerType] = useState<CornerSquareType>("extra-rounded");
  const [logo, setLogo] = useState<string | null>(null);
  const [transparent, setTransparent] = useState(false);

  // Statisch
  const [staticData, setStaticData] = useState("https://example.com");

  // Dynamisch
  const [dynUrl, setDynUrl] = useState("https://example.com");
  const [dynTitle, setDynTitle] = useState("");
  const [dynLoading, setDynLoading] = useState(false);
  const [dynResult, setDynResult] = useState<{ shortUrl: string; code: string } | null>(null);

  const data = tab === "static" ? staticData : dynResult?.shortUrl ?? "Dynamisches Ziel — bitte erst speichern";

  const options: QrOptions = useMemo(() => {
    const p = PRESETS[preset];
    return {
      type: "svg",
      data: data || " ",
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
  }, [data, preset, dotType, cornerType, logo, transparent]);

  function onLogoUpload(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Logo zu groß (max. 1 MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function createDynamic() {
    setDynLoading(true);
    try {
      const res = await fetch("/api/qr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUrl: dynUrl, title: dynTitle || null }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(msg.error ?? "Fehler beim Erstellen");
      }
      const json = (await res.json()) as { code: string; shortUrl: string };
      setDynResult(json);
      toast.success("Dynamischer Code erstellt — Ziel jederzeit änderbar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setDynLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      {/* Vorschau */}
      <Card className="relative flex min-h-[28rem] flex-col items-center justify-center overflow-hidden border-border/60 bg-card/40 p-6 backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.18),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(34,211,238,0.18),transparent_60%)]"
        />
        <div className="grid place-items-center rounded-2xl bg-white p-5 shadow-2xl shadow-violet-500/10">
          <QrPreview options={options} size={320} />
        </div>
        <div className="mt-6 flex gap-2">
          <Button
            variant="secondary"
            onClick={() => downloadQr(options, "png")}
          >
            <Download className="size-4" /> PNG
          </Button>
          <Button
            variant="secondary"
            onClick={() => downloadQr(options, "svg")}
          >
            <Download className="size-4" /> SVG
          </Button>
        </div>
        <p className="mt-4 max-w-md text-center text-xs text-muted-foreground">
          Tipp: Teste deinen Code mit dem Handy bevor du ihn druckst — vor allem
          mit Logo und auf farbigem Hintergrund.
        </p>
      </Card>

      {/* Steuerung */}
      <Card className="border-border/60 bg-card/60 p-6 backdrop-blur">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="static">Statisch</TabsTrigger>
            <TabsTrigger value="dynamic">Dynamisch</TabsTrigger>
          </TabsList>

          <TabsContent value="static" className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="data">URL oder Text</Label>
              <Input
                id="data"
                value={staticData}
                onChange={(e) => setStaticData(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                Inhalt wird direkt im QR-Code gespeichert und ist nicht
                änderbar.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="dynamic" className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dyn-url">Ziel-URL</Label>
              <Input
                id="dyn-url"
                value={dynUrl}
                onChange={(e) => setDynUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dyn-title">Bezeichnung (optional)</Label>
              <Input
                id="dyn-title"
                value={dynTitle}
                onChange={(e) => setDynTitle(e.target.value)}
                placeholder="z. B. Speisekarte Frühling"
              />
            </div>
            <Button
              className="w-full"
              onClick={createDynamic}
              disabled={dynLoading || !dynUrl}
            >
              <Wand2 className="size-4" />
              {dynLoading ? "Erstelle..." : "Dynamischen Code erstellen"}
            </Button>
            {dynResult && (
              <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Link2 className="size-3.5" /> Kurz-URL
                </div>
                <div className="mt-1 break-all font-mono">
                  {dynResult.shortUrl}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Der QR-Code zeigt auf eine kurze URL — das echte Ziel kannst du
              später im Dashboard ändern.
            </p>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Stil</h3>

          <div className="space-y-2">
            <Label>Farbschema</Label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((k) => {
                const p = PRESETS[k];
                const active = preset === k;
                return (
                  <button
                    key={k}
                    onClick={() => setPreset(k)}
                    title={k}
                    className={`h-10 rounded-lg border transition-all ${
                      active
                        ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                        : "border-border/60 hover:border-border"
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${p.from}, ${p.to})`,
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Punkte</Label>
              <Select value={dotType} onValueChange={(v) => setDotType(v as DotType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rounded">Abgerundet</SelectItem>
                  <SelectItem value="dots">Punkte</SelectItem>
                  <SelectItem value="classy">Classy</SelectItem>
                  <SelectItem value="classy-rounded">Classy gerundet</SelectItem>
                  <SelectItem value="square">Quadrate</SelectItem>
                  <SelectItem value="extra-rounded">Extra rund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ecken</Label>
              <Select
                value={cornerType}
                onValueChange={(v) => setCornerType(v as CornerSquareType)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="extra-rounded">Extra rund</SelectItem>
                  <SelectItem value="square">Quadratisch</SelectItem>
                  <SelectItem value="dot">Punkt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/30 px-3 py-2">
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
            <Label htmlFor="logo">Logo (PNG/SVG, optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="logo"
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                onChange={(e) => onLogoUpload(e.target.files?.[0])}
              />
              {logo && (
                <Button variant="ghost" size="icon" onClick={() => setLogo(null)}>
                  <ImageIcon className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
