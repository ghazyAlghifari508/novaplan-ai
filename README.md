Branch note: `main` is the default branch and contains the latest stable release. For active development, use `dev`.

───────────────────────────────────────────────
 ✧ ˖° 🚀 ✧ NovaPlan AI vers. 0.1.0
───────────────────────────────────────────────
**NovaPlan AI**

A modern SaaS workspace designed to help Product Managers, Developers, and Entrepreneurs craft industry-standard Product Requirements Documents (PRDs) in minutes. Leveraging state-of-the-art generative AI via OpenRouter, NovaPlan automates the drafting of technical and business specifications that typically take days.

### Features
**AI Chat Engine** -- chat with any advanced model to brainstorm and generate specs.
　Gemini Flash · Llama · Mistral · OpenRouter integration
**PRD Viewer & Editor** -- instantly render and edit AI-generated PRDs.
　markdown · syntax highlighting · Mermaid diagrams · live preview
**Version Control** -- keep track of PRD revision history, never lose a draft.
　automatic versioning · seamless rollback · diff tracking
**Project Management** -- organize your PRDs into projects for seamless management.
　workspaces · folders · search & filter
**Secure & Fast** -- built for scale and speed with modern web technologies.
　Next.js 16 · React 19 · InsForge RLS · Vercel Edge
**Payment & Subscriptions** -- integrated payment gateway for Pro and Basic tiers.
　Midtrans integration · quota tracking · automated billing
**Works on mobile** -- looks and runs great on your phone, not just desktop.
　responsive · fast UI · accessible
**Extras** -- more to explore, happy if you give it a go!
　dark mode · customizable profiles · secure auth

### Quick Start
Defaults work out of the box: clone, install, then configure your environment variables. 

```bash
git clone https://github.com/ghazyAlghifari508/novaplan-ai.git
cd novaplan-ai
npm install
cp .env.example .env.local
```

Edit `.env.local` to include your InsForge URL, Anon Key, OpenRouter API Key, and Midtrans credentials. Only edit `.env.local` for deployment-level overrides.

```bash
npm run dev
```

Open `http://localhost:3000` when the server is healthy.

### Architecture & Tech Stack
NovaPlan AI is built with a modern, serverless component-based architecture:
*   **Core**: Next.js 16 (App Router) with React 19 and TypeScript.
*   **Styling & UI**: Tailwind CSS v4, 21st.dev components, and Framer Motion for interactive micro-animations.
*   **State & Fetching**: Zustand v5 for client state, TanStack Query v5 for data caching.
*   **Backend & DB**: Next.js API Routes, Server Actions, and InsForge (PostgreSQL) with strict Row Level Security (RLS).

### Database Schema
The infrastructure uses PostgreSQL via InsForge with 9 core entities:
1.  **`users`**: Account profiles and preferences.
2.  **`subscriptions`**: Subscription tiers (Pro/Basic).
3.  **`quotas`**: AI usage tracking and rate-limiting.
4.  **`projects`**: Main containers for PRD management.
5.  **`prd_versions`**: Revision history for documents.
6.  **`conversations`**: AI chat sessions.
7.  **`messages`**: Chat interactions and generation logs.
8.  **`payments`**: Financial transactions and invoices.
9.  **`rate_limits`**: Public endpoint abuse protection.

### Directory Structure
```text
novaplan_ai/
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, api)
│   ├── components/         # UI, Auth, Chat, PRD, and Settings components
│   ├── lib/                # External configs (InsForge, OpenRouter)
│   ├── store/              # Global state management (Zustand)
│   └── types/              # TypeScript definitions
├── migrations/             # SQL migration scripts
└── middleware.ts           # Route interception and security
```

### Security Notes
NovaPlan AI handles sensitive business plans and PRDs. Treat it like a secure vault.
*   Keep `.env.local` and `insforge/` secrets out of Git.
*   Review `migrations/` before applying schema changes.
*   Row Level Security (RLS) is strictly enforced on all InsForge tables. Ensure any new tables have RLS enabled and policies defined.
*   Use `INSFORGE_API_KEY` exclusively on the server-side.

### Contributing
Help is welcome! The best entry points are fresh-install testing, prompt engineering for better PRDs, UI polish, and bug fixes. 
*   **Phase 0-5**: Foundation, Auth, Landing, Chat, PRD Viewer, Dashboard ✅ Completed
*   **Phase 6**: Pricing & Payment ⏳ In Progress
*   **Phase 7**: Profile Settings ✅ Completed
*   **Phase 8-10**: QA, Launch, Graphify ⏳ Pending

### License
MIT License -- see `LICENSE` for details.

```text
       !
       !
       ^
      / \
     /   \
    |  O  |
    |  O  |
   /|  O  |\
  / |  O  | \
 |  |  O  |  |
 |  |  O  |  |
 \_/|_____|\_/
    /  |  \
   /___|___\
    (_____)
     |   |
    /     \
  NovaPlan AI
```