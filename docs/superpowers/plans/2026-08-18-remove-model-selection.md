# Remove Model Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hapus seluruh sistem pemilihan model AI oleh user, ganti dengan static combo `novaplan-combo` yang dikirim ke 9Router.

**Architecture:** 9Router handles all model fallback/routing server-side via combo named `novaplan-combo` (6 models, Fallback strategy). App sends single string `"novaplan-combo"` as model ID. All tier gating, model lists, dropdown UI, sessionStorage persistence deleted. Credit system untouched — plan tiers still gate credit consumption.

**Tech Stack:** TanStack Start, React 19, TypeScript 6, Vite 8, Zustand, 9Router proxy

## Global Constraints

- Combo ID: `"novaplan-combo"` — exact string, no env var (9Router config is deployment-coupled)
- Credit system MUST remain functional — `Plan` type, `checkCredits()`, `consumeCredit()` untouched
- `tryStreamWithFallback()` retained — useful if combo endpoint fails entirely
- All UI copy in Bahasa Indonesia
- No new dependencies
- Build must pass (`pnpm build`) after each task

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/model-config.ts` | Rewrite | Export only `COMBO_MODEL_ID` constant |
| `src/lib/services/ai-orchestrator.ts` | Rewrite | `selectModels()` returns `[COMBO_MODEL_ID]`, no params |
| `src/lib/constants.ts` | Edit | Replace `AI_MODELS` with combo-based values |
| `src/routes/api/chat.ts` | Edit | Remove `preferences.model`, pass combo directly |
| `src/routes/api/ac/generate.ts` | Edit | Same |
| `src/routes/api/task/generate.ts` | Edit | Same |
| `src/routes/api/ask/options.ts` | Edit | Same |
| `src/components/chat/model-dropdown.tsx` | Delete | Entire file |
| `src/components/chat/chat-panel.tsx` | Edit | Remove ModelDropdown, selectedModel state, sessionStorage reads |
| `src/components/layout/chat-input.tsx` | Edit | Remove inline model selector JSX + state |
| `src/components/chat/resume-error-modal.tsx` | Rewrite | Remove model picker, simplify to retry button |
| `src/app/ask/ask-flow.tsx` | Edit | Remove sessionStorage model read |
| `src/components/ac/ac-detail.tsx` | Edit | Remove sessionStorage model read |
| `src/components/task/task-detail.tsx` | Edit | Remove sessionStorage model read |
| `src/components/ui/model-icon.tsx` | Keep | Still used elsewhere; no changes needed |

---

### Task 1: Rewrite model-config.ts to single constant

**Files:**
- Modify: `src/lib/model-config.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `COMBO_MODEL_ID: string` — used by Tasks 2, 3, 4, 5, 6, 7, 8

- [ ] **Step 1: Write the failing test**

Create `src/lib/model-config.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { COMBO_MODEL_ID } from "./model-config";

describe("model-config", () => {
	it("exports COMBO_MODEL_ID as novaplan-combo", () => {
		expect(COMBO_MODEL_ID).toBe("novaplan-combo");
	});

	it("does not export ALL_MODELS", async () => {
		const mod = await import("./model-config");
		expect("ALL_MODELS" in mod).toBe(false);
	});

	it("does not export tier-related symbols", async () => {
		const mod = await import("./model-config");
		expect("TIER_ORDER" in mod).toBe(false);
		expect("TIER_LABELS" in mod).toBe(false);
		expect("isModelUnlocked" in mod).toBe(false);
		expect("getUnlockedModelIds" in mod).toBe(false);
		expect("DEFAULT_MODEL_ID" in mod).toBe(false);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/model-config.test.ts`
Expected: FAIL — `COMBO_MODEL_ID` not exported, old symbols still exist

- [ ] **Step 3: Rewrite model-config.ts**

Replace entire contents of `src/lib/model-config.ts`:

```typescript
/**
 * AI Model Configuration
 *
 * NovaPlan uses a single 9Router combo that handles model selection
 * and fallback internally. No user-facing model picker.
 */

/** 9Router combo ID — routes to best available model via Fallback strategy */
export const COMBO_MODEL_ID = "novaplan-combo";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/model-config.test.ts`
Expected: PASS (all 3 tests green)

- [ ] **Step 5: Commit**

```bash
git add src/lib/model-config.ts src/lib/model-config.test.ts
git commit -m "refactor(model-config): replace model list with static combo ID"
```

---

### Task 2: Simplify ai-orchestrator.ts

