export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);

  return fetch(input, {
    ...init,
    headers,
  });
}
