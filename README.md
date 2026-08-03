# Novaplan AI

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](#tech-stack)
[![React](https://img.shields.io/badge/React_19-149ECA?logo=react&logoColor=fff)](#tech-stack)
[![TanStack Start](https://img.shields.io/badge/TanStack_Start-FF4154?logo=tanstack&logoColor=fff)](#tech-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-06B6D4?logo=tailwindcss&logoColor=fff)](#tech-stack)
[![Postgres](https://img.shields.io/badge/Postgres-4169E1?logo=postgresql&logoColor=fff)](#tech-stack)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-386641?logo=drizzle&logoColor=fff)](#tech-stack)
[![Better Auth](https://img.shields.io/badge/Better_Auth-0F766E?logo=auth0&logoColor=fff)](#authentication)
[![Biome](https://img.shields.io/badge/Biome-60A5FA?logo=biome&logoColor=fff)](#development)

AI-powered product development planner. Answer a guided flow of questions and Novaplan turns your idea into a full PRD, a set of acceptance criteria (AC), and an executable task kanban board.

Built with TanStack Start, React 19, and Vite, backed by Postgres (Drizzle ORM) and a local AI router.

## Why Novaplan

Writing a product spec from scratch is slow and the blank page is hostile. Most ideas die before the first sentence gets written. Novaplan inverts the process: instead of staring at an empty document, you answer a short, guided flow of questions and let the AI assemble the artifact for you.

The output is structured, editable, and versioned, so a one-line idea becomes a reviewable spec in minutes.

## Overview

Novaplan removes the blank page problem. Instead of writing specs from scratch, you answer focused questions about your product, stack, and audience. The AI generates each artifact from the answers, and you can keep revising it in the same flow.

The pipeline has four stages:

1. **Ask** – answer a guided question flow (tech stack, platform, complexity)
2. **PRD** – a full product requirements document with version history
3. **AC** – acceptance criteria generated per feature
4. **Task** – a kanban board with executable, complexity-scaled tasks

Every stage keeps a revision history, so you can compare versions and re-generate. You never lose a version: the pipeline is append-only per stage.

## How it works

1. **Answer the flow.** Pick a stack (frontend, backend, database, hosting) and toggle between web and mobile. The question count scales to your app's complexity.
2. **Review the PRD.** Novaplan drafts a complete product requirements document with a table of contents and architecture diagrams. Regenerate any section or revise the whole doc.
3. **Approve the AC.** Each feature gets acceptance criteria plus an implementation-options picker, so the team knows both *what* to build and *how* to build it.
4. **Execute on the board.** Novaplan breaks the scope into a kanban board of complexity-scaled tasks. Track status, open task details, and sketch on the whiteboard canvas.

If anything misses the mark, go back a stage. Every revision is saved to version history.

## Features

- Guided question flow with dynamic scaling: subtask and non-tech question counts scale to app complexity
- Cross-block and block-skip support inside the ask flow
- Full PRD generation with mermaid diagrams and a table of contents
- Acceptance criteria viewer with an implementation-options picker
- Kanban board with per-card task details, whiteboard canvas, zoom, and auto-refresh polling
- Version history and project sharing via unauthenticated share links
- Optional blocks for specific app-building phases (auth, payments, notifications, etc.)
- Model switcher with free and premium model tiers per request
- Public REST API (`/api/v1`) for projects, tasks, subtasks, and kanban status
- User accounts with Better Auth: email/password plus Google and GitHub OAuth
- Three plans (Free / Pro / Hengker) with per-minute AI rate limits
- Payments via Midtrans (snap + webhook)
- AI model tiers with automatic fallback routing through a local 9router
- Dark/light theme toggle

## Tech Stack

Novaplan is a full-stack TypeScript app. The same codebase serves both the interactive planner and a public REST API.

| Layer | Choice |
| --- | --- |
| Framework | TanStack Start (React Router file-based routing) |
| UI | React 19, Tailwind CSS 4, Radix UI, shadcn-style components |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` |
| Data | Postgres, Drizzle ORM, `pg` |
| Auth | Better Auth (email/password, Google, GitHub) |
| AI | Local 9router endpoint (`http://localhost:20128`) with OpenAI-compatible completions |
| State | TanStack Query + Zustand |
| Rendering | Mermaid for diagrams, react-markdown + remark-gfm, DOMPurify |
| Lint / Format | Biome |
| Tests | Playwright, unit tests with Node's built-in test runner |
| Package Manager | pnpm |

## Architecture

Novaplan is a full-stack app where a single TanStack Start server handles both the browser UI and the server-side work:

- **File-based routes** under `src/routes/` drive the ask flow, PRD, AC, kanban, settings, auth, and pricing pages.
- **Server functions and API routes** wrap the AI calls, persistence, and business logic. Generation happens server-side; the client only streams the result.
- **A local 9router** exposes an OpenAI-compatible endpoint that Novaplan calls for all AI completions. Models are split into free and premium tiers with automatic fallback to the next available model.
- **Drizzle ORM + Postgres** store users, projects, PRD versions, AC, tasks, and kanban state. Migrations are managed with `drizzle-kit`.
- **Better Auth** handles session management server-side with email/password plus OAuth providers, and hashing with a server-only secret.
- **A public REST API** under `/api/v1` mirrors the core workflows so the same engine can be driven programmatically.

The four-stage pipeline is stateless at each step: you answer questions, get an artifact, and re-generate as needed. Nothing is mutated destructively; each stage writes a new version.

## Authentication

Authentication is handled by [Better Auth](https://better-auth.com), a server-side auth library for TypeScript. Novaplan supports:

- Email and password sign-up with server-side session cookies
- Social login via Google and GitHub OAuth
- Protected server functions and API routes that verify the session on every request
- A per-user plan (Free / Pro / Hengker) that gates AI rate limits and feature access

Session tokens are stored in HTTP-only cookies, and the secret lives only in the server environment, never in the client bundle.

## Billing

Novaplan uses [Midtrans](https://midtrans.com) for payments. The flow is web-standard:

1. The client requests a payment on the server via `POST /api/payments/create`, which returns a Midtrans redirect URL.
2. The user completes the payment on Midtrans's hosted page.
3. A webhook at `POST /api/payments/webhook` verifies the transaction and updates the user's plan server-side.

Sensitive payment configuration lives in the server environment and is never exposed to the client.

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for local Postgres) or any reachable Postgres instance
- A running 9router (or any OpenAI-compatible server) on `http://localhost:20128`

### Environment Variables

The table below documents every variable the app reads. Sensitive values must be set server-side only.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string |
| `BETTER_AUTH_SECRET` | Yes | Session secret (32+ random bytes base64) |
| `BETTER_AUTH_URL` | Yes | Public base URL of the app (`http://localhost:3000` in dev) |
| `GOOGLE_CLIENT_ID` | For Google login | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Google login | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | For GitHub login | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | For GitHub login | GitHub OAuth client secret |
| `NINE_ROUTER_URL` | Yes | Base URL of the local AI router |


### Installation

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables and fill them in
cp .env.example .env
```

Required values in `.env`:

```env
DATABASE_URL="postgresql://novaplan:novaplan_local@localhost:5432/novaplan"
BETTER_AUTH_SECRET="<openssl rand -base64 32>"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
NINE_ROUTER_URL="http://localhost:20128"
```

### Database & migrations

The Postgres schema is defined in `src/db/schema.ts` with Drizzle. There are two ways to sync the database:

- `pnpm db:push` applies the schema directly. Fast for local iteration.
- `pnpm db:generate` + `pnpm db:migrate` create and run a migration file. Use this in shared environments.

`pnpm db:studio` opens Drizzle Studio for inspecting the database.

### Local AI router

Novaplan does not call a hosted model API directly. It talks to a local [9router](https://9router.com)-style OpenAI-compatible server at `NINE_ROUTER_URL`. Point it at any server exposing `/v1/chat/completions` and the app works unchanged.

### Start the database

```bash
docker run -d \
  --name novaplan-db \
  -e POSTGRES_USER=novaplan \
  -e POSTGRES_PASSWORD=novaplan_local \
  -e POSTGRES_DB=novaplan \
  -p 5432:5432 \
  postgres:16
```

### Push the schema and run

```bash
pnpm db:push
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm dev          # start the dev server on port 3000
pnpm build        # production build
pnpm preview      # preview the production build
pnpm db:generate  # generate a Drizzle migration
pnpm db:migrate   # apply migrations
pnpm db:push      # push schema directly (fast iteration)
pnpm db:studio    # open Drizzle Studio
pnpm lint         # Biome lint
pnpm format       # Biome format
pnpm check        # Biome check
```

## Project Structure

```
src/
  app/            app-wide config, server actions (ask flow, settings, PRD)
  components/     feature components: ask, chat, kanban, prd, task, settings, ui
  db/             Drizzle schema and client
  hooks/          shared hooks (canvas zoom, kanban polling, panel resize)
  lib/            AI client, auth, constants, model config, utilities
  routes/         file-based routes + server API routes
  routes/api/v1/  public REST API
  store/          Zustand store
```

## API

Novaplan exposes a public REST API under `/api/v1`. Endpoints cover:

- Projects: `GET/POST /api/v1/projects`, `GET /api/v1/projects/:id`
- Tasks: `GET /api/v1/projects/:id/tasks`
- Status: `PATCH /api/v1/tasks/:id/status`, `PATCH /api/v1/subtasks/:id/status`
- Kanban: `GET /api/v1/projects/:id/kanban`

## Contributing

Contributions are welcome. The project uses Biome for linting and formatting and Node's built-in test runner for unit tests.

1. Fork the repository and create a feature branch.
2. Run `pnpm install` and `pnpm dev` to get a working local setup.
3. Keep changes scoped. Run `pnpm check` before opening a pull request.
4. Add a test alongside any non-trivial logic.
5. Open a pull request against `main`.

## License

Private project. Not licensed for redistribution.