# PRD-07: Implementation Options — Copy, Download, Prompt AI Agent

## Problem
After full planning (PRD + AC + Tasks + Sitemap), user needs to export data to start coding. Three distinct workflows: quick reference (copy), full archive (download ZIP), or handoff to AI coding agent (prompt). Currently only PRD markdown download exists (feature-gated).

## Scope
**In:** "Pilih Implementasi" dropdown on task page navbar → 3 options (Copy PRD, Download ZIP, Prompt AI Agent), button changes to "Mulai Implementasi" after selection, ZIP with all artifacts, 3-step prompt modal.

**Out:** One-click deploy to Vercel/GitHub, PDF export, email export.

---

## User Flows

### Flow: First Visit — No Selection Yet
1. User on Task page → navbar shows `[Pilih Implementasi]` button
2. Button is secondary style (outlined)
3. No selection state stored (resets on page reload)

### Flow: Select "Copy PRD"
1. User clicks "Pilih Implementasi" → dropdown opens with 3 options
2. Clicks "Copy PRD"
3. Button immediately changes to `[✓ Mulai Implementasi]` (primary style)
4. Toast: "PRD berhasil disalin ke clipboard"
5. Clipboard API copies full PRD markdown
6. User can click "Mulai Implementasi" to proceed to kanban

### Flow: Select "Download ZIP"
1. User clicks "Download ZIP"
2. Button shows spinner "Menyiapkan ZIP..."
3. POST `/api/export/zip` → server generates ZIP with all project artifacts
4. ZIP downloads automatically via blob/URL.createObjectURL
5. Button changes to `[✓ Mulai Implementasi]`
6. Toast: "ZIP berhasil diunduh"

### Flow: Select "Prompt AI Agent"
1. User clicks "Prompt AI Agent"
2. Modal opens with 3-step guide:
   - **Step 1:** Textarea with pre-filled prompt (readonly, select-all on focus)
     - "Copy prompt dibawah ini:"
     - Content: detailed instructions for AI coding agent
   - **Step 2:** "Buka AI coding agent kamu (Claude Code, Cursor, dll)"
   - **Step 3:** "Paste prompt tersebut"
3. User copies prompt → clicks "Copy & Tutup"
4. Toast: "Prompt disalin. Buka AI coding agent untuk paste."
5. Button changes to `[✓ Mulai Implementasi]`

### Flow: Click "Mulai Implementasi"
1. Button already changed to primary style with checkmark
2. User clicks → redirect to `/kanban/[projectId]`
3. First-time: kanban shows all tasks as "Belum Mulai"

### Negative Flow A: Clipboard API Fails
1. User clicks "Copy PRD" but clipboard permission denied
2. Fallback: select text programmatically + toast "Tekan Ctrl+C untuk menyalin"
3. Modal with textarea containing PRD content (user manually copies)

### Negative Flow B: ZIP Generation Fails
1. Server returns 500 during ZIP generation
2. Toast: "Gagal membuat ZIP. Coba lagi."
3. Button reverts to selection state (user can retry or pick different option)

### Negative Flow C: User clicks "Pilih Implementasi" but no tasks generated
1. Tasks empty → dropdown shows disabled with message
2. "Generate task tree terlebih dahulu"
3. Keep dropdown closed, show tooltip instead

---

## UI States

### Dropdown Default
```
[Pilih Implementasi ▼]    ← secondary button
├── 📋 Copy PRD
├── 📦 Download ZIP
└── 🤖 Prompt AI Agent
```

### Dropdown After Selection
```
[✓ Mulai Implementasi]    ← primary button (solid)
  (dropdown hidden, button text changed)
```

### Modal: Prompt AI Agent
```
┌──────────────────────────────────┐
│  🤖 Prompt AI Agent             │  ← header with icon
│                                  │
│  Langkah 1: Copy prompt dibawah  │
│  ┌──────────────────────────┐   │
│  │ Kamu adalah NovaPlan...   │   │  ← readonly textarea
│  │ Baca PRD ini: ...         │   │
│  │ ...                       │   │
│  └──────────────────────────┘   │
│  [📋 Copy Prompt]               │  ← button copies content
│                                  │
│  Langkah 2: Buka AI coding      │
│  agent kamu (Claude Code,       │
│  Cursor, Copilot, dll)          │
│                                  │
│  Langkah 3: Paste prompt tsb    │
│  ke AI coding agent dan mulai   │
│  implementasi.                   │
│                                  │
│           [Copy & Tutup]         │  ← primary CTA
└──────────────────────────────────┘
```

