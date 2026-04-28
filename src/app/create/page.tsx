import { QrCreator } from "@/components/qr-creator";

export const metadata = {
  title: "QR-Code erstellen",
  description:
    "Statische und dynamische QR-Codes mit Logo, Farben und Export erstellen.",
};

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-6 max-w-2xl">
        <p className="text-sm font-medium text-primary">Generator</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          QR-Code erstellen
        </h1>
        <p className="mt-2 text-muted-foreground">
          Wähle Inhalt, Stil und Exportformat. Dynamische Codes werden als
          Kurzlink gespeichert.
        </p>
      </div>
      <QrCreator />
    </div>
  );
}
