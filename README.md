# Novaplan AI

AI-powered product development planner. Answer a guided flow of questions and Novaplan turns your idea into a full PRD, a set of acceptance criteria (AC), and an executable task kanban board.

Built with TanStack Start, React 19, and Vite, backed by Postgres (Drizzle ORM) and a local AI router.

## Overview

Novaplan removes the blank page problem. Instead of writing specs from scratch, you answer focused questions about your product, stack, and audience. The AI generates each artifact from the answers, and you can keep revising it in the same flow.

The pipeline has four stages:

1. **Ask** – answer a guided question flow (tech stack, platform, complexity)
2. **PRD** – a full product requirements document with version history
3. **AC** – acceptance criteria generated per feature
4. **Task** – a kanban board with executable, complexity-scaled tasks

Every stage keeps a revision history, so you can compare versions and re-generate.

## Features

- Guided question flow with dynamic scaling: subtask and non-tech question counts scale to app complexity
- Cross-block and block-skip support inside the ask flow
- Full PRD generation with mermaid diagrams and a table of contents
- Acceptance criteria viewer with an implementation-options picker
- Kanban board with per-card task details, whiteboard canvas, zoom, and auto-refresh polling
- Version history and project sharing via unauthenticated share links
- Public REST API (`/api/v1`) for projects, tasks, subtasks, and kanban status
- User accounts with Better Auth: email/password plus Google and GitHub OAuth
- Three plans (Free / Pro / Hengker) with per-minute AI rate limits
- Payments via Midtrans (snap + webhook)
- AI model tiers with automatic fallback routing through a local 9router
- Dark/light theme toggle

## Tech Stack

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

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for local Postgres) or any reachable Postgres instance
- A running 9router (or any OpenAI-compatible server) on `http://localhost:20128`

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

Contributions are welcome. Open an issue or a pull request.

## License

Private project.