### Modal: Download Progress
```
┌──────────────────────┐
│  Menyiapkan ZIP...   │
│  [========>   ] 70%  │  ← progress bar
└──────────────────────┘
```

---

## API Contract

### POST /api/export/zip
```typescript
// REQUEST
{
  projectId: string;
}

// RESPONSE
// Content-Type: application/zip
// Content-Disposition: attachment; filename="novaplan-[project-name].zip"
// Binary ZIP content

// ZIP STRUCTURE:
// novaplan-[project-name]/
// ├── PRD.md
// ├── AC.md
// ├── features.json
// ├── tasks.json
// ├── sitemap.json
// └── project-summary.json
```

### GET /api/export/prompt/[projectId]
```typescript
// RESPONSE
{
  prompt: string;  // Full AI agent prompt template
}
```

---

## Prompt Template Content

```typescript
const AI_AGENT_PROMPT_TEMPLATE = `Kamu adalah NovaPlan Coding Agent.

Tugasmu: implementasikan aplikasi berdasarkan dokumen perencanaan berikut.

## Project: {projectName}

### PRD (Product Requirements Document)
Baca PRD berikut:
{prdContent}

### Acceptance Criteria
{acContent}

### Features & Tasks
{featuresAndTasks}

### Sitemap
{sitemapContent}

## Instruksi Implementasi
1. Baca dan pahami semua dokumen di atas
2. Install NovaPlan CLI/MCP untuk akses ke kanban:
   \`\`\`bash
   npm install -g @novaplan/cli
   novaplan login --api-key {apiKey}
   \`\`\`
3. Kerjakan task satu per satu sesuai urutan
4. Setiap selesai task/subtask, update status:
   \`\`\`bash
   novaplan task update <task-id> --status completed
   \`\`\`
5. Jika ada kendala, update status ke 'failed' dengan catatan
6. Lanjutkan sampai semua task selesai
`;
```

---

## State Logic for Button

```typescript
type ImplementationChoice = 'copy_prd' | 'download_zip' | 'prompt_ai' | null;

// Stored in sessionStorage (persists through page reload within session)
const [choice, setChoice] = useState<ImplementationChoice>(null);

// Button render:
if (choice === null) {
  // Show "Pilih Implementasi" dropdown
} else {
  // Show "Mulai Implementasi" with checkmark icon
  // Text: "Mulai Implementasi"
}

// Selection handler:
function handleSelect(option: ImplementationChoice) {
  switch (option) {
    case 'copy_prd':
      await navigator.clipboard.writeText(prdContent);
      showToast('PRD disalin ke clipboard');
      break;
    case 'download_zip':
      const blob = await fetch(`/api/export/zip/${projectId}`).then(r => r.blob());
      // Trigger download
      break;
    case 'prompt_ai':
      setShowPromptModal(true);
      break;
  }
  sessionStorage.setItem('novaplan:impl-choice', option);
  setChoice(option);
}
```

---

## Files Affected

| File | Action | Reason |
|------|--------|--------|
| `src/components/task/implementation-dropdown.tsx` | **CREATE** | Dropdown + button logic |
| `src/components/task/prompt-ai-modal.tsx` | **CREATE** | 3-step prompt modal |
| `src/app/api/export/zip/route.ts` | **CREATE** | ZIP generation endpoint |
| `src/app/api/export/prompt/[pid]/route.ts` | **CREATE** | Prompt text endpoint |
| `src/components/layout/navbar.tsx` | Modify | Add "Pilih Implementasi" when on task page |
| `src/components/task/task-detail.tsx` | Modify | Expose project data to navbar |
| `package.json` | Modify | Add `jszip` dependency (client-side ZIP) |

---

## Edge Cases
- [ ] Large PRD (>1MB) → clipboard API may fail (quota exceeded). Fallback: show textarea with select-all.
- [x] ZIP contains multiple files with same name → prefix with feature name
- [ ] User downloads ZIP but has no sitemap → include empty sitemap placeholder
- [ ] User switches to another project without implementing → sessionStorage choice clears (per-project)
- [ ] Prompt modal on mobile → full-screen modal, steps stack vertically
- [ ] Download fails mid-stream → retry button, partial file cleanup

## Security
- ZIP endpoint validates project ownership
- Prompt contains API key → only generated for project owner
- ZIP does not include API key (keys managed separately in settings)
- Download rate limited: 5 downloads/minute per user

## Dependencies
- PRD-05 (task page where button lives)
- PRD-06 (sitemap content in export)
- PRD-10 (DB tables for content)

## Effort Estimate
- New files: 4
- Files modified: 2
- Complexity: Low (mostly UI + ZIP generation)
