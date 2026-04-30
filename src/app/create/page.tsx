import { QrCreator } from "@/components/qr-creator";
import { getCurrentUser } from "@/lib/auth";

export const metadata = {
  title: "QR-Code erstellen",
  description:
    "Statische, dynamische und Batch-QR-Codes mit Logo, Markenfarben und Export erstellen.",
};

export default async function CreatePage() {
  const user = await getCurrentUser();

  return (
    <div className="bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_45%,transparent))]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-col gap-4 rounded-lg border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur sm:p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-primary">Generator</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              QR-Codes gestalten, speichern und exportieren
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              Statisch für direkte Inhalte, dynamisch für bearbeitbare Kurzlinks,
              Batch für viele Zielseiten auf einmal.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground sm:min-w-80">
            <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
              <span className="block text-sm font-semibold text-foreground">7</span>
              Typen
            </div>
            <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
              <span className="block text-sm font-semibold text-foreground">4K</span>
              Export
            </div>
            <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
              <span className="block text-sm font-semibold text-foreground">100</span>
              Batch
            </div>
          </div>
        </div>
        <QrCreator isAuthenticated={Boolean(user)} />
      </div>
    </div>
  );
}
