import { updateSession, type CookieOptions, type CookieStore } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/pricing"];
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  await updateSession({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    requestCookies: createRequestCookieStore(request),
    responseCookies: createResponseCookieStore(response),
  });

  const token = request.cookies.get("insforge_access_token")?.value;
  const isAuthenticated = token ? isTokenValid(token) : false;

  const pathname = request.nextUrl.pathname;

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/prd/share/")
  );

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (!isAuthenticated && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

/**
 * Lightweight JWT expiry check (no signature verification — that's done server-side).
 */
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return true; // Assume opaque token is valid and let the backend verify it!
    }
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    // If we can't parse it, maybe it's not a JWT. Let the backend handle it!
    return true; 
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

function createRequestCookieStore(request: NextRequest): CookieStore {
  return {
    get: (name: string) => request.cookies.get(name),
    set: (
      nameOrOptions: string | ({ name: string; value: string } & CookieOptions),
      value?: string,
    ) => {
      if (typeof nameOrOptions === "string") {
        request.cookies.set(nameOrOptions, value ?? "");
        return;
      }

      request.cookies.set(nameOrOptions.name, nameOrOptions.value);
    },
    delete: (nameOrOptions: string | ({ name: string } & CookieOptions)) => {
      request.cookies.delete(
        typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name,
      );
    },
  };
}

function createResponseCookieStore(response: NextResponse): CookieStore {
  return {
    get: (name: string) => response.cookies.get(name),
    set: (
      nameOrOptions: string | ({ name: string; value: string } & CookieOptions),
      value?: string,
      options?: CookieOptions,
    ) => {
      if (typeof nameOrOptions === "string") {
        response.cookies.set(nameOrOptions, value ?? "", options);
        return;
      }

      response.cookies.set(nameOrOptions);
    },
    delete: (nameOrOptions: string | ({ name: string } & CookieOptions)) => {
      response.cookies.delete(
        typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name,
      );
    },
  };
}
