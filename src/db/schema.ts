import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// === TABLES ===
// ponytail: RLS policies dropped - app-level ownership filters (eq(userId, user.id))
// in every query enforce row isolation. Add pgPolicy back if DB-level enforcement
// becomes a requirement (e.g. direct psql access, multi-tenant hardening).

// Users - Better Auth core "user" table (mapped via usePlural). Extra
// columns (fullName/company/role) are app-owned; Better Auth ignores them.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  fullName: text("full_name"),
  company: text("company"),
  role: text("role"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// === BETTER AUTH TABLES ===

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  plan: text("plan").notNull().default("free"), // free, pro, hengker
  status: text("status").notNull().default("active"),
  midtransOrderId: text("midtrans_order_id"),
  subscriptionType: text("subscription_type"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quotas
export const quotas = pgTable("quotas", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  prdUsed: integer("prd_used").default(0),
  prdLimit: integer("prd_limit").default(-1),
  revisionUsed: integer("revision_used").default(0),
  revisionLimit: integer("revision_limit").default(-1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("draft"),
  mode: text("mode").default("ai_auto"),
  step: text("step").default("prd"), // prd, ac, task
  acStatus: text("ac_status").default("pending"),
  taskStatus: text("task_status").default("pending"),
  shareToken: text("share_token"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prd Versions
export const prdVersions = pgTable("prd_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  changeSummary: text("change_summary"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ac Versions
export const acVersions = pgTable("ac_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  changeSummary: text("change_summary"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  projectId: text("project_id").references(() => projects.id),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("pending"),
  priority: text("priority").default("medium"),
  assignee: text("assignee"),
  dependencies: jsonb("dependencies"),
  subtasks: jsonb("subtasks"),
  position: jsonb("position"), // { x, y } for kanban
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Api Keys
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  keyPrefix: text("key_prefix"),
  scopes: text("scopes").array(),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Feedback
export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  message: text("message").notNull(),
  type: text("type").default("general"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Error Reports
export const errorReports = pgTable("error_reports", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  errorMessage: text("error_message").notNull(),
  context: text("context"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rate Limits (kustom selain Better Auth)
export const rateLimits = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  windowStart: timestamp("window_start").notNull(),
  count: integer("count").default(1),
});

// Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  quotaWarning: boolean("quota_warning").notNull().default(true),
  prdCompleted: boolean("prd_completed").notNull().default(true),
  paymentUpdates: boolean("payment_updates").notNull().default(true),
  productUpdates: boolean("product_updates").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments
export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  orderId: text("order_id").notNull().unique(),
  plan: text("plan").notNull(),
  amount: integer("amount"),
  status: text("status").default("pending"),
  midtransResponse: jsonb("midtrans_response"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
