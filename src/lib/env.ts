const LOCAL_BASE_URL = "http://localhost:3000";

export function getBaseUrl(requestUrl?: string) {
  const configured =
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    dokployDeployUrl();

  if (configured) return normalizeBaseUrl(configured);
  if (requestUrl) return new URL(requestUrl).origin;
  return LOCAL_BASE_URL;
}

function dokployDeployUrl() {
  const domain = process.env.DOKPLOY_DEPLOY_URL;
  return domain;
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return LOCAL_BASE_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
