# Bubble, Techstack Lewati, Subtask Modal :  Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tiga revisi UX: (1) hapus bubble chat sampah (home-prompt + "Selesai menyusun PRD awal.") yang muncul setelah generate PRD / refresh halaman PRD, tanpa jejak di codebase; (2) tambah tombol "Lewati" di sesi teknis (mirror sesi nonteknis) :  klik Lewati = AI pilih stack saat generate PRD; (3) naikkan jumlah subtask berbasis kompleksitas (complex 4-7, simple 1-2) + ganti expand "Lihat semua" jadi modal yang UI-nya match modal detail node.

**Architecture:** Revisi 1 = 1 guard di server (`saveMessages` cuma untuk mode `chat`/`revise`) + cleanup dead-code plumbing `displayMessage` yang tujuan satu-satunya persistensi bubble. Revisi 2 = prop `allowSkip` di `StackDropdown` + relax gate `allTechAnswered`. Revisi 3 = prompt scaling + ganti state `expanded` TaskCard jadi modal portal (mirror `DetailModal`).

**Tech Stack:** TanStack Start, React 19, Zustand, drizzle/pg, biome (tab + double-quote).

## Global Constraints

- Pak manager paket: **pnpm** (bukan npm/yarn).
- Format kode: **biome** :  tab indent, double-quote, lint lewat `pnpm exec biome check`.
- Typecheck: `pnpm exec tsc --noEmit` (proyek tidak punya test suite; typecheck = verifikasi utama).
- JANGAN sentuh `src/routes/forgot-password.tsx` (constraint berdiri dari sesi sebelumnya).
- Setelah setiap task: commit + push (`git add … && git commit … && git push origin main`).
- Verifikasi manual dijalankan user (dev server hanya jika user mengizinkan).

---

## Task 1: Hapus bubble chat generate/resume (tanpa jejak)

**Files:**
- Modify: `src/routes/api/chat.ts` (guard `saveMessages` + hapus dead-code `userMessageToSave`)
- Modify: `src/components/chat/chat-panel.tsx` (hapus plumbing `body.displayMessage` di 2 path)

**Interfaces:**
- Consumes: tidak ada (perubahan internal).
- Produces: tidak ada perubahan public API. `saveMessages` tetap dipanggil untuk `chat`/`revise`. `displayMessage` param di `handleSendWithMessage` tetap ada (dipakai sebagai `originalMessage` untuk error-recovery client, BUKAN persistensi :  jangan dihapus param-nya).

**Root cause (terkonfirmasi via read full file):**
- `chat.ts:297` :  `saveMessages(...)` dipanggil dengan guard cuma `if (conversationIdToUse)`, **tanpa cek mode**. Jadi untuk `generate`/`resume`, baris user (home-prompt bersih via `displayMessage`) + baris assistant (`"Selesai menyusun PRD awal."`, di-set `chat.ts:274-275`) **persist ke table `messages`**.
- `prd/$id.tsx:29-36` :  loader fetch semua rows `messages` untuk conversation.
- `prd-detail.tsx:89-107` :  `setMessages(initialMessages)` ke Zustand store saat `initialMessages.length > 0`.
- `chat-panel.tsx:941-943` :  render setiap store message jadi `ChatBubble`.
- Client-side sudah benar: `chat-panel.tsx:650` guard `addMessage` user hanya untuk `chat`/`revise`. Bubble muncul **bukan** dari injection client, murni dari DB yang di-load balik setelah `router.refresh()` (generate existing project, `chat-panel.tsx:434-438`) atau navigasi ke project baru (`chat-panel.tsx:429-433` → `prd-detail.tsx:173-177`).

- [ ] **Step 1: Guard `saveMessages` + hapus dead-code `userMessageToSave` di `chat.ts`**

Ganti blok `chat.ts:280-304` (dari `let userMessageToSave = displayMessage || message;` sampai penutup `if (conversationIdToUse) { await saveMessages(...) }`):

