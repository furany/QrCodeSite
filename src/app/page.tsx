import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  Link2,
  Palette,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const BENEFITS = [
  {
    icon: <Palette className="size-5" />,
    title: "Markenfarben",
    text: "Farben, Ecken, Punktformen und Logo passen sich an deine Vorlage an.",
  },
  {
    icon: <RefreshCw className="size-5" />,
    title: "Dynamische Ziele",
    text: "Gedruckte Codes bleiben gleich, während sich die Ziel-URL ändern lässt.",
  },
  {
    icon: <BarChart3 className="size-5" />,
    title: "Scan-Zähler",
    text: "Jeder Redirect aktualisiert die Statistik direkt in deiner Datenbank.",
  },
  {
    icon: <Download className="size-5" />,
    title: "PNG und SVG",
    text: "Exports für schnelle Downloads, Druckdaten und Web-Einsatz.",
  },
  {
    icon: <ShieldCheck className="size-5" />,
    title: "Admin-Schutz",
    text: "Dashboard und Management-API können mit einem Passwort geschützt werden.",
  },
  {
    icon: <Link2 className="size-5" />,
    title: "Eigene Domain",
    text: "Kurzlinks nutzen deine Domain statt fremder Tracking-URLs.",
  },
];

const FAQS = [
  {
    question: "Was ist der Unterschied zwischen statischen und dynamischen QR-Codes?",
    answer:
      "Statische QR-Codes enthalten den finalen Inhalt direkt im Code. Dynamische QR-Codes zeigen auf einen Kurzlink, dessen Ziel später geändert werden kann.",
  },
  {
    question: "Kann ich einen QR-Code mit Logo erstellen?",
    answer:
      "Ja. Du kannst ein PNG, JPG oder SVG als Logo hochladen. Für Druckdaten empfiehlt sich danach ein Testscan mit dem finalen Material.",
  },
  {
    question: "Welche Exportformate unterstützt Qrft?",
    answer:
      "Qrft exportiert QR-Codes als PNG oder SVG. Für Druck kannst du hohe PNG-Auflösungen oder den SVG-Export nutzen.",
  },
  {
    question: "Werden Scan-Daten an externe Tracker gesendet?",
    answer:
      "Nein. Dynamische Scan-Zähler werden direkt in deiner eigenen Postgres-Datenbank gespeichert.",
  },
];

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Qrft",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "QR-Code Generator für statische QR-Codes, dynamische Kurzlinks, Logo-Designs und Scan-Statistiken.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative border-b border-border bg-gradient-to-b from-primary/5 to-transparent py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Zap className="size-3.5" /> QR-Code Generator
              </p>
              <h1 className="mb-4 text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
                QR-Codes für dein Business
              </h1>
              <p className="mb-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Erstelle statische QR-Codes direkt im Browser oder speichere
                dynamische Kurzlinks, deren Ziel du später ändern kannst. Mit
                Logos, Farben und Scan-Statistiken.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" render={<Link href="/create" />}>
                  QR-Code erstellen
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  render={<Link href="#features" />}
                >
                  Funktionen ansehen
                </Button>
              </div>
            </div>

            {/* Lightweight product preview */}
            <div className="w-full lg:max-w-sm lg:flex-shrink-0">
              <div className="glass-md overflow-hidden p-5 shadow-glow sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      Design-Vorschau
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Farben, Logo und Tracking in einem Workflow
                    </p>
                  </div>
                  <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <QrCode className="size-5" />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="grid aspect-square place-items-center rounded-xl bg-white p-6 shadow-inner">
                    <QrCode className="size-40 text-slate-950 sm:size-48" />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm">
                    {[
                      "Dynamische URLs bearbeiten",
                      "vCard, WLAN, Events und mehr",
                      "PNG, SVG und Scan-Analytics",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-primary" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  className="mt-5 w-full"
                  size="lg"
                  render={<Link href="/create" />}
                >
                  Creator öffnen
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium text-primary">Bereit für Produktion</p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Alles Wichtige ohne externen QR-Dienst
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((benefit) => (
              <Card
                key={benefit.title}
                className="glass p-5 shadow-glow transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20"
              >
                <div className="mb-4 grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  {benefit.icon}
                </div>
                <h3 className="mb-2 font-semibold">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="glass-md mx-auto max-w-2xl p-8 text-center sm:p-10">
            <h2 className="mb-3 text-2xl font-semibold sm:text-3xl">
              Kostenlös, selbst gehostet, unbegrenzt
            </h2>
            <p className="mb-6 text-muted-foreground">
              Keine Limits, keine Tracking-Pixels, deine Daten bleiben bei dir.
              Starte jetzt kostenlos ohne Kreditkarte.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" render={<Link href="/create" />}>
                Ersten Code erstellen
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/register" />}
              >
                Konto anlegen
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium text-primary">FAQ</p>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Häufig gestellte Fragen
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FAQS.map((item) => (
              <Card
                key={item.question}
                className="glass p-6 shadow-glow transition-all hover:border-primary/50"
              >
                <h3 className="mb-3 font-semibold">{item.question}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-border bg-muted/30 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <p className="mb-2 text-sm font-medium text-primary">Bereit?</p>
          <h2 className="mb-4 text-2xl font-semibold">
            Erstelle deinen ersten QR-Code
          </h2>
          <p className="mb-6 text-muted-foreground">
            Keine Registrierung nötig für statische Codes.
          </p>
          <Button size="lg" render={<Link href="/create" />}>
            Jetzt starten
          </Button>
        </div>
      </section>
    </div>
  );
}