**Files:**
- Modify: `src/lib/services/ai-orchestrator.ts`

**Interfaces:**
- Consumes: `COMBO_MODEL_ID` from Task 1
- Produces: `selectModels(): string[]` (no params), `tryStreamWithFallback()` (unchanged signature)

- [ ] **Step 1: Write the failing test**

Create `src/lib/services/ai-orchestrator.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { selectModels } from "./ai-orchestrator";

describe("selectModels", () => {
	it("returns array with single combo ID", () => {
		const models = selectModels();
		expect(models).toEqual(["novaplan-combo"]);
	});

	it("accepts no parameters", () => {
		// @ts-expect-error — should have zero params
		expect(() => selectModels("free")).not.toThrow();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/services/ai-orchestrator.test.ts`
Expected: FAIL — current `selectModels` requires `plan` param

- [ ] **Step 3: Rewrite ai-orchestrator.ts**

Replace entire contents of `src/lib/services/ai-orchestrator.ts`:

```typescript
/**
 * AI streaming orchestration — simplified for combo routing.
 * 9Router handles model selection + fallback via novaplan-combo.
 */
import { type StreamOutcome, streamChat } from "@/lib/ai-client";
import { COMBO_MODEL_ID } from "@/lib/model-config";

/** Returns single-element array with combo ID. No plan/model params needed. */
export function selectModels(): string[] {
	return [COMBO_MODEL_ID];
}

export async function tryStreamWithFallback(
	models: string[],
	messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
	externalSignal?: AbortSignal,
	maxTokens?: number,
	onThinking?: (text: string) => void,
): Promise<{
	generator: AsyncGenerator<string, void, undefined>;
	firstChunk: string;
	abortController: AbortController;
	outcome: StreamOutcome;
}> {
	let lastError = "";

	for (let i = 0; i < models.length; i++) {
		const modelToTry = models[i];
		const abortController = new AbortController();
		if (externalSignal) {
			if (externalSignal.aborted) abortController.abort();
			else
				externalSignal.addEventListener(
					"abort",
					() => abortController.abort(),
					{ once: true },
				);
		}
		const outcome: StreamOutcome = {};
		const gen = streamChat(
			messages,
			modelToTry,
			abortController.signal,
			maxTokens,
			outcome,
			onThinking,
		);

		try {
			const first = await gen.next();

			if (first.done || typeof first.value !== "string" || !first.value) {
				throw new Error("Respons kosong dari chunk model.");
			}

			return {
				generator: gen,
				firstChunk: first.value,
				abortController,
				outcome,
			};
		} catch (e) {
			lastError = e instanceof Error ? e.message : String(e);
			abortController.abort();
			await gen.return().catch(() => {});
		}
	}

	throw new Error(
		`Semua model AI sedang tidak tersedia. Coba lagi dalam beberapa menit. (${lastError})`,
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/services/ai-orchestrator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/ai-orchestrator.ts src/lib/services/ai-orchestrator.test.ts
git commit -m "refactor(ai-orchestrator): remove plan/model params, use combo"
```

---

### Task 3: Update constants.ts

**Files:**
- Modify: `src/lib/constants.ts`

**Interfaces:**
- Consumes: `COMBO_MODEL_ID` from Task 1
- Produces: `AI_MODELS` object with combo-based values — used by `ai-client.ts`

- [ ] **Step 1: Edit constants.ts**

Replace lines 1-15 of `src/lib/constants.ts`:

```typescript
import { COMBO_MODEL_ID } from "@/lib/model-config";

const NINE_ROUTER_URL = process.env.NINE_ROUTER_URL || "http://localhost:20128";
export const ROUTER_BASE_URL = `${NINE_ROUTER_URL}/v1`;

// ponytail: all keys point to same combo — 9Router handles routing internally
export const AI_MODELS = {
	primary: COMBO_MODEL_ID,
	fallback: COMBO_MODEL_ID,
	premium: COMBO_MODEL_ID,
} as const;
```

Lines 17-24 (`RATE_LIMITS`, `RATE_LIMIT_WINDOW_MS`) stay unchanged.

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: PASS (no broken imports from removed `ALL_MODELS`/`DEFAULT_MODEL_ID`)

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "refactor(constants): use combo ID for all AI model slots"
```

---

### Task 4: Update API routes to remove model preference

**Files:**
- Modify: `src/routes/api/chat.ts:148-151`
- Modify: `src/routes/api/ac/generate.ts:109`
- Modify: `src/routes/api/task/generate.ts:112`
- Modify: `src/routes/api/ask/options.ts:85`

**Interfaces:**
- Consumes: `selectModels()` with no params from Task 2

- [ ] **Step 1: Edit chat.ts**

In `src/routes/api/chat.ts`, replace lines 148-151:

```typescript
				const modelsToTry = selectModels();
