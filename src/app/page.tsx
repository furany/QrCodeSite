import Link from "next/link";
import {
  Sparkles,
  Palette,
  RefreshCw,
  BarChart3,
  ImageIcon,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="relative isolate overflow-hidden">
      {/* Hintergrund-Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu blur-3xl"
      >
        <div
          className="relative left-1/2 aspect-[1155/678] w-[72rem] -translate-x-1/2 bg-gradient-to-tr from-fuchsia-500 via-violet-500 to-cyan-400 opacity-25"
          style={{
            clipPath:
              "polygon(74% 44%, 100% 61%, 97% 26%, 85% 0%, 80% 2%, 72% 32%, 60% 62%, 52% 68%, 47% 58%, 45% 34%, 27% 76%, 0% 64%, 17% 100%, 27% 76%, 76% 97%, 74% 44%)",
          }}
        />
      </div>

      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-20 pb-24 text-center sm:pt-28 sm:pb-32">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5 text-violet-400" />
          QR-Codes, die nicht aussehen wie 2008
        </span>
        <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          <span className="bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
            QR-Codes,{" "}
          </span>
          <span className="bg-gradient-to-br from-fuchsia-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
            schön gemacht.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Statische und dynamische QR-Codes mit Logo, Farbverläufen und
          eigenem Stil. Live-Vorschau, PNG- und SVG-Export — und Ziele, die du
          jederzeit ändern kannst, ohne den Code neu zu drucken.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-12 px-6 text-base"
            render={<Link href="/create" />}
          >
            QR-Code erstellen <ArrowRight className="size-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 px-6 text-base"
            render={<Link href="#features" />}
          >
            Funktionen ansehen
          </Button>
        </div>

        {/* Hero-QR-Mockup */}
        <div className="relative mt-16 w-full max-w-3xl">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-fuchsia-500/30 via-violet-500/30 to-cyan-400/30 blur-2xl" />
          <Card className="rounded-3xl border-border/60 bg-card/50 p-8 backdrop-blur-xl">
            <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
              <div className="mx-auto grid size-56 place-items-center rounded-2xl bg-white p-4 shadow-2xl shadow-violet-500/10">
                <DemoQr />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-violet-300">
                  Live-Vorschau
                </p>
                <h3 className="mt-1 text-2xl font-semibold">
                  So sehen deine Codes aus
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Wähle Farbverläufe, Punkt-Stile, Eckenformen und füge ein
                  Logo ein. Alles aktualisiert sich beim Tippen.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-6xl px-4 pb-24 sm:pb-32"
      >
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Alles, was ein QR-Code 2026 können sollte
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={<Palette className="size-5" />}
            title="Vollständig anpassbar"
            text="Farben, Verläufe, Punkt- und Eckenformen — pixelgenau auf deine Marke abgestimmt."
          />
          <Feature
            icon={<ImageIcon className="size-5" />}
            title="Logo in der Mitte"
            text="Lade dein Logo hoch und platziere es zentriert. Fehlerkorrektur passt sich automatisch an."
          />
          <Feature
            icon={<RefreshCw className="size-5" />}
            title="Dynamisch & änderbar"
            text="Der Code bleibt gleich, aber das Ziel kannst du jederzeit ändern — ideal für gedrucktes Material."
          />
          <Feature
            icon={<BarChart3 className="size-5" />}
            title="Scan-Statistiken"
            text="Sieh, wie oft jeder dynamische Code gescannt wurde — ohne externe Tracker."
          />
          <Feature
            icon={<Lock className="size-5" />}
            title="Selbst gehostet"
            text="Läuft auf deiner Infrastruktur, deine Daten bleiben bei dir. Kein Drittanbieter-Lock-in."
          />
          <Feature
            icon={<Sparkles className="size-5" />}
            title="PNG & SVG Export"
            text="Druckfertige Vektor-Exporte und hochauflösende PNGs in einem Klick."
          />
        </div>

        <div className="mt-16 flex flex-col items-center gap-4 rounded-3xl border border-border/60 bg-card/30 p-10 text-center backdrop-blur">
          <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Bereit, deinen ersten Code zu bauen?
          </h3>
          <p className="max-w-lg text-muted-foreground">
            Ohne Login, direkt im Browser. Speichern brauchst du nur, wenn du
            dynamische Codes mit änderbarem Ziel willst.
          </p>
          <Button
            size="lg"
            className="mt-2 h-12 px-6 text-base"
            render={<Link href="/create" />}
          >
            Jetzt erstellen <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card/40 p-6 backdrop-blur transition-colors hover:bg-card/60">
      <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 via-violet-500/20 to-cyan-400/20 text-violet-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}

// Statisches Demo-QR-SVG — rein dekorativ.
function DemoQr() {
  return (
    <svg
      viewBox="0 0 29 29"
      xmlns="http://www.w3.org/2000/svg"
      className="size-full"
      shapeRendering="crispEdges"
      aria-hidden
    >
      <defs>
        <linearGradient id="qrg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d946ef" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="29" height="29" fill="white" />
      {DEMO_QR_DOTS.map(([x, y], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width="1"
          height="1"
          fill="url(#qrg)"
          rx="0.25"
        />
      ))}
    </svg>
  );
}

const DEMO_QR_DOTS: [number, number][] = (() => {
  const out: [number, number][] = [];
  // Drei Finder-Patterns
  const finders = [
    [0, 0],
    [22, 0],
    [0, 22],
  ];
  for (const [fx, fy] of finders) {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++)
        if (
          x === 0 ||
          x === 6 ||
          y === 0 ||
          y === 6 ||
          (x >= 2 && x <= 4 && y >= 2 && y <= 4)
        )
          out.push([fx + x, fy + y]);
  }
  // pseudo-zufälliges Datenmuster (deterministisch)
  let s = 1;
  for (let y = 0; y < 29; y++) {
    for (let x = 0; x < 29; x++) {
      const inFinder =
        (x < 8 && y < 8) || (x > 20 && y < 8) || (x < 8 && y > 20);
      if (inFinder) continue;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      if ((s & 0xff) < 110) out.push([x, y]);
    }
  }
  return out;
})();
