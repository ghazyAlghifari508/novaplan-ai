import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SEED_EMAIL = process.env.SEED_EMAIL ?? "dev@novaplan.local";
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "devpassword123";
const SEED_MODE = process.argv[2];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env vars");
    process.exit(1);
  }

  if (SEED_MODE === "reset") {
    const { data: users } = await supabase.auth.admin.listUsers();
    const existing = users.users.find((u) => u.email === SEED_EMAIL);
    if (existing) {
      await supabase.auth.admin.deleteUser(existing.id);
      console.log(`🗑️  Deleted existing seed user: ${SEED_EMAIL}`);
    }
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: SEED_EMAIL,
    password: SEED_PASSWORD,
    email_confirm: true,
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
    if (data?.user?.user_metadata?.requireEmailVerification) {
      console.log("⚠️  Email verification required — check the InsForge dashboard.");
    }
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
| Purpose  | UI testing / visual audit via ECC Chrome DevTools

Created by \`scripts/seed.ts\`.
`);
  console.log(`📝 Saved to memory: ${memPath}`);
}

main().catch(console.error);