```ts
								// ponytail: only genuine conversation modes persist chat bubbles.
								// generate/resume originate from the home prompt :  persisting them
								// here leaked the seed prompt + "Selesai menyusun PRD awal." into
								// the chat panel after the loader repopulated the store on refresh.
								// PRD content itself is saved via savePrdVersion below; the chat
								// panel is for follow-up Q&A only.
								if (
									conversationIdToUse &&
									(mode === "chat" || mode === "revise")
								) {
									await saveMessages(
										conversationIdToUse,
										displayMessage || message,
										assistantReply,
										plan,
									);
								}
```

Catatan: untuk `chat`/`revise`, `displayMessage` selalu `undefined` (client tidak set `body.displayMessage` untuk mode itu), jadi `displayMessage || message` = `message` :  ekivalen dengan perilaku lama. `assistantReply` untuk `revise` = `"Revisi berhasil diterapkan."` (tetap dipersist, benar). `displayMessage` param di destructure (`chat.ts:52`) **tetap dipertahankan** karena dipakai di call baru.

- [ ] **Step 2: Hapus `body.displayMessage` di `handleResumePRD` (`chat-panel.tsx:706-714`)**

Ganti blok body resume:

```ts
			const body: Record<string, unknown> = {
				message: originalMessageStore,
				mode: "resume",
				partialContent: partialContentStore,
				preferences: { model: newModelId },
			};
```

(Hapus baris `displayMessage: originalMessageStore,` + komentarnya :  resume tidak lagi persist bubble.)

- [ ] **Step 3: Hapus `body.displayMessage` di `handleSendWithMessage` (`chat-panel.tsx:781-784`)**

Hapus blok:

```ts
			// Send the original user message for database storage (without template wrapping)
			if (displayMessage && displayMessage !== msg) {
				body.displayMessage = displayMessage;
			}
```

Catatan: `displayMessage` param `handleSendWithMessage` **tetap dipertahankan** :  masih dipakai sebagai argumen `originalMessage` di `streamApiCall(body, chatMode, displayMessage || msg)` (`chat-panel.tsx:795`) untuk error-recovery client (restore input / `originalMessageStore`). Itu bukan path persistensi.

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no error.

- [ ] **Step 5: Verifikasi tidak ada jejak `displayMessage` ke server**

Run: `pnpm exec biome check src/routes/api/chat.ts src/components/chat/chat-panel.tsx`
Expected: no error. Lalu grep konfirmasi `body.displayMessage` sudah hilang dari client:
`pnpm exec grep -n "body.displayMessage" src/components/chat/chat-panel.tsx` → no match.

- [ ] **Step 6: Verifikasi manual (user menjalankan dev server)**

Generate PRD baru dari home → jawab /ask → PRD selesai. Lalu:
- Setelah generate selesai: chat panel **tidak** menampilkan bubble home-prompt, **tidak** menampilkan bubble "Selesai menyusun PRD awal."
- Refresh halaman PRD: chat panel tetap bersih (loader tidak menemukan row generate/resume).
- Follow-up chat mode (ketik pesan, kirim): bubble user + bubble assistant muncul (chat follow-up tetap berfungsi).
- Revise mode: bubble user + "Revisi berhasil diterapkan." muncul (tetap berfungsi).

- [ ] **Step 7: Commit + push**

```bash
git add src/routes/api/chat.ts src/components/chat/chat-panel.tsx
git commit -m "fix: stop persisting generate/resume chat bubbles (home prompt + Selesai)

saveMessages was called for all modes with no mode guard, persisting the
home seed prompt + 'Selesai menyusun PRD awal.' to the messages table.
The PRD loader repopulated them as chat bubbles on refresh. Gate
saveMessages to chat/revise only; remove the now-dead displayMessage
plumbing whose only purpose was persisting the clean prompt for the bubble."
git push origin main
```

---

## Task 2: Tombol "Lewati" di sesi teknis (mirror sesi nonteknis)

**Files:**
- Modify: `src/app/ask/stack-dropdown.tsx` (tambah prop `allowSkip` + pill "Lewati" di header)
- Modify: `src/app/ask/ask-flow.tsx` (pass `allowSkip` ke 5 dropdown + relax gate `allTechAnswered`)

