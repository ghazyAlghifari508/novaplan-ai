# Admin Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the admin panel navigation from a vertical sidebar to a modern horizontal top navbar with tabs and Streamer Mode, and build an interactive dual-axis 7-day trend SVG line chart and updated overview dashboard matching the reference design.

**Architecture:** A lightweight React Context handles persistent Streamer Mode state and masking. The server service (`admin-service.ts`) aggregates daily payments and user signups with a zero-filled date range guarantee. A custom zero-dependency SVG line chart renders smooth cubic bezier splines with dual independent Y-axes. The admin shell layout (`admin-client.tsx`) is transformed from a sidebar layout into a sticky top-bar header with real-time counter badges.

**Tech Stack:** React 19, TanStack Start + Router, Drizzle ORM + PostgreSQL 17, Tailwind CSS v4, Lucide React, Vitest.

**Spec:** [`docs/superpowers/specs/2026-08-27-admin-panel-redesign.md`](file:///C:/Coding/Web/Development/Tanstack-start/prdfy/docs/superpowers/specs/2026-08-27-admin-panel-redesign.md)

## Global Constraints

- **Language**: Indonesian for UI labels and explanations; English for code, functions, types, and git commits (Rule no-assumptions #9).
- **No-Hardcode**: All metrics and dates must be calculated dynamically from the database, never hardcoded dummy series (Rule no-hardcode #1, #7).
- **Masking**: Generic structural masking rules, not hardcoded strings (Rule no-hardcode #6).
- **Server-Only Boundary**: Dynamic imports of `@/db` inside server function handlers, never at module top-level (Context Rule #2).
- **Zero-Dependency Chart**: Custom pure SVG to prevent React 19 peer-dependency issues.
- **PowerShell Syntax**: Use `;` between commands, not `&&`.

---

### Task 1: Streamer Mode Context & Masking Utilities

**Files:**
- Create: `src/components/admin/streamer-mode-context.tsx`
- Test: `src/components/admin/streamer-mode-context.test.tsx`

**Interfaces:**
- Produces:
  - `StreamerModeProvider: ({ children }: { children: React.ReactNode }) => JSX.Element`
  - `useStreamerMode: () => { isStreamerMode: boolean; toggleStreamerMode: () => void; maskCurrency: (val: number | string) => string; maskOrderId: (id: string) => string; maskName: (name: string | null | undefined) => string; maskEmail: (email: string | null | undefined) => string; }`
  - `maskCurrency(val: number | string, isMasked: boolean): string`
  - `maskOrderId(id: string, isMasked: boolean): string`
  - `maskName(name: string | null | undefined, isMasked: boolean): string`
  - `maskEmail(email: string | null | undefined, isMasked: boolean): string`

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/streamer-mode-context.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import {
	maskCurrency,
	maskEmail,
	maskName,
	maskOrderId,
} from "./streamer-mode-context";

describe("Streamer Mode Masking Utilities", () => {
	it("masks currency amounts correctly when active", () => {
		expect(maskCurrency(299700, true)).toBe("••••••••");
		expect(maskCurrency(0, true)).toBe("••••••••");
		expect(maskCurrency(299700, false)).toContain("299.700");
	});

	it("masks order ids keeping prefix and last 2 digits", () => {
		expect(maskOrderId("INV-VQWTQW-123494", true)).toBe("INV-VQWTQW-•••94");
		expect(maskOrderId("INV-94", true)).toBe("INV-•••94");
		expect(maskOrderId("INV-VQWTQW-123494", false)).toBe("INV-VQWTQW-123494");
	});

	it("masks user names keeping initial and ending letters", () => {
		expect(maskName("John Doe", true)).toBe("J • • • e");
		expect(maskName("Alice", true)).toBe("A • • • e");
		expect(maskName("Al", true)).toBe("A • • • l");
		expect(maskName("A", true)).toBe("A • • •");
		expect(maskName(null, true)).toBe("Anonymous");
		expect(maskName("John Doe", false)).toBe("John Doe");
	});

	it("masks user emails keeping domain structure anonymous", () => {
		expect(maskEmail("alghifari@gmail.com", true)).toBe("a••••@••••.com");
		expect(maskEmail(null, true)).toBe("—");
		expect(maskEmail("alghifari@gmail.com", false)).toBe("alghifari@gmail.com");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/admin/streamer-mode-context.test.tsx`  
Expected: FAIL (module `./streamer-mode-context` does not exist).

- [ ] **Step 3: Implement Streamer Mode Context and Masking Functions**

Create `src/components/admin/streamer-mode-context.tsx`:
```tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

const STORAGE_KEY = "prdfy_admin_streamer_mode";

export function maskCurrency(val: number | string, isMasked: boolean): string {
	if (isMasked) return "••••••••";
	const num = typeof val === "string" ? Number.parseFloat(val) || 0 : val;
	return formatCurrency(num);
}

export function maskOrderId(id: string, isMasked: boolean): string {
	if (!isMasked || !id) return id;
	const parts = id.split("-");
	if (parts.length <= 1) {
		return id.length > 4 ? `${id.slice(0, 2)}•••${id.slice(-2)}` : "••••";
	}
	const lastPart = parts[parts.length - 1];
	const maskedLast =
		lastPart.length > 2 ? `•••${lastPart.slice(-2)}` : `•••${lastPart}`;
	return `${parts.slice(0, -1).join("-")}-${maskedLast}`;
}

export function maskName(
	name: string | null | undefined,
	isMasked: boolean,
): string {
	if (!name) return isMasked ? "Anonymous" : "Anonymous";
	if (!isMasked) return name;
	const trimmed = name.trim();
	if (trimmed.length <= 1) return `${trimmed} • • •`;
	return `${trimmed[0]} • • • ${trimmed[trimmed.length - 1]}`;
}

export function maskEmail(
	email: string | null | undefined,
	isMasked: boolean,
): string {
	if (!email) return "—";
	if (!isMasked) return email;
	const [local, domain] = email.split("@");
	if (!domain) return "••••";
	const domainParts = domain.split(".");
	const ext = domainParts.length > 1 ? domainParts[domainParts.length - 1] : "com";
	const firstChar = local?.[0] ?? "u";
	return `${firstChar}••••@••••.${ext}`;
}

interface StreamerModeContextType {
	isStreamerMode: boolean;
	toggleStreamerMode: () => void;
	maskCurrency: (val: number | string) => string;
	maskOrderId: (id: string) => string;
	maskName: (name: string | null | undefined) => string;
	maskEmail: (email: string | null | undefined) => string;
}

const StreamerModeContext = createContext<StreamerModeContextType>({
	isStreamerMode: false,
	toggleStreamerMode: () => {},
	maskCurrency: (v) => maskCurrency(v, false),
	maskOrderId: (id) => maskOrderId(id, false),
	maskName: (n) => maskName(n, false),
	maskEmail: (e) => maskEmail(e, false),
});

export function StreamerModeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isStreamerMode, setIsStreamerMode] = useState<boolean>(false);

	useEffect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved !== null) {
				setIsStreamerMode(saved === "true");
			}
		} catch {
			// Ignore localStorage access errors
		}
	}, []);

	const toggleStreamerMode = () => {
		setIsStreamerMode((prev) => {
			const next = !prev;
			try {
				localStorage.setItem(STORAGE_KEY, String(next));
			} catch {
				// Ignore
			}
			return next;
		});
	};

	return (
		<StreamerModeContext.Provider
			value={{
				isStreamerMode,
				toggleStreamerMode,
				maskCurrency: (v) => maskCurrency(v, isStreamerMode),
				maskOrderId: (id) => maskOrderId(id, isStreamerMode),
				maskName: (n) => maskName(n, isStreamerMode),
				maskEmail: (e) => maskEmail(e, isStreamerMode),
			}}
		>
			{children}
		</StreamerModeContext.Provider>
	);
}

export function useStreamerMode() {
	return useContext(StreamerModeContext);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/admin/streamer-mode-context.test.tsx`  
Expected: PASS (4/4 tests pass).

- [ ] **Step 5: Commit**

Run:
```powershell
git add src/components/admin/streamer-mode-context.tsx src/components/admin/streamer-mode-context.test.tsx; git commit -m "feat(admin): add streamer mode context and masking utilities"
```

---

### Task 2: Daily Trend Aggregation and Extended Admin Metrics

**Files:**
- Modify: `src/lib/services/admin-service.ts`
- Create: `src/lib/services/admin-trend-utils.ts`
- Test: `src/lib/services/admin-trend-utils.test.ts`

**Interfaces:**
- Produces:
  - `export interface DailyTrendPoint { date: string; label: string; revenue: number; newUsers: number; }`
  - `export interface AdminTransactionItem { id: string; orderId: string; plan: string; amount: number; status: string; userName: string | null; createdAt: Date | null; }`
  - `buildDateRangeSeries(days: number): { date: string; label: string }[]`
  - `mergeTrendData(dateSeries: { date: string; label: string }[], revenueRows: { day: string; total: number }[], userRows: { day: string; count: number }[]): DailyTrendPoint[]`
  - `getAdminTrendMetrics({ data: { days: number } })` (Server function)
  - Extended `getAdminDashboardMetrics` with `currentMonthRevenue`, `recentTransactions`, and initial 7-day `trendData`.

- [ ] **Step 1: Write the failing test for date normalization and trend merging**

Create `src/lib/services/admin-trend-utils.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import {
	buildDateRangeSeries,
	mergeTrendData,
} from "./admin-trend-utils";

describe("Admin Trend Utils", () => {
	it("builds a continuous date range series of length N", () => {
		const series = buildDateRangeSeries(7);
		expect(series).toHaveLength(7);
		expect(series[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(series[0].label).toBeTruthy();
	});

	it("merges database rows into continuous series with 0-padding for missing dates", () => {
		const series = [
			{ date: "2026-08-20", label: "20 Agu" },
			{ date: "2026-08-21", label: "21 Agu" },
			{ date: "2026-08-22", label: "22 Agu" },
		];
		const revenueRows = [{ day: "2026-08-21", total: 150000 }];
		const userRows = [
			{ day: "2026-08-20", count: 2 },
			{ day: "2026-08-21", count: 5 },
		];

		const merged = mergeTrendData(series, revenueRows, userRows);
		expect(merged).toHaveLength(3);
		expect(merged[0]).toEqual({
			date: "2026-08-20",
			label: "20 Agu",
			revenue: 0,
			newUsers: 2,
		});
		expect(merged[1]).toEqual({
			date: "2026-08-21",
			label: "21 Agu",
			revenue: 150000,
			newUsers: 5,
		});
		expect(merged[2]).toEqual({
			date: "2026-08-22",
			label: "22 Agu",
			revenue: 0,
			newUsers: 0,
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/services/admin-trend-utils.test.ts`  
Expected: FAIL (module not found).

- [ ] **Step 3: Implement admin trend utils**

Create `src/lib/services/admin-trend-utils.ts`:
```typescript
const MONTH_NAMES = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"Mei",
	"Jun",
	"Jul",
	"Agu",
	"Sep",
	"Okt",
	"Nov",
	"Des",
];

export interface DailyTrendPoint {
	date: string;
	label: string;
	revenue: number;
	newUsers: number;
}

export function formatDateKey(d: Date): string {
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

export function formatDateLabel(d: Date): string {
	const day = d.getDate();
	const month = MONTH_NAMES[d.getMonth()];
	return `${day} ${month}`;
}

export function buildDateRangeSeries(days: number): {
	date: string;
	label: string;
}[] {
	const series: { date: string; label: string }[] = [];
	const now = new Date();

	for (let i = days - 1; i >= 0; i--) {
		const target = new Date(now);
		target.setDate(target.getDate() - i);
		series.push({
			date: formatDateKey(target),
			label: formatDateLabel(target),
		});
	}

	return series;
}

export function mergeTrendData(
	dateSeries: { date: string; label: string }[],
	revenueRows: { day: string; total: number }[],
	userRows: { day: string; count: number }[],
): DailyTrendPoint[] {
	const revMap = new Map<string, number>();
	for (const r of revenueRows) {
		revMap.set(r.day, Number(r.total) || 0);
	}

	const userMap = new Map<string, number>();
	for (const u of userRows) {
		userMap.set(u.day, Number(u.count) || 0);
	}

	return dateSeries.map((s) => ({
		date: s.date,
		label: s.label,
		revenue: revMap.get(s.date) ?? 0,
		newUsers: userMap.get(s.date) ?? 0,
	}));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/services/admin-trend-utils.test.ts`  
Expected: PASS.

- [ ] **Step 5: Update `src/lib/services/admin-service.ts` to include trend & recent transactions**

Modify `src/lib/services/admin-service.ts`:
1. Add `AdminTransactionItem`, `DailyTrendPoint`, and extend `AdminDashboardMetrics`:
```typescript
import {
	buildDateRangeSeries,
	type DailyTrendPoint,
	mergeTrendData,
} from "@/lib/services/admin-trend-utils";

export type { DailyTrendPoint };

export interface AdminTransactionItem {
	id: string;
	orderId: string;
	plan: string;
	amount: number;
	status: string;
	userName: string | null;
	userEmail: string | null;
	createdAt: Date | null;
}

export interface AdminDashboardMetrics {
	usersCount: number;
	projectsCount: number;
	prdCount: number;
	acCount: number;
	tasksCount: number;
	feedbackCount: number;
	errorCount: number;
	totalRevenue: number;
	currentMonthRevenue: number;
	planDistribution: { plan: string; count: number }[];
	recentProjects: {
		id: string;
		name: string;
		step: string | null;
		userName: string | null;
		userEmail: string | null;
		createdAt: Date | null;
	}[];
	recentTransactions: AdminTransactionItem[];
	trendData: DailyTrendPoint[];
}
```
2. In `getAdminDashboardMetrics`:
- Calculate `currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)`.
- Query `currentMonthRevenue`:
  `db.select({ total: sql<number>'coalesce(sum(${payments.amount}), 0)' }).from(payments).where(sql'${payments.createdAt} >= ${currentMonthStart} AND ${payments.status} IN ('paid', 'settlement', 'success')')`
- Query `recentTransactions`:
  `db.select({ id: payments.id, orderId: payments.orderId, plan: payments.plan, amount: payments.amount, status: payments.status, userName: users.name, userEmail: users.email, createdAt: payments.createdAt }).from(payments).leftJoin(users, eq(users.id, payments.userId)).orderBy(desc(payments.createdAt)).limit(5)`
- Query initial 7-day trend data using `buildDateRangeSeries(7)` and `mergeTrendData`.
3. Add `getAdminTrendMetrics`:
```typescript
export const getAdminTrendMetrics = createServerFn({ method: "GET" })
	.validator((data: { days?: number } = {}) => data ?? {})
	.handler(async ({ data }) => {
		await requireAdmin(await getRequestHeaders());
		const { db, payments, users } = await adminDb();
		const days = data.days && [7, 14, 30].includes(data.days) ? data.days : 7;
		const series = buildDateRangeSeries(days);
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - (days - 1));
		startDate.setHours(0, 0, 0, 0);

		const [revenueRows, userRows] = await Promise.all([
			db
				.select({
					day: sql<string>`to_char(${payments.createdAt}, 'YYYY-MM-DD')`,
					total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
				})
				.from(payments)
				.where(
					sql`${payments.createdAt} >= ${startDate} AND ${payments.status} IN ('paid', 'settlement', 'success')`,
				)
				.groupBy(sql`to_char(${payments.createdAt}, 'YYYY-MM-DD')`),
			db
				.select({
					day: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
					count: sql<number>`count(*)`,
				})
				.from(users)
				.where(sql`${users.createdAt} >= ${startDate}`)
				.groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`),
		]);

		return mergeTrendData(
			series,
			revenueRows.map((r) => ({ day: r.day, total: Number(r.total) })),
			userRows.map((u) => ({ day: u.day, count: Number(u.count) })),
		);
	});
```

- [ ] **Step 6: Commit**

Run:
```powershell
git add src/lib/services/admin-trend-utils.ts src/lib/services/admin-trend-utils.test.ts src/lib/services/admin-service.ts; git commit -m "feat(admin): add daily trend aggregation and extended admin metrics"
```

---

### Task 3: Custom Zero-Dependency Responsive SVG Line Chart

**Files:**
- Create: `src/components/admin/trend-line-chart.tsx`
- Create: `src/components/admin/chart-math.ts`
- Test: `src/components/admin/chart-math.test.ts`

**Interfaces:**
- Produces:
  - `generateSplinePath(points: { x: number; y: number }[]): string`
  - `generateAreaPath(points: { x: number; y: number }[], baselineY: number): string`
  - `calculateYScale(values: number[], height: number, paddingTop: number, paddingBottom: number, minCeil?: number): { scale: (v: number) => number; ticks: number[] }`
  - `TrendLineChart: ({ initialData: DailyTrendPoint[]; onRangeChange?: (days: number) => void; isStreamerMode?: boolean; }) => JSX.Element`

- [ ] **Step 1: Write the failing test for chart math and cubic spline generation**

Create `src/components/admin/chart-math.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import {
	calculateYScale,
	generateAreaPath,
	generateSplinePath,
} from "./chart-math";

describe("Chart Geometry Math", () => {
	it("generates smooth SVG cubic bezier path string", () => {
		const points = [
			{ x: 0, y: 100 },
			{ x: 50, y: 50 },
			{ x: 100, y: 0 },
		];
		const path = generateSplinePath(points);
		expect(path).toContain("M 0 100");
		expect(path).toContain("C");
	});

	it("generates closed SVG area path for gradient fill", () => {
		const points = [
			{ x: 0, y: 100 },
			{ x: 100, y: 50 },
		];
		const area = generateAreaPath(points, 200);
		expect(area).toContain("M 0 100");
		expect(area).toContain("L 100 200");
		expect(area).toContain("L 0 200 Z");
	});

	it("calculates balanced Y-axis scale and tick marks with safe minimum ceil", () => {
		const scaleInfo = calculateYScale([0, 150000, 299700], 200, 20, 30);
		expect(scaleInfo.ticks).toHaveLength(5);
		expect(scaleInfo.ticks[0]).toBe(0);
		expect(scaleInfo.ticks[4]).toBeGreaterThanOrEqual(300000);
		expect(scaleInfo.scale(0)).toBe(170); // 200 - 30
		expect(scaleInfo.scale(scaleInfo.ticks[4])).toBe(20);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/admin/chart-math.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement chart math helper**

Create `src/components/admin/chart-math.ts`:
```typescript
export function generateSplinePath(points: { x: number; y: number }[]): string {
	if (points.length === 0) return "";
	if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

	let d = `M ${points[0].x} ${points[0].y}`;

	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[i === 0 ? 0 : i - 1];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

		const cp1x = p1.x + (p2.x - p0.x) / 6;
		const cp1y = p1.y + (p2.y - p0.y) / 6;
		const cp2x = p2.x - (p3.x - p1.x) / 6;
		const cp2y = p2.y - (p3.y - p1.y) / 6;

		d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
	}

	return d;
}

export function generateAreaPath(
	points: { x: number; y: number }[],
	baselineY: number,
): string {
	if (points.length < 2) return "";
	const spline = generateSplinePath(points);
	const lastPoint = points[points.length - 1];
	const firstPoint = points[0];
	return `${spline} L ${lastPoint.x.toFixed(1)} ${baselineY.toFixed(1)} L ${firstPoint.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

export function calculateYScale(
	values: number[],
	height: number,
	paddingTop: number,
	paddingBottom: number,
	minCeil = 4,
): { scale: (v: number) => number; ticks: number[] } {
	const rawMax = Math.max(...values, 0);
	const max = Math.max(rawMax, minCeil);

	// Calculate nice step
	const roughStep = max / 4;
	const power = 10 ** Math.floor(Math.log10(roughStep || 1));
	const normalized = roughStep / power;
	let niceStep = power;
	if (normalized > 5) niceStep = 10 * power;
	else if (normalized > 2) niceStep = 5 * power;
	else if (normalized > 1) niceStep = 2 * power;

	const topTick = Math.max(niceStep * 4, max);
	const ticks = [
		0,
		Math.round(topTick * 0.25),
		Math.round(topTick * 0.5),
		Math.round(topTick * 0.75),
		Math.round(topTick),
	];

	const availableHeight = height - paddingTop - paddingBottom;
	const scale = (val: number) => {
		const ratio = Math.max(0, Math.min(1, val / (topTick || 1)));
		return height - paddingBottom - ratio * availableHeight;
	};

	return { scale, ticks };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/admin/chart-math.test.ts`  
Expected: PASS.

- [ ] **Step 5: Build `TrendLineChart` component**

Create `src/components/admin/trend-line-chart.tsx`:
- Render header with trending icon, title, subtitle.
- Render range selector pill buttons (`7 Hari`, `14 Hari`, `30 Hari`).
- Render legend top right (Revenue: orange, Users: blue).
- SVG element with `viewBox="0 0 1000 340"` and dual Y-axes, smooth bezier curves, gradient defs, hover cursor line, data dots, and floating glassmorphism tooltip.
- Support `useStreamerMode()` to mask currency on hover and legend.

- [ ] **Step 6: Commit**

Run:
```powershell
git add src/components/admin/chart-math.ts src/components/admin/chart-math.test.ts src/components/admin/trend-line-chart.tsx; git commit -m "feat(admin): build custom zero-dependency dual-axis svg trend chart"
```

---

### Task 4: Layout Shell Redesign (`admin-client.tsx`)

**Files:**
- Modify: `src/components/admin/admin-client.tsx`
- Create: `src/components/admin/admin-metric-card.tsx`

**Interfaces:**
- Transforms `AdminClient` to provide `StreamerModeProvider`, sticky top bar, horizontal navigation tabs (`Ringkasan`, `Pengguna`, `Proyek`, `Tiket`, `Transaksi`, `Pengaturan`) with badges, and "Streamer Mode" toggle with an active indicator.
- `AdminMetricCard: ({ label, value, subtext, icon, isCurrency?: boolean }) => JSX.Element`

- [ ] **Step 1: Create `src/components/admin/admin-metric-card.tsx`**

```tsx
import type React from "react";
import { memo } from "react";
import { useStreamerMode } from "@/components/admin/streamer-mode-context";
import { cn } from "@/lib/utils";

interface AdminMetricCardProps {
	label: string;
	value: string | number;
	subtext?: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	isCurrency?: boolean;
	className?: string;
}

export const AdminMetricCard = memo(function AdminMetricCard({
	label,
	value,
	subtext,
	icon: Icon,
	isCurrency = false,
	className,
}: AdminMetricCardProps) {
	const { isStreamerMode, maskCurrency } = useStreamerMode();

	const displayValue = isCurrency
		? isStreamerMode
			? "••••••••"
			: typeof value === "number"
				? maskCurrency(value)
				: value
		: value;

	return (
		<div
			className={cn(
				"rounded-xl border border-graphite bg-charcoal p-4 sm:p-5 shadow-[var(--shadow-inset)] flex flex-col justify-between transition-colors",
				className,
			)}
		>
			<div className="flex items-center justify-between text-fog">
				<span className="text-xs font-medium text-mist">{label}</span>
				<Icon size={16} className="text-fog" />
			</div>
			<div className="mt-3">
				<p className="text-2xl font-light tracking-tight text-snow">
					{displayValue}
				</p>
				{subtext && (
					<p className="mt-1 truncate text-[11px] text-fog">{subtext}</p>
				)}
			</div>
		</div>
	);
});
```

- [ ] **Step 2: Redesign `src/components/admin/admin-client.tsx` to Top-Nav Shell**

Remove sidebar layout and replace with sticky top-nav header:
- Header row 1:
  - Brand "Admin Panel"
  - Link to workspace `/` ("Kembali ke Workspace")
  - Streamer Mode toggle button (with pulse dot and eye icon)
- Header row 2:
  - Tabs with path matching:
    - `/admin` &rarr; `Ringkasan` (Icon: `LayoutDashboard`)
    - `/admin/users` &rarr; `Pengguna` (Icon: `Users`)
    - `/admin/feedback` &rarr; `Tiket` (Icon: `MessageSquare`)
    - Modal or shortcut tabs for `Proyek`, `Transaksi`, `Pengaturan`
- Content area: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6`

- [ ] **Step 3: Commit**

Run:
```powershell
git add src/components/admin/admin-metric-card.tsx src/components/admin/admin-client.tsx; git commit -m "feat(admin): migrate admin layout from sidebar to top-nav shell"
```

---

### Task 5: Overview Dashboard Redesign (`/admin/index.tsx`)

**Files:**
- Modify: `src/routes/admin/index.tsx`

**Features:**
- 5 Metric Summary Cards in top row:
  1. Total Pengguna (`metrics.usersCount`)
  2. Status Pipeline (`metrics.prdCount + metrics.acCount + metrics.tasksCount`)
  3. Proyek Siap (`metrics.projectsCount`)
  4. Tiket Terbuka (`metrics.feedbackCount + metrics.errorCount`)
  5. Pendapatan Bulan Ini (`metrics.currentMonthRevenue`, `isCurrency: true`)
- Interactive Trend Section:
  - `TrendLineChart` with range selector and live data fetching on filter change (`getAdminTrendMetrics`).
- Bottom Section:
  - Card 1: "Transaksi Booster Terbaru" (5 recent payments: Order ID masked, Status, Nominal masked).
  - Card 2: "Proyek Terbaru" (5 recent projects: Name, User masked, Step badge, Open Link).

- [ ] **Step 1: Update `/admin/index.tsx` with the new design**
- [ ] **Step 2: Verify type check with `pnpm check`**
- [ ] **Step 3: Commit**

Run:
```powershell
git add src/routes/admin/index.tsx; git commit -m "feat(admin): overhaul admin overview page with 5 metric cards, trend chart, and masked activity tables"
```

---

### Task 6: Verification & Quality Assurance

- [ ] **Step 1: Run all unit tests**
Run: `pnpm vitest run src/components/admin src/lib/services/admin-trend-utils.test.ts`  
Expected: All tests PASS.

- [ ] **Step 2: Run linter and typecheck**
Run: `pnpm check`  
Expected: 0 errors.

- [ ] **Step 3: Verify in browser**
Check `http://127.0.0.1:3000/admin`:
- Header displays "Admin Panel" and horizontal navigation tabs without sidebar.
- 5 metric cards display properly formatted data.
- Line chart renders dual-axis curved splines, gradient fills, and hover tooltip.
- Streamer Mode toggle button masks sensitive values (order ID, nominal, user names).
- Tab navigation between `Ringkasan`, `Pengguna`, `Tiket` functions smoothly.

- [ ] **Step 4: Commit and Push**
Run:
```powershell
git push origin main
```
