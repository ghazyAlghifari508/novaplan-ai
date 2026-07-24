# NovaPlan AI — Developer Guide

## 1. Prasyarat

- Node.js 20+
- npm
- InsForge account (PostgreSQL-compatible DB)
- 9Router (OpenCode Free) — no API key needed (localhost)
- Midtrans account (for payments)

## 2. Setup

```bash
git clone https://github.com/ghazyAlghifari508/novaplan-ai.git
cd novaplan-ai
npm install
cp .env.example .env.local
# Edit .env.local with your keys
npm run dev
```

## 3. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_INSFORGE_URL` | Yes | InsForge project URL |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | Yes | InsForge anon key (public) |
| `INSFORGE_API_KEY` | Yes | InsForge service role key (server-only) |
| `MIDTRANS_SERVER_KEY_SANDBOX` | Payments | Midtrans server key |
| `MIDTRANS_CLIENT_KEY_SANDBOX` | Payments | Midtrans client key |
| `RESEND_API_KEY` | Optional | Email notifications |
| `SENTRY_DSN` | Optional | Error tracking |

## 4. Scripts

```bash
npm run dev        # Dev server
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
npm run test       # Vitest unit tests
npm run test:e2e   # Playwright e2e
```

## 5. Database Migrations

SQL files in `migrations/`. Apply via InsForge SQL Editor manually.

## 6. Adding a Feature

1. **Types** → `src/types/database.ts`
2. **Service** → `src/lib/services/` (business logic + DB ops)
3. **API Route** → `src/app/api/` (if server endpoint needed)
4. **Components** → `src/components/` (UI)
5. **Page** → `src/app/` (App Router page)
6. **Navigation** → Update navbar or flow-step-nav if needed

## 7. Coding Standards

### Naming
- Pages: `page.tsx`, `loading.tsx`, `error.tsx`
- API: `route.ts`, `route.test.ts`
- Components: `kebab-case.tsx`
- Services: `kebab-case.ts`

### Stream Handler Template
```typescript
const response = await fetch(endpoint, { method: "POST", body: JSON.stringify(data) });
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  for (const line of buffer.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const parsed = JSON.parse(line.slice(6));
    if (parsed.type === "delta") { /* handle chunk */ }
    if (parsed.type === "done") { /* handle completion */ }
    if (parsed.type === "error") { /* handle error */ }
  }
}
```

### API Route Template
```typescript
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";

export async function POST(req: NextRequest) {
  const insforge = await createServerInsforge();
  const { data: { user } } = await insforge.auth.getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // business logic
}
```

## 8. DB Access Clients

- **Browser:** `@/lib/insforge/client.ts` (user context via cookies)
- **Server:** `@/lib/insforge/server.ts` (RLS-scoped)
- **Admin:** `@/lib/insforge/admin.ts` (bypass RLS, server-only)

## 9. Error Handling

```typescript
// Server: sanitize before sending to client
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";
const cleanError = sanitizeErrorForClient(error);
return NextResponse.json({ error: cleanError }, { status: 500 });

// Client: handle non-ok response
if (!response.ok) {
  const err = await response.json();
  showToast(err.error || "Terjadi kesalahan", "error");
}
```

## 10. Deployment

```bash
vercel --prod
```

All API routes use Node.js runtime. AI endpoints need `maxDuration: 300`.

## 11. Testing

```bash
npm run test                    # All tests
npx vitest run src/lib/auth.test.ts  # Single file
npm run test:e2e                # Playwright
```

## 12. Common Issues

| Problem | Fix |
|---------|-----|
| SSE stream silent | Check `maxDuration` (needs 300) |
| PRD not saving | Check quota/rate limit (403/429) |
| RLS error | Use authenticated server client |
| AI model down | Check 9router is running at `localhost:20128`, model ID in `model-config.ts` |
| Session drops | Check `AUTH_REFRESH_LEEWAY_SECONDS` |