```

Also remove `preferences?.model` from request body parsing if present. Find where `preferences` is destructured and remove the `model` field usage.

- [ ] **Step 2: Edit ac/generate.ts**

In `src/routes/api/ac/generate.ts`, replace line 109:

```typescript
	const modelsToTry = selectModels();
```

Remove `model` variable extraction from request body if present.

- [ ] **Step 3: Edit task/generate.ts**

In `src/routes/api/task/generate.ts`, replace line 112:

```typescript
	const modelsToTry = selectModels();
```

Remove `model` variable extraction from request body if present.

- [ ] **Step 4: Edit ask/options.ts**

In `src/routes/api/ask/options.ts`, replace line 85:

```typescript
	const modelsToTry = selectModels();
```

Remove `model` variable extraction from request body if present.

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/routes/api/chat.ts src/routes/api/ac/generate.ts src/routes/api/task/generate.ts src/routes/api/ask/options.ts
git commit -m "refactor(api): remove model preference from all generation endpoints"
```

---

### Task 5: Delete model-dropdown.tsx

**Files:**
- Delete: `src/components/chat/model-dropdown.tsx`

**Interfaces:**
- Consumes: nothing (file deleted)
- Produces: nothing — callers updated in Tasks 6, 7

- [ ] **Step 1: Verify no other importers beyond known ones**

Run: `grep -r "model-dropdown" src/ --include="*.ts" --include="*.tsx" -l`
Expected output (known callers only):
```
src/components/chat/chat-panel.tsx
src/components/chat/resume-error-modal.tsx
```

If any OTHER files appear, add them to Task 6 or 7 scope.

- [ ] **Step 2: Delete the file**

```bash
rm src/components/chat/model-dropdown.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/model-dropdown.tsx
git commit -m "chore: delete unused ModelDropdown component"
```

Note: Build will fail until Tasks 6+7 remove imports. That's expected — atomic per-layer.

---

### Task 6: Clean chat-panel.tsx

**Files:**
- Modify: `src/components/chat/chat-panel.tsx`

**Interfaces:**
- Consumes: `COMBO_MODEL_ID` from Task 1 (if needed for resume call)
- Produces: cleaned component with no model selection UI/state

- [ ] **Step 1: Remove ModelDropdown import**

Delete line 26:
```typescript
import { ModelDropdown } from "./model-dropdown";
```

- [ ] **Step 2: Remove ALL_MODELS/DEFAULT_MODEL_ID import**

Delete line 12:
```typescript
import { ALL_MODELS, DEFAULT_MODEL_ID } from "@/lib/model-config";
```

- [ ] **Step 3: Remove selectedModel state**

Delete line 201:
```typescript
	const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
```

- [ ] **Step 4: Remove sessionStorage restore effect**

Delete lines 266-271:
```typescript
		const storedModel = sessionStorage.getItem("novaplan:selected-model");
		if (storedModel && ALL_MODELS.some((m) => m.id === storedModel)) {
			setSelectedModel(storedModel);
		}
```

- [ ] **Step 5: Remove model from handleSend**

At line 747, remove:
```typescript
			const model = sessionStorage.getItem("novaplan:selected-model");
```

And remove `model` from the POST body/preferences object in the same function.

- [ ] **Step 6: Remove model from handleResumePRD**

At line 766, remove:
```typescript
			sessionStorage.setItem("novaplan:selected-model", newModelId);
```

Change `handleResumePRD` signature: remove `newModelId` parameter. The function should just retry with combo (no model arg needed).

- [ ] **Step 7: Remove model from handleSendWithMessage**

At line 845, remove:
```typescript
			const model = sessionStorage.getItem("novaplan:selected-model");
```

And remove `model` from the POST body/preferences object.

- [ ] **Step 8: Remove ModelDropdown render**

Delete lines 1093-1099 (the `<ModelDropdown ... />` JSX block).

- [ ] **Step 9: Update ResumeErrorModal props**

At line ~1165, change:
```typescript
<ResumeErrorModal
    ...
    currentModelId={selectedModel}
/>
```
to:
```typescript
<ResumeErrorModal
    ...
/>
```

