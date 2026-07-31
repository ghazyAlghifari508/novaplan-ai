import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db";
import {
  accounts,
  sessions,
  users,
  verifications,
} from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema: {
      users,
      sessions,
      accounts,
      verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // ponytail: dev logs reset link; wire Resend when email infra lands
    sendResetPassword: async ({ user, url }) => {
      console.log(`[auth] reset password for ${user.email}: ${url}`);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      fullName: { type: "string", required: false, input: true },
      company: { type: "string", required: false, input: true },
      role: { type: "string", required: false, input: false },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min - skip DB query per request
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
  // tanstackStartCookies MUST be last plugin
  plugins: [tanstackStartCookies()],
});
