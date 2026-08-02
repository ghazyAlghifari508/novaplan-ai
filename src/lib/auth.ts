import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db";
import {
  accounts,
  quotas,
  sessions,
  subscriptions,
  users,
  verifications,
} from "@/db/schema";
import { PLAN_LIMITS } from "@/types/database";

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
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const freeLimits = PLAN_LIMITS.free;
          await db.insert(subscriptions).values({
            id: crypto.randomUUID(),
            userId: user.id,
            plan: "free",
            status: "active",
          });
          await db.insert(quotas).values({
            id: crypto.randomUUID(),
            userId: user.id,
            prdUsed: 0,
            prdLimit: freeLimits.prd,
            revisionUsed: 0,
            revisionLimit: freeLimits.revision,
          });
        },
      },
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    // ponytail: placeholder — gh CLI token lacks OAuth-App scope to auto-provision.
    // Create at github.com/settings/developers, then fill real values in .env.
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "placeholder",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "placeholder",
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