(Remove `currentModelId` prop — Task 7 simplifies the modal.)

- [ ] **Step 10: Verify build**

Run: `pnpm build`
Expected: May fail due to resume-error-modal still importing deleted model-dropdown. Fixed in Task 7.

- [ ] **Step 11: Commit**

```bash
git add src/components/chat/chat-panel.tsx
git commit -m "refactor(chat-panel): remove model selection UI and state"
```

---

### Task 7: Simplify resume-error-modal.tsx

**Files:**
- Modify: `src/components/chat/resume-error-modal.tsx`

**Interfaces:**
- Consumes: nothing model-related
- Produces: simplified modal with retry-only behavior

- [ ] **Step 1: Rewrite resume-error-modal.tsx**

Replace entire contents of `src/components/chat/resume-error-modal.tsx`:

```tsx
"use client";

import { AlertCircle, Play, X } from "lucide-react";

interface ResumeErrorModalProps {
	isOpen: boolean;
	onClose: () => void;
	onResume: () => void;
	errorMessage: string;
}

export function ResumeErrorModal({
	isOpen,
	onClose,
	onResume,
	errorMessage,
}: ResumeErrorModalProps) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md overflow-hidden rounded-xl bg-obsidian shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="p-6">
					<div className="flex items-start justify-between mb-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-crimson/10 text-crimson">
							<AlertCircle size={24} strokeWidth={2} />
						</div>
						<button
							onClick={onClose}
							className="text-fog transition-colors hover:text-snow"
						>
							<X size={20} />
						</button>
					</div>

					<h3 className="mb-2 mt-2 font-inter text-xl font-[510] text-snow">
						AI Sedang Sibuk / Terputus
					</h3>
					<p className="mb-4 font-inter text-sm leading-relaxed text-fog">
						{errorMessage || "Terjadi kesalahan saat menyusun PRD."}
					</p>
					<div className="mb-6 rounded-md bg-indigo/10 p-3 shadow-[inset_0_0_0_1px_rgba(94,106,210,0.35)]">
						<p className="font-inter text-xs text-mist">
							💡 <strong>Rekomendasi:</strong> PRD yang terpotong masih
							tersimpan. Klik Lanjutkan untuk meneruskan penulisan dari bagian
							terakhir.
						</p>
					</div>

					<div className="flex flex-col gap-3 mt-6">
						<button
							onClick={onResume}
							className="btn-primary flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 font-inter text-sm font-[510] transition-all hover:brightness-105"
						>
							<Play size={16} fill="currentColor" />
							Lanjutkan Generate
						</button>
						<button
							onClick={onClose}
							className="w-full rounded-md bg-charcoal px-4 py-3 text-center font-inter text-sm font-[510] text-mist shadow-[var(--shadow-inset)] transition-colors hover:bg-white/5"
						>
							Batal
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: PASS (chat-panel + resume-error-modal now consistent)

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/resume-error-modal.tsx
git commit -m "refactor(resume-error-modal): remove model picker, simplify to retry"
```

---

### Task 8: Clean chat-input.tsx

**Files:**
- Modify: `src/components/layout/chat-input.tsx`

**Interfaces:**
- Consumes: nothing model-related
- Produces: cleaned input component with no model selector

- [ ] **Step 1: Remove model-config imports**

Delete lines 13-18:
```typescript
	ALL_MODELS,
	DEFAULT_MODEL_ID,
	findModel,
	isModelUnlocked,
	TIER_ORDER,
} from "@/lib/model-config";
```

Keep any other imports from the same module if they exist (unlikely).

- [ ] **Step 2: Remove model state variables**

Delete lines 76-77:
```typescript
	const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
	const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
```

- [ ] **Step 3: Remove sessionStorage restore effect**

Delete lines 91-97:
```typescript
	useEffect(() => {
		// Restore preferred model if exists
		const storedModel = sessionStorage.getItem("novaplan:selected-model");
		if (storedModel && ALL_MODELS.some((m) => m.id === storedModel)) {
			setSelectedModel(storedModel);
		}
	}, []);
```

- [ ] **Step 4: Remove click-outside handler for dropdown**

Delete lines 99-110:
```typescript
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsModelDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);
```

- [ ] **Step 5: Remove dropdownRef**

Delete line 81:
```typescript
	const dropdownRef = useRef<HTMLDivElement>(null);
```

Check if `useRef` import can be cleaned up (only if no other refs in component).

