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

export interface Subscription {
  id: string;
  user_id: string;
  plan: Plan;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quota {
  id: string;
  user_id: string;
  plan: Plan;
  prd_used: number;
  prd_limit: number;
  revision_used: number;
  revision_limit: number;
  reset_at: string | null;
}

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

export interface Conversation {
  id: string;
  project_id: string;
  user_id: string;
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
  user_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  midtrans_order_id: string | null;
  midtrans_transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export const PLAN_LIMITS: Record<Plan, { prd: number; revision: number }> = {
  free: { prd: 3, revision: 3 },
  pro: { prd: 25, revision: 20 },
  hengker: { prd: -1, revision: -1 },
};


export interface NotificationPreferences {
  id: string;
  user_id: string;
  quota_warning: boolean;
  prd_completed: boolean;
  payment_updates: boolean;
  product_updates: boolean;
  created_at: string;
  updated_at: string;
}

export const FEATURES: Record<
  Plan,
  {
    downloadMd: boolean;
    shareLink: boolean;
    versionHistory: false | number;
    priorityQueue: boolean;
  }
> = {
  free: {
    downloadMd: true,
    shareLink: false,
    versionHistory: false,
    priorityQueue: false,
  },
  pro: {
    downloadMd: true,
    shareLink: true,
    versionHistory: 30,
    priorityQueue: false,
  },
  hengker: {
    downloadMd: true,
    shareLink: true,
    versionHistory: -1,
    priorityQueue: true,
  },
};