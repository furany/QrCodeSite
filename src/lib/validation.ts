export function parseHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(normalizeUrlInput(value));
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function parseTitle(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "string") return null;

  const title = value.trim();
  return title ? title.slice(0, 120) : null;
}

export function parseCode(value: unknown) {
  if (typeof value !== "string") return null;

  const code = value.trim().toLowerCase();
  if (!code) return null;
  if (!/^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$/.test(code)) return null;
  if (code.startsWith("api") || code === "dashboard" || code === "create") {
    return null;
  }
  return code;
}

export function parseNullableDate(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}
