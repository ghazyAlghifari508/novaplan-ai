import { createHmac } from "crypto";

const THREE_HOURS_SECONDS = 60 * 60 * 3;

type SessionUser = {
  id: string;
  email?: string | null;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return {};

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function signJwt(payload: Record<string, unknown>, secret: string) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  return `${encodedHeader}.${encodedPayload}.${base64UrlEncode(signature)}`;
}

export function createExtendedAuthTokens(tokens: AuthTokens, user: SessionUser): AuthTokens {
  const jwtSecret = process.env.INSFORGE_JWT_SECRET;

  if (!jwtSecret) {
    return tokens;
  }

  const now = Math.floor(Date.now() / 1000);
  const sourcePayload = decodeJwtPayload(tokens.accessToken);
  const payload = {
    ...sourcePayload,
    sub: user.id,
    email: user.email ?? sourcePayload.email,
    role: sourcePayload.role ?? "authenticated",
    iat: now,
    exp: now + THREE_HOURS_SECONDS,
  };

  return {
    accessToken: signJwt(payload, jwtSecret),
    refreshToken: tokens.refreshToken,
  };
}

export const EXTENDED_SESSION_SECONDS = THREE_HOURS_SECONDS;