**Interfaces:**
- Consumes: pola "Lewati" dari `src/app/ask/question-card.tsx:46-58` (pill di header, `onClick` → `onAnswer({ value: "", skipped: true })`).
- Produces: `StackDropdown` dapat prop baru `allowSkip?: boolean`. `ask-flow` relax gate jadi Generate PRD selalu enabled di sesi 2.

**Mekanisme:** Lewati = `onChange(undefined)` (clear value). `submit()` (`ask-flow.tsx:226-230`) sudah fallback `${tech.frontend || "Biarkan AI yang memilih"}` :  undefined = AI pilih. Tidak perlu endpoint/prompt baru.

- [ ] **Step 1: Tambah prop `allowSkip` + pill "Lewati" di `stack-dropdown.tsx`**

Di interface `StackDropdownProps` (line 13-23), tambah:

```ts
	allowSkip?: boolean;
```

Di signature komponen (line 25-35), tambah param `allowSkip`.

Di header (setelah blok `<div className="min-w-0 flex-1">…</div>`, sebelum blok `{clearable && …}` di line 156), tambah pill "Lewati" :  mirror styling `question-card.tsx:46-58`:

```tsx
					{allowSkip && !disabled && (
						<button
							type="button"
							onClick={() => {
								onChange(undefined);
								setCustomMode(false);
								setCustomDraft("");
								setOpen(false);
							}}
							className={cn(
								"shrink-0 rounded-full px-3 py-1 font-inter text-xs transition-colors",
								!value
									? "bg-steel text-snow"
									: "text-fog hover:text-snow",
							)}
						>
							Lewati
						</button>
					)}
```

Logika: saat `!value` (field kosong / sudah di-skip) → pill aktif `bg-steel` (terpilih). Saat ada value → pill muted. Klik → `onChange(undefined)` (clear = skip). `X` clear button yang sudah ada (line 156-170) tetap dipertahankan untuk hapus custom input :  tidak konflik (sama-sama `onChange(undefined)`).

- [ ] **Step 2: Pass `allowSkip` ke 5 `StackDropdown` di `ask-flow.tsx`**

Tambahkan `allowSkip` ke setiap instance `StackDropdown` (Frontend line 312, Backend 325, Fullstack 338, Database 351, Deployment 364). Contoh untuk Frontend:

```tsx
						<StackDropdown
							label="Frontend"
							subtitle="UI & tampilan user"
							icon={Palette}
							accent="#5e6ad2"
							placeholder="Pilih frontend..."
							options={frontendOptions}
							value={techAnswers.frontend}
							disabled={feBeDisabled}
							allowSkip
							onChange={(v) =>
								setTechAnswers((prev) => ({ ...prev, frontend: v }))
							}
						/>
```

Ulangi `allowSkip` untuk 4 lainnya.

- [ ] **Step 3: Relax gate `allTechAnswered` di `ask-flow.tsx:202-206`**

Karena setiap field bisa di-skip (undefined = AI pilih), gate wajib dihilangkan. Ganti:

```ts
	const allTechAnswered =
		Boolean(techAnswers.database) &&
		Boolean(techAnswers.deployment) &&
		(Boolean(techAnswers.fullstackFramework) ||
			(Boolean(techAnswers.frontend) && Boolean(techAnswers.backend)));
```

dengan:

```ts
	// ponytail: every tech field is skippable :  Lewati = undefined = "Biarkan AI
	// yang memilih" in submit(). No field is mandatory; Generate PRD stays enabled
	// so non-technical users can let the AI pick the whole stack.
	const allTechAnswered = true;
```

Catatan: `feBeDisabled`/`fullstackDisabled` (line 186-189) tetap :  mutual exclusion FE/BE vs Fullstack saat user **memilih**. Saat skip (undefined), keduanya enabled. Aman.

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no error.

- [ ] **Step 5: Verifikasi manual**

- Sesi 2: tiap dropdown tampil pill "Lewati" di header.
- Klik "Lewati" di semua 5 dropdown → pill jadi `bg-steel` (aktif) → Generate PRD enabled.
- Klik Generate PRD → PRD ter-generate dengan "Biarkan AI yang memilih" untuk tiap field teknis.
- Klik "Lewati" lalu pilih salah satu option → pill kembali muted, value terisi.
- FE/BE vs Fullstack mutual exclusion tetap jalan (pilih FE → Fullstack disabled).