- [ ] **Step 6: Remove model selector JSX**

Delete lines 274-393 (entire `{/* Model Selector */}` block including `<div ref={dropdownRef}>` through closing `</div>`).

- [ ] **Step 7: Remove selectedModelMeta derivation**

Find and delete any `selectedModelMeta` variable (likely derived via `findModel(selectedModel)`). Also remove `ModelIcon` import if no longer used in this file.

- [ ] **Step 8: Remove sessionStorage write on send**

Find `sessionStorage.setItem("novaplan:selected-model"` and delete that line.

- [ ] **Step 9: Remove Lock, Check, ChevronDown imports if unused**

Check if these icons are used elsewhere in the file. If only used by model selector, remove their imports.

- [ ] **Step 10: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/components/layout/chat-input.tsx
git commit -m "refactor(chat-input): remove inline model selector"
```

---

### Task 9: Clean sessionStorage reads in remaining files

**Files:**
- Modify: `src/app/ask/ask-flow.tsx:119`
- Modify: `src/components/ac/ac-detail.tsx:101`
- Modify: `src/components/task/task-detail.tsx:107`

**Interfaces:**
- Consumes: nothing
- Produces: cleaned API calls without model preference

- [ ] **Step 1: Edit ask-flow.tsx**

At line 119, change:
```typescript
sessionStorage.getItem("novaplan:selected-model") || undefined,
```
to:
```typescript
undefined,
```

Or remove the argument entirely if the receiving function signature changed in Task 4.

- [ ] **Step 2: Edit ac-detail.tsx**

At line 101, change:
```typescript
model: sessionStorage.getItem("novaplan:selected-model") || undefined,
```
to:
```typescript
// ponytail: model selection removed — 9Router combo handles routing
```

Or remove the `model` key from the object entirely.

- [ ] **Step 3: Edit task-detail.tsx**

At line 107, change:
```typescript
model: sessionStorage.getItem("novaplan:selected-model") || undefined,
```
to remove the `model` key entirely.

- [ ] **Step 4: Final grep verification**

Run: `grep -r "novaplan:selected-model\|selectedModel\|ALL_MODELS\|DEFAULT_MODEL_ID\|isModelUnlocked\|getUnlockedModelIds\|TIER_ORDER\|TIER_LABELS\|model-dropdown\|ModelDropdown" src/ --include="*.ts" --include="*.tsx" -l`
Expected: NO output (all references removed)

If `model-icon.tsx` appears (it imports `findModel`), that's OK — `findModel` was removed but `model-icon.tsx` may need its own cleanup. Check if `model-icon.tsx` is still imported anywhere. If not used, delete it too. If used, update it to not depend on removed exports.

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 6: Run full test suite**

Run: `pnpm vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/app/ask/ask-flow.tsx src/components/ac/ac-detail.tsx src/components/task/task-detail.tsx
git commit -m "refactor: remove all sessionStorage model reads"
```

---

### Task 10: Final verification and cleanup

**Files:**
- None modified — verification only

- [ ] **Step 1: Full build**

Run: `pnpm build`
Expected: PASS, no warnings about missing exports

- [ ] **Step 2: Full test suite**

Run: `pnpm vitest run`
Expected: All tests pass

- [ ] **Step 3: Grep for any remaining model selection artifacts**

Run: `grep -rn "selected-model\|selectedModel\|ModelDropdown\|model-dropdown\|ALL_MODELS\|DEFAULT_MODEL_ID\|TIER_ORDER\|TIER_LABELS\|isModelUnlocked\|getUnlockedModelIds" src/ --include="*.ts" --include="*.tsx"`
Expected: NO output

- [ ] **Step 4: Visual verification**

Start dev server: `pnpm dev`
Open browser to `http://localhost:3000`
Verify:
- Landing page: no model dropdown visible
- Chat panel: no model dropdown visible
- Resume error modal: shows retry button only, no model picker

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup after model selection removal"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 14 files from deep audit mapped to tasks. Combo ID replaces all model selection. Credit system untouched.
- [x] **Placeholder scan:** No TBD/TODO/implement-later. All code blocks complete.
- [x] **Type consistency:** `selectModels()` signature consistent across Tasks 2+4. `ResumeErrorModal` props consistent across Tasks 6+7. `COMBO_MODEL_ID` name consistent everywhere.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-18-remove-model-selection.md`. Two execution options:

**1. Subagent-Driven (recommended)** - Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

</content>