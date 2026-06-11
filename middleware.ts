import { updateSession, type CookieOptions } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/pricing"];
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const sessionResult = await updateSession({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    requestCookies: {
      get: (name) => request.cookies.get(name),
      set: (nameOrOptions: string | ({ name: string; value: string } & CookieOptions), value?: string) => {
        let name = typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name;
        let val = typeof nameOrOptions === "string" ? (value ?? "") : nameOrOptions.value;
        request.cookies.set(name, val);
        // Re-create the response so the updated request.cookies are passed to Server Components
        response = NextResponse.next({ request });
      },
      delete: (nameOrOptions: string | ({ name: string } & CookieOptions)) => {
        let name = typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name;
        request.cookies.delete(name);
        response = NextResponse.next({ request });
      }
    },
    responseCookies: {
      get: (name) => response.cookies.get(name),
      set: (nameOrOptions: string | ({ name: string; value: string } & CookieOptions), value?: string, options?: CookieOptions) => {
        if (typeof nameOrOptions === "string") {
          response.cookies.set(nameOrOptions, value ?? "", options);
        } else {
          response.cookies.set(nameOrOptions);
        }
      },
      delete: (nameOrOptions: string | ({ name: string } & CookieOptions)) => {
        response.cookies.delete(typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name);
      }
    },
  });

  const token = sessionResult.accessToken ?? request.cookies.get("insforge_access_token")?.value;
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
 * Lightweight JWT expiry check
 */
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return true; 
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