- [ ] **Step 6: Commit + push**

```bash
git add src/app/ask/stack-dropdown.tsx src/app/ask/ask-flow.tsx
git commit -m "feat(ask): add Lewati skip button to tech session dropdowns

Mirror the non-tech session's skip pattern: each StackDropdown gets a
Lewati pill that clears the value to undefined, which submit() already
maps to 'Biarkan AI yang memilih'. Relax allTechAnswered so Generate PRD
stays enabled when every field is skipped :  non-technical users let the
AI pick the entire stack. No new endpoint/prompt needed."
git push origin main
```

---

## Task 3: Subtask count scaling + modal "Lihat semua"

**Files:**
- Modify: `src/lib/prompts-task.ts` (scaling rule complex 4-7 + boundary subtask vs details)
- Modify: `src/components/task/whiteboard-canvas.tsx` (ganti expand "Lihat semua" jadi modal, mirror `DetailModal`)

**Interfaces:**
- Consumes: `DetailModal` (`whiteboard-canvas.tsx:489-512`) sebagai template UI modal. `MAX_VISIBLE_SUBTASKS = 3` (line 20) tetap untuk collapsed preview.
- Produces: `TaskCard` dapat prop `onOpen: (node: LayoutNode) => void`. Komponen baru `TaskSubtasksModal`. State `openTask` di `WhiteboardCanvas`.

**Root cause subtask 1-3 (terkonfirmasi):**
- Prompt `prompts-task.ts:36-39` sudah ada scaling (complex 3-5, simple 1-2) tapi: (a) upper bound 5 terlalu rendah, (b) bahasa lembek ("target", "cukup") → AI lean ke floor, (c) feature detail-nodes (`details[]` array, line 42-45) nyedot granularitas :  AI collapse deliverable terpisah jadi 1 subtask + banyak details. Bukan code cap, bukan slice.
- Code: `task-service.ts` parse/save/get **no slice, no cap**. `api/task/generate.ts` no count manipulation.
- Display: `whiteboard-canvas.tsx:20` `MAX_VISIBLE_SUBTASKS = 3` = cap collapsed preview (bukan data cap). Expand "Lihat semua" (TaskCard:546-562) pakai state `expanded` inline :  user mau diganti modal.

- [ ] **Step 1: Rewrite scaling rule di `prompts-task.ts:36-39`**

Ganti blok rule 7:

```
7. Minimum 2 tasks per fitur. Jumlah subtask per task TIDAK TETAP :  sesuaikan kompleksitas, JANGAN dipaksa sama rata:
   - Task kompleks (banyak langkah/edge case, contoh: "Implement checkout flow", "Build auth system dengan OAuth + session + role-based access") → 4-7 subtask. WAJIB pecah jadi subtask terpisah, JANGAN ditumpuk jadi detail satu subtask.
   - Task menengah (contoh: "Implement CRUD API dengan validasi") → 3-4 subtask.
   - Task sederhana (contoh: "Add logout button") → 1-2 subtask cukup, JANGAN dipaksa jadi 3-7.
   - Minimum 1 subtask per task, tidak ada maksimum :  ikuti kebutuhan nyata task tersebut.
   - BATASAN subtask vs detail: subtask = deliverable atomik terpisah (tiap subtask bisa di-PR / dikerjakan independen). detail = langkah internal DALAM SATU deliverable. JANGAN gabungkan deliverable berbeda ke dalam satu subtask hanya untuk menambah array details. Kalau ada 2 hal yang bisa di-PR terpisah, itu 2 subtask, bukan 1 subtask dengan 2 details.
```

Tambah worked example complex (anchor upward) :  sisipkan setelah rule 10 (line 45), sebelum "Konteks AC":

```
CONTOH task kompleks dengan 5 subtask (JANGAN kurangi ini dengan menumpuk ke details):
Task: "Implement checkout flow"
- Subtask 1: Build cart state management (add/remove/quantity)
- Subtask 2: Implement checkout form UI + validation
- Subtask 3: Create payment intent API endpoint
- Subtask 4: Integrate payment gateway webhook handler
- Subtask 5: Build order confirmation page + email receipt
(Tiap subtask di atas punya details[] sendiri untuk langkah internalnya.)
```

