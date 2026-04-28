export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const firstResponse = await fetchWithStoredPassword(input, init);
  if (firstResponse.status !== 401 || typeof window === "undefined") {
    return firstResponse;
  }

  const password = window.prompt("Admin-Passwort");
  if (!password) return firstResponse;

  window.sessionStorage.setItem("qrft_admin_password", password);
  return fetchWithStoredPassword(input, init, password);
}

function fetchWithStoredPassword(
  input: RequestInfo | URL,
  init: RequestInit,
  password = getStoredPassword(),
) {
  const headers = new Headers(init.headers);
  if (password) {
    headers.set("Authorization", `Basic ${btoa(`admin:${password}`)}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

function getStoredPassword() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("qrft_admin_password");
}
