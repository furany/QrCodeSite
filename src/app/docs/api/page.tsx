import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "API Dokumentation",
  description: "REST API für QR-Code-Verwaltung",
};

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">Entwickler</p>
        <h1 className="text-4xl font-semibold">API Dokumentation</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Integriere QR-Code-Generierung in deine Anwendungen mit unserer REST API.
        </p>
      </div>

      <div className="mb-8 rounded-lg border border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4">
        <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          🚀 API ist noch in Entwicklung
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Die vollständige REST API wird in den nächsten Updates verfügbar sein.
          API Keys können bereits erstellt werden.
        </p>
      </div>

      <div className="grid gap-6 mb-8">
        <Card className="border-border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
          <p className="text-muted-foreground mb-4">
            Alle API-Anfragen müssen mit einem API Key authentifiziert werden.
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto mb-4">
            {`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://qrft.example.com/api/qr`}
          </pre>
          <p className="text-sm text-muted-foreground">
            API Keys können in deinen{" "}
            <Link href="/dashboard/settings" className="text-primary hover:underline">
              Einstellungen
            </Link>{" "}
            generiert werden.
          </p>
        </Card>

        <Card className="border-border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">
            QR Codes erstellen (kommt bald)
          </h2>
          <p className="text-muted-foreground mb-4">
            Erstelle QR-Codes programmgesteuert mit verschiedenen Typen und Optionen.
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto">
            {`POST /api/qr
{
  "targetUrl": "https://example.com",
  "title": "My QR Code",
  "type": "url",
  "expiresAt": "2026-12-31T23:59:59Z"
}`}
          </pre>
        </Card>

        <Card className="border-border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">QR Codes abrufen (kommt bald)</h2>
          <p className="text-muted-foreground mb-4">
            Rufe Informationen über deine QR-Codes ab, einschließlich Scan-Statistiken.
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto">
            {`GET /api/qr
GET /api/qr/ABC123
GET /api/qr?limit=50&offset=0`}
          </pre>
        </Card>

        <Card className="border-border bg-card p-6">
          <h2 className="text-2xl font-semibold mb-4">
            QR Codes aktualisieren (kommt bald)
          </h2>
          <p className="text-muted-foreground mb-4">
            Ändere Ziel-URL, Titel und Ablaufdatum bestehender QR-Codes.
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto">
            {`PATCH /api/qr/ABC123
{
  "targetUrl": "https://new-url.com",
  "title": "Updated Title"
}`}
          </pre>
        </Card>
      </div>

      <Card className="border-border bg-card p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Webhook Events (kommt bald)</h2>
        <p className="text-muted-foreground mb-4">
          Erhalte Benachrichtigungen über Scan-Events in Echtzeit.
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• <code>qr.scanned</code> - QR-Code wurde gescannt</li>
          <li>• <code>qr.created</code> - Neuer QR-Code erstellt</li>
          <li>• <code>qr.expired</code> - QR-Code ist abgelaufen</li>
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card p-4">
          <h3 className="font-semibold mb-2">SDK & Libraries</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Einfache Clients für deine bevorzugte Programmiersprache.
          </p>
          <Button variant="outline" size="sm" disabled>
            Python SDK (kommt bald)
          </Button>
        </Card>

        <Card className="border-border bg-card p-4">
          <h3 className="font-semibold mb-2">Beispiele & Tutorials</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Lerne mit praktischen Beispielen und Best Practices.
          </p>
          <Button variant="outline" size="sm" disabled>
            Tutorials (kommt bald)
          </Button>
        </Card>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-muted/40 p-6 text-center">
        <p className="text-muted-foreground mb-4">
          Noch Fragen oder Feedback? Kontaktiere uns!
        </p>
        <Button render={<Link href="/" />}>
          Zur Startseite
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}
