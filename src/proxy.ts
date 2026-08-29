import { NextResponse, type NextRequest } from "next/server";

/**
 * Hides the admin area from everyone who does not know it is there.
 *
 * This is concealment, not authentication — Supabase Auth and the
 * STAFF_ALLOWED_EMAILS allowlist are what actually protect the data, and they
 * are enforced on every admin API call regardless of what happens here. What
 * this adds is that a visitor, a crawler, or someone poking at URLs cannot tell
 * an admin section exists at all: /admin and everything under it returns the
 * ordinary 404 page, byte for byte, unless the browser has been let in.
 *
 * Getting in: visit /<ADMIN_SECRET_PATH> once. That sets a long-lived cookie
 * and forwards to the client list. The secret never reaches the browser bundle
 * — it is a server-only env var read here.
 */

const GATE_COOKIE = "obs_s";
const GATE_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

/** Constant-time compare, so the cookie cannot be guessed a character at a time. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * The 404 a stranger sees. Rewriting to a path that does not exist renders the
 * site's own not-found page with a 404 status, so a hidden admin and a genuine
 * typo are indistinguishable from the outside.
 */
function notFound(request: NextRequest): NextResponse {
  return NextResponse.rewrite(new URL("/_obsidian_404", request.url));
}

export function proxy(request: NextRequest): NextResponse {
  const secret = process.env.ADMIN_SECRET_PATH?.trim();
  const { pathname } = request.nextUrl;

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!secret) {
    // Fails closed. An unset secret must not mean "admin is public" — that is
    // the exact failure this exists to prevent. See docs/client-tracker.md.
    if (isAdmin) {
      console.warn(
        "ADMIN_SECRET_PATH is not set — the admin area is hidden and unreachable."
      );
      return notFound(request);
    }
    return NextResponse.next();
  }

  // The way in.
  if (pathname === `/${secret}`) {
    const response = NextResponse.redirect(new URL("/admin/clients", request.url));
    response.cookies.set(GATE_COOKIE, secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: GATE_MAX_AGE_SECONDS,
    });
    return response;
  }

  if (isAdmin) {
    const cookie = request.cookies.get(GATE_COOKIE)?.value ?? "";
    if (!safeEqual(cookie, secret)) return notFound(request);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except API routes and static assets. The secret path could be
  // anything, so it cannot be named in a static matcher.
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|icon.png|opengraph-image|robots.txt|sitemap.xml).*)",
  ],
};
