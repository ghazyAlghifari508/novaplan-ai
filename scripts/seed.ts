/**
 * Seed script — creates a dev user account.
 * Run: npx tsx scripts/seed.ts
 *
 * Credentials saved in memory file for reference.
 */

import { createServerClient } from "@insforge/sdk/ssr";
import { config } from "dotenv";
import { resolve } from "path";

// Load env vars
config({ path: resolve(__dirname, "../.env.local") });

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL;
const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

const SEED_EMAIL = "devseed@novaplan.local";
const SEED_PASSWORD = "DevSeed123!";
const SEED_MODE = process.argv.includes("--reset") ? "reset" : "create";

async function main() {
  if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
    console.error("Missing INSFORGE env vars in .env.local");
    process.exit(1);
  }

  const client = createServerClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
  });

  if (SEED_MODE === "create") {
    const { data, error } = await client.auth.signUp({
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
    });

    if (error) {
      if (error.message?.includes("already exists")) {
        console.log(`ℹ️  User ${SEED_EMAIL} already exists. Use --reset to recreate.`);
      } else {
        console.error("Sign-up failed:", error.message);
        process.exit(1);
      }
    } else {
      console.log(`✅ Created seed user: ${SEED_EMAIL}`);
      console.log(`   Password: ${SEED_PASSWORD}`);
      if (data.requireEmailVerification) {
        console.log("⚠️  Email verification required — check the InsForge dashboard.");
      }
    }
  } else if (SEED_MODE === "reset") {
    console.log("Reset mode: delete user via InsForge admin dashboard then re-run without --reset");
  }

  // Write memory file
  const fs = await import("fs");
  const memPath = resolve(__dirname, "../.claude/projects/C--Coding-Web-Development-Next-novaplan-ai/memory/dev-seed-account.md");
  const memDir = resolve(memPath, "..");
  if (!fs.existsSync(memDir)) fs.mkdirSync(memDir, { recursive: true });
  fs.writeFileSync(memPath, `---
name: dev-seed-account
description: Seed account for UI testing in dev environment
metadata:
  type: reference
---

# Dev Seed Account

| Field    | Value                |
|----------|----------------------|
| Email    | ${SEED_EMAIL}        |
| Password | ${SEED_PASSWORD}     |
| Purpose  | UI testing / visual audit via ECC Chrome DevTools |

Created by \`scripts/seed.ts\`.
`);
  console.log(`📝 Saved to memory: ${memPath}`);
}

main().catch(console.error);
