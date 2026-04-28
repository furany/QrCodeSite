// QR-Code Generators für verschiedene Datentypen

export type QrType = "url" | "vcard" | "wifi" | "sms" | "email" | "tel" | "event";

export interface QrTypeConfig {
  label: string;
  description: string;
  icon: string;
  example: string;
}

export const QR_TYPES: Record<QrType, QrTypeConfig> = {
  url: {
    label: "URL/Website",
    description: "Link zu einer Website",
    icon: "🔗",
    example: "https://example.com",
  },
  vcard: {
    label: "Kontakt (vCard)",
    description: "Visitenkarte – Name, Email, Telefon",
    icon: "👤",
    example: "Max Mustermann | max@example.com",
  },
  wifi: {
    label: "WiFi-Netzwerk",
    description: "WLAN mit Passwort",
    icon: "📶",
    example: "MyNetwork | Passwort123",
  },
  sms: {
    label: "SMS/Nachricht",
    description: "Vordefinierte Textnachricht",
    icon: "💬",
    example: "+49123456789 | Hallo!",
  },
  email: {
    label: "E-Mail",
    description: "Mailto-Link mit Betreff",
    icon: "✉️",
    example: "contact@example.com | Hallo",
  },
  tel: {
    label: "Telefon",
    description: "Direkter Anruf",
    icon: "☎️",
    example: "+49123456789",
  },
  event: {
    label: "Kalender-Event",
    description: "iCalendar-Eintrag",
    icon: "📅",
    example: "Konferenz | 2026-05-15",
  },
};

export function generateQrData(
  type: QrType,
  data: Record<string, string>,
): string {
  switch (type) {
    case "url":
      return data.url || "";

    case "tel":
      return `tel:${data.phone}`;

    case "email":
      return `mailto:${data.email}${data.subject ? `?subject=${encodeURIComponent(data.subject)}` : ""}${data.body ? `&body=${encodeURIComponent(data.body)}` : ""}`;

    case "sms":
      return `smsto:${data.phone}${data.message ? `:${encodeURIComponent(data.message)}` : ""}`;

    case "wifi": {
      const security = data.security || "WPA";
      const hidden = data.hidden === "true" ? "true" : "false";
      return `WIFI:T:${security};S:${data.ssid};P:${data.password};H:${hidden};;`;
    }

    case "vcard": {
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${data.name || ""}`,
        data.org ? `ORG:${data.org}` : null,
        data.phone ? `TEL:${data.phone}` : null,
        data.email ? `EMAIL:${data.email}` : null,
        data.url ? `URL:${data.url}` : null,
        "END:VCARD",
      ];
      return lines.filter(Boolean).join("\n");
    }

    case "event": {
      const start = data.startDate ? formatDateForIcal(data.startDate, data.startTime) : "";
      const end = data.endDate ? formatDateForIcal(data.endDate, data.endTime) : "";
      const lines = [
        "BEGIN:VEVENT",
        `SUMMARY:${data.title || "Event"}`,
        start ? `DTSTART:${start}` : null,
        end ? `DTEND:${end}` : null,
        data.location ? `LOCATION:${data.location}` : null,
        data.description ? `DESCRIPTION:${data.description}` : null,
        "END:VEVENT",
      ];
      return lines.filter(Boolean).join("\n");
    }

    default:
      return "";
  }
}

function formatDateForIcal(date: string, time?: string): string {
  const d = new Date(date);
  const dateStr = d.toISOString().split("T")[0].replace(/-/g, "");
  if (!time) return dateStr;
  const timeStr = time.replace(/:/g, "");
  return `${dateStr}T${timeStr}00Z`;
}

// Validierung
export function validateQrData(type: QrType, data: Record<string, string>): string | null {
  switch (type) {
    case "url":
      if (!data.url || !data.url.match(/^https?:\/\//i)) {
        return "Bitte gib eine gültige http(s)-URL ein.";
      }
      break;

    case "tel":
    case "sms":
      if (!data.phone || !data.phone.match(/^\+?[0-9\s\-()]{7,}$/)) {
        return "Bitte gib eine gültige Telefonnummer ein.";
      }
      break;

    case "email":
      if (!data.email || !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return "Bitte gib eine gültige E-Mail-Adresse ein.";
      }
      break;

    case "wifi":
      if (!data.ssid) {
        return "SSID ist erforderlich.";
      }
      if (data.security !== "open" && !data.password) {
        return "Passwort ist erforderlich.";
      }
      break;

    case "vcard":
      if (!data.name) {
        return "Name ist erforderlich.";
      }
      break;

    case "event":
      if (!data.title || !data.startDate) {
        return "Titel und Startdatum sind erforderlich.";
      }
      break;
  }

  return null;
}
