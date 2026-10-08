import { NextResponse, type NextRequest } from "next/server";

// Set by the backend next to the auth cookies: only a "signed in" hint.
// The real check happens in the API; an expired session is sent back to "/".
const SESSION_COOKIE = "chat_session";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const start = new URL("/", request.url);
  start.searchParams.set("next", pathname + search);
  return NextResponse.redirect(start);
}

export const config = {
  // Signed-in pages only. Never "/" (it would match every path, /api included).
  matcher: ["/chat/:path*", "/profile/:path*"],
};