- [ ] **Step 2: Tambah state `openTask` + handler freeze di `WhiteboardCanvas`**

Di `WhiteboardCanvas` (line 250), tambah state:

```ts
  const [openDetail, setOpenDetail] = useState<LayoutNode | null>(null);
  const [openTask, setOpenTask] = useState<LayoutNode | null>(null);
```

Update handler freeze (`handleKeyDown` 289-298, `handlePointerDown` 300-303, `handlePointerMove` 305-308, `handleWheel` 310-313) :  cek `openTask` juga:

```ts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (openDetail || openTask) {
      if (e.key === "Escape") { setOpenDetail(null); setOpenTask(null); }
      return;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      nudgePan(e.key, 40);
    }
  }, [nudgePan, openDetail, openTask]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (openDetail || openTask) return;
    startPan(e);
  }, [openDetail, openTask, startPan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (openDetail || openTask) return;
    updatePan(e);
  }, [openDetail, openTask, updatePan]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (openDetail || openTask) return;
    onWheel(e);
  }, [openDetail, openTask, onWheel]);
```

- [ ] **Step 3: Pass `onOpen` ke `TaskCard` + render portal modal**

Di `nodes.map` (line 362-367), ganti branch TaskCard:

```tsx
              return <TaskCard key={node.id} node={node} onOpen={() => setOpenTask(node)} />;
```

Tambah portal render (setelah portal `DetailModal`, line 379-380):

```tsx
      {openTask && typeof document !== "undefined" &&
        createPortal(<TaskSubtasksModal node={openTask} onClose={() => setOpenTask(null)} />, document.body)}
```

- [ ] **Step 4: Rewrite `TaskCard` :  hapus expand, ganti jadi tombol buka modal**

Ganti seluruh fungsi `TaskCard` (line 514-565):

```tsx
function TaskCard({ node, onOpen }: { node: LayoutNode; onOpen: () => void }) {
  const color = COLORS[node.colorIdx];
  const allSubtasks = node.subtasks ?? [];
  const total = node.totalSubtasks ?? allSubtasks.length;
  const hasMore = total > MAX_VISIBLE_SUBTASKS;
  const visibleSubtasks = allSubtasks.slice(0, MAX_VISIBLE_SUBTASKS);

  return (
    <div className="absolute rounded-lg border border-graphite bg-obsidian shadow-md animate-fadeIn"
      style={{ left: node.x, top: node.y, width: node.w }}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-graphite/60 px-3 py-2.5">
        <div className={`h-2 w-2 shrink-0 rounded-full ${color.badge}`} />
        <p className="truncate font-inter text-xs font-[510] text-snow" title={node.label}>{node.label}</p>
      </div>

      {/* Subtask checklist (collapsed preview, max 3) */}
      {visibleSubtasks.length > 0 && (
        <ul className="px-3 py-2 space-y-1">
          {visibleSubtasks.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-fog">
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-graphite bg-charcoal">
                <span className="h-1.5 w-1.5 rounded-sm bg-fog/30" />
              </span>
              <span className="truncate">{s.name}</span>
            </li>
          ))}
        </ul>
      )}

      {/* "Lihat semua" → modal (bukan expand inline) */}
      {hasMore && (
        <div className="border-t border-graphite/40 px-3 py-1.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] font-[510] text-indigo hover:text-indigo/80 transition-colors"
          >
            Lihat semua ({total}) <ChevronRight size={10} />
          </button>
        </div>
      )}
    </div>
  );
}
```

(Hapus `useState`, `expanded`, `ChevronDown` import bila tidak dipakai lagi :  cek: `ChevronDown` dipakai di tombol Tutup expand lama. Setelah hapus, `ChevronDown` mungkin unused. Lihat Step 5.)

- [ ] **Step 5: Tambah komponen `TaskSubtasksModal` + cek import**

Tambahkan setelah `DetailModal` (line 512), mirror styling-nya:

