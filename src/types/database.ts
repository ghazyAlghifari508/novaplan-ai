import type { FlowStep } from "@/lib/flow-step";

export type Plan = "free" | "pro" | "hengker";

export type ProjectStatus = "draft" | "completed" | "archived";

export type ProjectMode = "ai_auto" | "manual";

export interface User {
	id: string;
	email: string;
	full_name: string | null;
	avatar_url: string | null;
	role: string;
	provider: string;
	created_at: string;
	updated_at: string;
}

export type StepStatus = "pending" | "generating" | "completed" | "failed";
export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Project {
	id: string;
	user_id: string;
	name: string;
	description: string | null;
	status: ProjectStatus;
	mode: ProjectMode | null;
	preferences: Record<string, unknown> | null;
	share_token: string | null;
	is_shared: boolean;
	step: FlowStep;
	ac_status: StepStatus;
	task_status: StepStatus;
	created_at: string;
	updated_at: string;
}

export interface PrdVersion {
	id: string;
	project_id: string;
	version: number;
	content: string;
	storage_path: string | null;
	change_summary: string | null;
	created_at: string;
}

export interface Message {
	id: string;
	conversation_id: string;
	role: "user" | "assistant" | "system";
	content: string;
	metadata: Record<string, unknown> | null;
	created_at: string;
}

export interface Payment {
	id: string;
	userId: string;
	orderId: string;
	plan: Plan;
	amount: number | null;
	status: string;
	createdAt: string;
	updatedAt: string;
}

/** Credits granted per tier. 1 credit = 1 stage (PRD, AC, or Task). Never expires. */
export const PLAN_CREDITS: Record<Plan, number> = {
	free: 2,
	pro: 30,
	hengker: 105,
};

/** One-time price in IDR. No billing cycle. */
export const PLAN_PRICES: Record<Plan, number> = {
	free: 0,
	pro: 49000,
	hengker: 149000,
};

export interface NotificationPreferences {
	id: string;
	userId: string;
	quotaWarning: boolean;
	prdCompleted: boolean;
	paymentUpdates: boolean;
	productUpdates: boolean;
	createdAt: Date | null;
	updatedAt: Date | null;
}

export const FEATURES: Record<
	Plan,
	{
		downloadMd: boolean;
		shareLink: boolean;
		/** false = locked, number = version cap, -1 = unlimited */
		versionHistory: false | number;
		priorityQueue: boolean;
		/** AC + Task + Kanban. Free is PRD-only. */
		fullWorkflow: boolean;
	}
> = {
	free: {
		downloadMd: true,
		shareLink: false,
		versionHistory: false,
		priorityQueue: false,
		fullWorkflow: false,
	},
	pro: {
		downloadMd: true,
		shareLink: true,
		versionHistory: 30,
		priorityQueue: false,
		fullWorkflow: true,
	},
	hengker: {
		downloadMd: true,
		shareLink: true,
		versionHistory: -1,
		priorityQueue: true,
		fullWorkflow: true,
	},
};

// ============================================================
// VibeCoding platform tables (migration 20260720120000)
// ============================================================

export interface ApiKey {
	id: string;
	user_id: string;
	name: string;
	key_prefix: string;
	/** SHA-256 hex of the full raw key - never expose in API responses */
	key_hash: string;
	scopes: string[];
	last_used_at: string | null;
	expires_at: string | null;
	created_at: string;
}
