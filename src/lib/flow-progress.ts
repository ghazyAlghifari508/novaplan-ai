/**
 * Flow-step progression + generation-completeness rules.
 *
 * projects.step must reflect the FURTHEST stage a project actually reached.
 * Before this, every writer set step unconditionally, so re-generating AC after
 * Task was done rewound step 'task' -> 'ac' and History sent the user back to
 * the AC page. Step is now monotonic: it only ever moves forward.
 */
import type { FlowStep } from "@/lib/flow-step";

/** Flow order. Index = progress rank; higher wins. */
const STEP_ORDER: FlowStep[] = ["question", "prd", "ac", "task"];

export function stepRank(step: string | null | undefined): number {
  const i = STEP_ORDER.indexOf(step as FlowStep);
  // ponytail: unknown/null ranks as "prd" (the default landing), matching
  // stepToRoute's fallback so rank and route never disagree.
  return i === -1 ? STEP_ORDER.indexOf("prd") : i;
}

/**
 * Furthest of current (DB) and next (what a writer wants to set).
 * Returns null when no write is needed - caller skips the step UPDATE.
 */
export function advanceStep(
  current: string | null | undefined,
  next: FlowStep,
): FlowStep | null {
  return stepRank(next) > stepRank(current) ? next : null;
}

/**
 * True when a streamed generation must NOT be persisted as a new version.
 *
 * A dropped/aborted stream used to be saved anyway, creating a partial version
 * that outranked the complete one (AC v2 = 1440 chars vs v1 = 19818) and became
 * what the viewer showed.
 */
const TRUNCATING_REASONS = new Set(["length", "error", "other", "content-filter"]);

export function isTruncatedGeneration(
  content: string,
  finishReason: string | undefined,
): boolean {
  if (!content.trim()) return true;
  // ponytail: deny-list, not allow-list. undefined/"unknown" means the provider
  // reported nothing - not evidence of truncation, so keep the content the user
  // paid an AI call for. Only explicit failure reasons discard it.
  return finishReason !== undefined && TRUNCATING_REASONS.has(finishReason);
}
