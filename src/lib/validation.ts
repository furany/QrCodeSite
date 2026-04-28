export function parseHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function parseTitle(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "string") return null;

  const title = value.trim();
  return title ? title.slice(0, 120) : null;
}
