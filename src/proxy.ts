import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || hasValidBasicAuth(request, adminPassword)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Qrft Admin", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

function hasValidBasicAuth(request: NextRequest, expectedPassword: string) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  try {
    const credentials = atob(header.slice("Basic ".length));
    const separator = credentials.indexOf(":");
    const password = separator >= 0 ? credentials.slice(separator + 1) : "";
    return password === expectedPassword;
  } catch {
    return false;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/qr/:path*"],
};
