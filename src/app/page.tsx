import Link from "next/link";
import {
  BarChart3,
  Download,
  Link2,
  Palette,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { QrCreator } from "@/components/qr-creator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-primary">
                QR-Code Generator
              </p>
              <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">
                Qrft
              </h1>
              <p className="mt-3 text-lg leading-8 text-muted-foreground">
                Erstelle statische QR-Codes direkt im Browser oder speichere
                dynamische Kurzlinks, deren Ziel du später ändern kannst.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-10" render={<Link href="/dashboard" />}>
                Dashboard
              </Button>
              <Button className="h-10" render={<Link href="#features" />}>
                Details
              </Button>
            </div>
          </div>
          <QrCreator />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="mb-6 max-w-2xl">
          <p className="text-sm font-medium text-primary">
            Bereit für Produktion
          </p>
          <h2 className="mt-2 text-3xl font-semibold">
            Alles Wichtige ohne externen QR-Dienst
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={<Palette className="size-5" />}
            title="Markenfarben"
            text="Farben, Ecken, Punktformen und Logo passen sich an deine Vorlage an."
          />
          <Feature
            icon={<RefreshCw className="size-5" />}
            title="Dynamische Ziele"
            text="Gedruckte Codes bleiben gleich, während sich die Ziel-URL ändern lässt."
          />
          <Feature
            icon={<BarChart3 className="size-5" />}
            title="Scan-Zähler"
            text="Jeder Redirect aktualisiert die Statistik direkt in deiner Postgres-Datenbank."
          />
          <Feature
            icon={<Download className="size-5" />}
            title="PNG und SVG"
            text="Exports für schnelle Downloads, Druckdaten und Web-Einsatz."
          />
          <Feature
            icon={<ShieldCheck className="size-5" />}
            title="Admin-Schutz"
            text="Dashboard und Management-API können mit einem Passwort geschützt werden."
          />
          <Feature
            icon={<Link2 className="size-5" />}
            title="Eigene Domain"
            text="Kurzlinks nutzen deine Dokploy- oder Custom-Domain statt fremder Tracking-URLs."
          />
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
    <Card className="border-border bg-card p-5 shadow-sm">
      <div className="mb-4 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </Card>
  );
}