```tsx
// Modal daftar subtask :  UI match DetailModal (portal, overlay, color border, X close).
function TaskSubtasksModal({ node, onClose }: { node: LayoutNode; onClose: () => void }) {
  const color = COLORS[node.colorIdx];
  const allSubtasks = node.subtasks ?? [];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl border ${color.border} bg-obsidian p-5 shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <div className={`h-2 w-2 shrink-0 rounded-full ${color.badge}`} />
          <p className="truncate font-inter text-sm font-[510] text-snow">{node.label}</p>
          <span className="ml-auto shrink-0 text-xs text-fog">{allSubtasks.length} subtask</span>
          <button onClick={onClose} className="shrink-0 text-fog transition-colors hover:text-snow">
            <X size={18} />
          </button>
        </div>
        <ul className="space-y-2">
          {allSubtasks.map((s, i) => (
            <li key={i} className="rounded-lg border border-graphite/60 bg-charcoal/40 px-3 py-2">
              <p className="font-inter text-sm text-snow">{s.name}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

Cek import line 7: `import { ChevronDown, ChevronRight, X } from "lucide-react";`. Setelah hapus expand (ChevronDown hanya dipakai di tombol "Tutup" expand yang dihapus), hapus `ChevronDown` dari import → `import { ChevronRight, X } from "lucide-react";`. `ChevronRight` tetap dipakai di tombol "Lihat semua". `X` dipakai di `DetailModal` + `TaskSubtasksModal`.

- [ ] **Step 6: Typecheck + lint**

Run: `pnpm exec tsc --noEmit && pnpm exec biome check src/lib/prompts-task.ts src/components/task/whiteboard-canvas.tsx`
Expected: no error.

- [ ] **Step 7: Verifikasi manual**

Generate task tree untuk project dengan AC kompleks. Konfirmasi:
- Task kompleks punya 4-7 subtask (bukan 1-3).
- Task sederhana 1-2 subtask.
- Collapsed TaskCard tampil 3 subtask + tombol "Lihat semua (N)".
- Klik "Lihat semua" → modal terbuka, UI match modal detail node (overlay hitam, card obsidian + border warna, tombol X), list semua subtask.
- Klik overlay / X / Escape → modal tutup. Pan/zoom freeze saat modal terbuka.
- Detail node modal (klik '...' di detail) tetap berfungsi (tidak regresi).

- [ ] **Step 8: Commit + push**

```bash
git add src/lib/prompts-task.ts src/components/task/whiteboard-canvas.tsx
git commit -m "feat(task): scale subtask count to complexity, show all via modal

Prompt: raise complex target 3-5 -> 4-7, add subtask-vs-detail boundary
rule so granularity stops draining into the details[] array. Canvas:
replace inline expand 'Lihat semua' with a modal that mirrors the
DetailNode modal UI (portal, overlay, color border, X close). Collapsed
TaskCard still previews 3 subtasks; modal lists all."
git push origin main
```

---

## Self-Review

1. **Spec coverage:** Revisi 1 (bubble) → Task 1. Revisi 2 (Lewati tech) → Task 2. Revisi 3 (subtask count + modal) → Task 3. Semua ter-cover.
2. **Placeholder scan:** Semua step punya code/command lengkap. Tidak ada TBD/TODO.
3. **Type consistency:** `allowSkip?: boolean` konsisten di interface + signature + pemakaian. `onOpen: () => void` konsisten di `TaskCard` prop + `nodes.map`. `openTask` state konsisten di semua handler freeze + portal. `displayMessage` param `handleSendWithMessage` tetap (dipakai `originalMessage`), hanya `body.displayMessage` yang dihapus.

## Catatan

- Plan `splendid-cooking-axolotl.md` (detail nodes) sudah shipped :  tidak konflik. Detail nodes = level-4 per-subtask, subtask count = level-3, ortogonal.
- Verifikasi manual butuh dev server. User menolak menjalankan dev server di sesi sebelumnya :  konfirmasi sebelum Step verifikasi manual tiap task. Kalau tidak dijalankan, nyatakan typecheck-only.
- Tidak ada DB migration (subtasks jsonb schemaless, tidak ada perubahan kolom).
