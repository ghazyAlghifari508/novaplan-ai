# 🚀 NovaPlan AI 

<div align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue.svg?cacheSeconds=2592000" />
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-007acc?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-InsForge%20(PostgreSQL)-336791" />
  <img src="https://img.shields.io/badge/AI-OpenRouter-FF5A5F" />
</div>

<br />

**NovaPlan AI** is a modern SaaS workspace designed to help Product Managers, Developers, and Entrepreneurs craft industry-standard Product Requirements Documents (PRDs) in minutes. Leveraging state-of-the-art generative AI via OpenRouter, NovaPlan automates the drafting of technical and business specifications that typically take days.

---

## ✨ Features

- 🤖 **AI Chat Engine** — Chat with advanced models (Gemini Flash, Llama, Mistral) via OpenRouter to brainstorm and generate specs.
- 📝 **PRD Viewer & Editor** — Instantly render and edit AI-generated PRDs with Markdown, syntax highlighting, live preview, and **Mermaid diagrams**.
- ⏳ **Version Control** — Keep track of PRD revision history. Automatic versioning, seamless rollback, and diff tracking ensure you never lose a draft.
- 🗂️ **Project Management** — Organize your PRDs into projects (workspaces, folders, search & filter).
- ⚡ **Secure & Fast** — Built for scale and speed with modern web technologies: Next.js 16, React 19, InsForge RLS, and Vercel Edge.
- 💳 **Payment & Subscriptions** — Integrated payment gateway (Midtrans) for Pro and Basic tiers, including quota tracking and automated billing.
- 📱 **Responsive Design** — Looks and runs great on your phone, not just desktop.
- 🎨 **Extras** — Dark/Light mode, customizable profiles, secure authentication, and more!

## 🚀 Quick Start

Defaults work out of the box: clone, install, then configure your environment variables. 

```bash
git clone https://github.com/ghazyAlghifari508/novaplan-ai.git
cd novaplan-ai
npm install
cp .env.example .env.local
```

Edit `.env.local` to include your InsForge URL, Anon Key, OpenRouter/NVIDIA API Keys, and payment credentials. Only edit `.env.local` for deployment-level overrides.

```bash
npm run dev
```

Open `http://localhost:3000` when the server is healthy.

## 🏗️ Architecture & Tech Stack

NovaPlan AI is built with a modern, serverless component-based architecture:
- **Core**: Next.js 16 (App Router) with React 19 and TypeScript.
- **Styling & UI**: Tailwind CSS v4, 21st.dev components, and Framer Motion for interactive micro-animations.
- **State & Fetching**: Zustand v5 for client state, TanStack Query v5 for data caching.
- **Backend & DB**: Next.js API Routes, Server Actions, and InsForge (PostgreSQL) with strict Row Level Security (RLS).

## 🗄️ Database Schema

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

## 📁 Directory Structure

```text
novaplan_ai/
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, api)
│   ├── components/         # UI, Auth, Chat, PRD, and Settings components
│   ├── lib/                # External configs (InsForge, AI orchestrator)
│   ├── store/              # Global state management (Zustand)
│   └── types/              # TypeScript definitions
├── migrations/             # SQL migration scripts
└── middleware.ts           # Route interception and security
```

## 🔒 Security Notes

NovaPlan AI handles sensitive business plans and PRDs. Treat it like a secure vault.
- Keep `.env.local` and `insforge/` secrets out of Git.
- Review `migrations/` before applying schema changes.
- Row Level Security (RLS) is strictly enforced on all InsForge tables. Ensure any new tables have RLS enabled and policies defined.
- Use `INSFORGE_API_KEY` exclusively on the server-side.

## 🤝 Contributing

Help is welcome! The best entry points are fresh-install testing, prompt engineering for better PRDs, UI polish, and bug fixes. 
- **Phase 0-5**: Foundation, Auth, Landing, Chat, PRD Viewer, Dashboard ✅ Completed
- **Phase 6**: Pricing & Payment ⏳ In Progress
- **Phase 7**: Profile Settings ✅ Completed
- **Phase 8-10**: QA, Launch, Graphify ⏳ Pending

## 📄 License

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