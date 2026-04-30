// QR-Code generators for supported content types.

import { createRuntimeId } from "@/lib/runtime-id";

export type QrType = "url" | "vcard" | "wifi" | "sms" | "email" | "tel" | "event";

export interface QrTypeConfig {
  label: string;
  description: string;
  icon: string;
  example: string;
}

export const QR_TYPES: Record<QrType, QrTypeConfig> = {
  url: {
    label: "Website",
    description: "Link zu Website, Landingpage oder Datei",
    icon: "link",
    example: "https://example.com",
  },
  vcard: {
    label: "Kontakt",
    description: "Digitale Visitenkarte mit Kontakt- und Adressdaten",
    icon: "contact",
    example: "Max Mustermann | max@example.com | +49 123 456789",
  },
  wifi: {
    label: "WLAN",
    description: "WLAN-Zugang mit WPA, WPA3, WEP oder offenem Netz",
    icon: "wifi",
    example: "Studio WiFi | WPA3 | Passwort123",
  },
  sms: {
    label: "SMS",
    description: "Vorausgefüllte Textnachricht",
    icon: "message",
    example: "+49123456789 | Hallo!",
  },
  email: {
    label: "E-Mail",
    description: "Mailto-Link mit Betreff und Nachricht",
    icon: "mail",
    example: "contact@example.com | Hallo",
  },
  tel: {
    label: "Telefon",
    description: "Direkter Anruf",
    icon: "phone",
    example: "+49123456789",
  },
  event: {
    label: "Event",
    description: "Kalendereintrag für Termine und Veranstaltungen",
    icon: "calendar",
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
      return emailQrData(data);

    case "sms":
      return `smsto:${data.phone}${data.message ? `:${encodeURIComponent(data.message)}` : ""}`;

    case "wifi":
      return wifiQrData(data);

    case "vcard":
      return vcardQrData(data);

    case "event": {
      const start = data.startDate ? formatDateForIcal(data.startDate, data.startTime) : "";
      const end = data.endDate ? formatDateForIcal(data.endDate, data.endTime) : "";
      const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Qrft//QR Code Events//DE",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${createRuntimeId("event")}`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
        `SUMMARY:${icalEscape(data.title || "Event")}`,
        start ? `DTSTART:${start}` : null,
        end ? `DTEND:${end}` : null,
        data.location ? `LOCATION:${icalEscape(data.location)}` : null,
        data.description ? `DESCRIPTION:${icalEscape(data.description)}` : null,
        "END:VEVENT",
        "END:VCALENDAR",
      ];
      return lines.filter(Boolean).join("\n");
    }

    default:
      return "";
  }
}

export function validateQrData(
  type: QrType,
  data: Record<string, string>,
): string | null {
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
      if (!data.ssid?.trim()) {
        return "SSID ist erforderlich.";
      }
      if (!isValidWifiSecurity(data.security)) {
        return "Bitte wähle eine gültige WLAN-Sicherheit aus.";
      }
      if (wifiRequiresPassword(data.security) && !data.password) {
        return "Passwort ist erforderlich.";
      }
      break;

    case "vcard":
      if (!displayName(data).trim()) {
        return "Name oder Vor-/Nachname ist erforderlich.";
      }
      if (data.email && !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return "Die vCard-E-Mail-Adresse ist ungültig.";
      }
      if (data.url && !data.url.match(/^https?:\/\//i)) {
        return "Die vCard-Website muss mit http:// oder https:// beginnen.";
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

export function vcardQrData(data: Record<string, string>) {
  const fullName = displayName(data);
  const lastName = data.lastName || "";
  const firstName = data.firstName || "";
  const addressParts = [
    "",
    "",
    data.street || "",
    data.city || "",
    data.region || "",
    data.postalCode || "",
    data.country || "",
  ];
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${vcardEscape(lastName)};${vcardEscape(firstName)};;;`,
    `FN:${vcardEscape(fullName)}`,
    data.org
      ? `ORG:${vcardEscape(data.org)}${data.department ? `;${vcardEscape(data.department)}` : ""}`
      : null,
    data.jobTitle ? `TITLE:${vcardEscape(data.jobTitle)}` : null,
    data.phone ? `TEL;TYPE=CELL:${vcardEscape(data.phone)}` : null,
    data.workPhone ? `TEL;TYPE=WORK:${vcardEscape(data.workPhone)}` : null,
    data.email ? `EMAIL;TYPE=INTERNET:${vcardEscape(data.email)}` : null,
    data.url ? `URL:${vcardEscape(data.url)}` : null,
    addressParts.some(Boolean)
      ? `ADR;TYPE=WORK:${addressParts.map(vcardEscape).join(";")}`
      : null,
    data.birthday ? `BDAY:${data.birthday.replace(/-/g, "")}` : null,
    data.note ? `NOTE:${vcardEscape(data.note)}` : null,
    "END:VCARD",
  ];
  return lines.filter(Boolean).join("\n");
}

export function wifiQrData(data: Record<string, string>) {
  const security = normalizeWifiSecurity(data.security);
  const hidden = data.hidden === "true" ? "true" : "false";
  const password = wifiRequiresPassword(security) ? data.password || "" : "";
  return `WIFI:T:${security};S:${wifiEscape(data.ssid || "")};P:${wifiEscape(password)};H:${hidden};;`;
}

export function normalizeWifiSecurity(value?: string) {
  if (value === "open" || value === "nopass") return "nopass";
  if (value === "WEP") return "WEP";
  if (value === "WPA2") return "WPA2";
  if (value === "WPA3") return "WPA3";
  if (value === "WPA2-WPA3") return "WPA2-WPA3";
  return "WPA";
}

export function wifiRequiresPassword(value?: string) {
  return normalizeWifiSecurity(value) !== "nopass";
}

function isValidWifiSecurity(value?: string) {
  return [
    "WPA",
    "WPA2",
    "WPA3",
    "WPA2-WPA3",
    "WEP",
    "nopass",
    "open",
    undefined,
    "",
  ].includes(value);
}

function emailQrData(data: Record<string, string>) {
  const params = new URLSearchParams();
  if (data.subject) params.set("subject", data.subject);
  if (data.body) params.set("body", data.body);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return `mailto:${data.email}${suffix}`;
}

function displayName(data: Record<string, string>) {
  return (
    data.name ||
    [data.firstName, data.lastName].filter(Boolean).join(" ") ||
    ""
  );
}

function formatDateForIcal(date: string, time?: string): string {
  const dateStr = date.replace(/-/g, "");
  if (!time) return dateStr;
  const timeStr = time.replace(/:/g, "");
  return `${dateStr}T${timeStr}00`;
}

function vcardEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function wifiEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/:/g, "\\:")
    .replace(/"/g, '\\"');
}

function icalEscape(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
