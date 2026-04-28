import { QrCreator } from "@/components/qr-creator";

export const metadata = {
  title: "QR-Code erstellen — Qrft",
};

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          QR-Code erstellen
        </h1>
        <p className="mt-2 text-muted-foreground">
          Statisch für direkte Inhalte, dynamisch wenn du das Ziel später
          ändern willst.
        </p>
      </div>
      <QrCreator />
    </div>
  );
}
