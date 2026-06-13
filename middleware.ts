import { updateSession, type CookieOptions } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_REFRESH_LEEWAY_SECONDS, authCookieSettings } from "@/lib/insforge/auth-cookies";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/pricing"];
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const sessionResult = await updateSession({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    refreshLeewaySeconds: AUTH_REFRESH_LEEWAY_SECONDS,
    ...authCookieSettings,
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

  const isAuthenticated = Boolean(sessionResult.accessToken);

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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
