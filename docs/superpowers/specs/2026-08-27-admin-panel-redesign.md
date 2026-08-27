# Spec: Admin Panel Redesign (Top-Nav Migration, Streamer Mode & Dual-Axis Trend Chart)

**Date:** 2026-08-27  
**Status:** Draft for review  
**Author:** AI (brainstorming → spec)  
**Scope:** Architectural redesign of the `/admin` subsystem — migrating navigation from a fixed sidebar to a horizontal top-header with tabs, adding a persistent Streamer Mode data masking feature, building an interactive zero-dependency dual-axis SVG trend chart, and restructuring the `/admin` overview dashboard.

---

## 0. Context & Verified Codebase Facts

All statements below are verified directly from codebase analysis (no assumptions):

| Item | Verified Codebase State | Evidence |
|---|---|---|
| **Admin Shell Layout** | Currently uses a vertical fixed sidebar (`md:fixed md:w-64`) with `<aside>` and left-padded `<main className="md:ml-64">`. | `src/components/admin/admin-client.tsx:28-92` |
| **Admin Auth Guard** | Guarded by `requireAdminServer()` at route level and `requireAdmin(headers)` in server functions. Checks `users.isAdmin`. | `src/routes/admin.tsx:6-12`, `src/lib/services/admin-service.ts:58` |
| **Existing Metrics** | `getAdminDashboardMetrics` fetches counts for users, projects, prdVersions, acVersions, tasks, feedback, errorReports, payments sum, plan distribution, and 5 recent projects. | `src/lib/services/admin-service.ts:35-136` |
| **Payments Table** | Exists in schema with columns: `id`, `userId`, `orderId`, `plan`, `amount`, `status`, `createdAt`. | `src/db/schema.ts:358-374` |
| **Projects Table** | Exists in schema with columns: `id`, `userId`, `name`, `step`, `status`, `createdAt`. | `src/db/schema.ts:136-157` |
| **Feedback & Error Reports** | `feedback` (`type`, `message`, `createdAt`) and `errorReports` (`errorMessage`, `context`, `createdAt`) serve as the "Tiket" data source. | `src/db/schema.ts:304-327` |
| **Chart Libraries** | No external chart library currently installed. React 19 (`^19.2.0`) is used; third-party chart libraries risk peer-dependency conflicts. | `package.json:22-58` |
| **Styling & Icons** | Tailwind CSS v4, Lucide React, Framer Motion, and design system color tokens (`bg-onyx`, `bg-charcoal`, `bg-obsidian`, `border-graphite`, `text-snow`, `text-fog`, `text-mist`). | `package.json:22-58`, `src/components/admin/admin-client.tsx` |

---

## 1. Feature Overview & Design Goals

Based on the reference screenshot (`uploaded_media_1787823120977.png`):

1. **Top-Nav Shell Migration**:
   - Eliminate the fixed sidebar.
   - Replace with a clean top-bar header containing:
     - Top row: Breadcrumb / "Admin Panel" title, "Kembali ke Workspace" link, and a toggleable **Streamer Mode** button with a green active indicator and eye/shield icon.
     - Second row: Horizontal navigation tabs with real counter badges:
       - **Ringkasan** (`/admin`)
       - **Pengguna** (`/admin/users`, badge: total users)
       - **Proyek** (`/admin/projects` or modal/tab, badge: total projects)
       - **Tiket** (`/admin/feedback`, badge: feedback + error count)
       - **Transaksi** (`/admin/transactions`, badge: payments count)
       - **Pengaturan** (`/admin/settings` or settings shortcut)
2. **Streamer Mode (Full Functional Privacy Masking)**:
   - Persisted in `localStorage` (`streamer-mode: true | false`).
   - Masks sensitive personal & financial data when active:
     - Rupiah amounts: `Rp 299.700` → `••••••••`
     - Order IDs: `INV-VQWTQW-123494` → `INV-VQWTQW-•••94`
     - User names: `John Doe` → `Jc • • • e` / `J•••••••e`
     - User emails: `user@domain.com` → `u••••@••••.com`
3. **5 Metric Summary Cards**:
   - Horizontal row of 5 clean cards:
     1. **Total Pengguna** (`usersCount`, icon: `Users`)
     2. **Antrean / Status Pipeline** (total active projects/generation, icon: `ClipboardList`)
     3. **Proyek Siap** (`projectsCount`, icon: `FolderGit2`)
     4. **Tiket Terbuka** (`feedbackCount + errorCount`, icon: `MessageSquare`)
     5. **Pendapatan Bulan Ini** (aggregated current month revenue from `payments`, icon: `CreditCard`)
4. **Interactive Dual-Axis Trend Line Chart ("Tren 7 Hari Terakhir")**:
   - Header with dynamic title, subtitle: *"Performa pendapatan dan pendaftaran baru dari data nyata."*
   - Interactive range selector: `7 Hari`, `14 Hari`, `30 Hari`.
   - Legend top right:
     - Orange dot: **Pendapatan: Rp X**
     - Blue dot: **Pengguna Baru: Y**
   - Pure zero-dependency SVG component:
     - Dual independent Y-axes: Left Y-axis formatted in Rupiah (`Rp0`, `Rp75k`, `Rp150k`, etc.), Right Y-axis formatted as integers (`0`, `1`, `2`, `3`, etc.).
     - Smooth cubic bezier curves (`M ... C ...`).
     - Subtle vertical gradient area fill under both curves.
     - Interactive hover vertical rule, data dots, and floating tooltip showing exact date, revenue, and new users.
5. **Recent Activity Section (2 Cards Side-by-Side)**:
   - **Card 1: Transaksi Booster / Pembayaran Terbaru**:
     - Subtitle: *"Riwayat pesanan kredit / paket Mayar / Midtrans"*
     - Table: Order ID, Status (`Selesai` badge), Nominal.
     - "Lihat Semua" link.
   - **Card 2: Proyek Terbaru**:
     - Subtitle: *"Aktivitas pembuatan proyek paling akhir"*
     - List: Project name, Owner name/email, Step badge (`PRD`, `AC`, `Task`), link to open project.
     - "Kelola Proyek" link.

---

## 2. Architecture & File Structure Changes

```
src/
├── components/admin/
│   ├── admin-client.tsx               # Redesigned: Top-Nav Shell (Header, Streamer toggle, Tab navigation)
│   ├── streamer-mode-context.tsx      # NEW: React Context, hook, localStorage sync & masking helpers
│   ├── trend-line-chart.tsx           # NEW: Custom responsive dual-axis SVG line chart with smooth bezier curves
│   └── metric-card.tsx                # Refactored: Clean summary metric card matching screenshot
├── lib/services/
│   └── admin-service.ts               # Extended: daily trend queries (revenue & users), recent transactions query
└── routes/
    └── admin/
        ├── index.tsx                  # Redesigned: /admin overview (5 cards, trend chart, 2 bottom table cards)
        ├── users.tsx                  # Preserved, inherits new Top-Nav layout
        └── feedback.tsx               # Preserved, inherits new Top-Nav layout
```

---

## 3. Detailed Component Specifications

### 3.1 `streamer-mode-context.tsx`
Provides global streamer mode state and masking functions:
```typescript
interface StreamerModeContextValue {
  isStreamerMode: boolean;
  toggleStreamerMode: () => void;
  maskCurrency: (amount: number | string) => string;
  maskOrderId: (orderId: string) => string;
  maskName: (name: string | null | undefined) => string;
  maskEmail: (email: string | null | undefined) => string;
}
```
**Masking Rules (Generic & Structural, Rule no-hardcode):**
- `maskCurrency`: If active, returns `"••••••••"`. Otherwise returns formatted IDR currency (`formatCurrency(amount)`).
- `maskOrderId`: If active, retains prefix and last 2 digits, masking middle with `•••` (e.g. `INV-VQWTQW-•••94`).
- `maskName`: If active, keeps first letter and last letter, masking middle with ` • • • ` (e.g. `Jc • • • e`).
- `maskEmail`: If active, masks local part and domain name (e.g. `a••••@••••.com`).

### 3.2 `admin-client.tsx` (Top-Nav Header Shell)
- Eliminates `<aside className="md:fixed md:w-64">`.
- Header Structure:
  - Top row: Admin Panel branding, link back to workspace, and Streamer Mode toggle button.
  - Second row: Horizontal scrollable navigation tabs (`Ringkasan`, `Pengguna`, `Proyek`, `Tiket`, `Transaksi`, `Pengaturan`) with badges.
- Main container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8`.

### 3.3 `trend-line-chart.tsx` (Custom Zero-Dependency SVG Chart)
- **Math & Curve Interpolation**:
  - Uses cubic spline interpolation (`M x0 y0 C cp1x cp1y, cp2x cp2y, x1 y1`) to produce ultra-smooth curved waves matching the screenshot.
  - Scales:
    - `xScale`: maps date indices `0 .. N-1` across SVG width (`paddingLeft` to `width - paddingRight`).
    - `yScaleRevenue`: maps `0 .. maxRevenue` to SVG height (inverted for SVG coords).
    - `yScaleUsers`: maps `0 .. maxUsers` to SVG height.
- **Visual Features**:
  - **Left Y-Axis**: 5 ticks formatted in IDR (`Rp0`, `Rp75k`, `Rp150k`, `Rp225k`, `Rp300k`).
  - **Right Y-Axis**: 5 ticks formatted as integer counts (`0`, `1`, `2`, `3`, `4`).
  - **X-Axis**: Date labels formatted e.g. `20 Agu`, `21 Agu` with subtle typography.
  - **Gradients**: `<defs>` with `<linearGradient>` (Orange gradient for Revenue, Blue gradient for Users) fading to transparent.
  - **Interactive Hover Indicator**:
    - Invisible mouse overlay capturing mouse position.
    - Draws a dashed/solid vertical guide line at the nearest date point.
    - Renders illuminated dots on both curves.
    - Floating glassmorphism tooltip showing Date, Revenue (masked if Streamer Mode is ON), and New Users count.
  - **Time Range Selector**:
    - Pill buttons: `7 Hari Terakhir` | `14 Hari Terakhir` | `30 Hari Terakhir`.
    - Triggers state change or server refetch for the selected duration.

---

## 4. Backend & Database Queries (`admin-service.ts`)

Extend `getAdminDashboardMetrics` and add `getAdminTrendMetrics`:

```typescript
export interface DailyTrendPoint {
  date: string;       // YYYY-MM-DD
  label: string;      // "20 Agu"
  revenue: number;    // IDR sum for this day
  newUsers: number;   // user registrations for this day
}

export interface AdminTransactionItem {
  id: string;
  orderId: string;
  plan: string;
  amount: number;
  status: string;
  userName: string | null;
  createdAt: Date | null;
}

export interface ExtendedAdminDashboardMetrics extends AdminDashboardMetrics {
  currentMonthRevenue: number;
  recentTransactions: AdminTransactionItem[];
  trendData: DailyTrendPoint[];
}
```

### 4.1 Daily Aggregation Query Logic
1. Calculate `startDate = now - (days - 1) days` at 00:00:00.
2. Query daily revenue:
   ```sql
   SELECT date_trunc('day', created_at) as day, coalesce(sum(amount), 0) as total
   FROM payments
   WHERE created_at >= ${startDate} AND status IN ('paid', 'settlement', 'success')
   GROUP BY 1
   ```
3. Query daily signups:
   ```sql
   SELECT date_trunc('day', created_at) as day, count(*) as count
   FROM users
   WHERE created_at >= ${startDate}
   GROUP BY 1
   ```
4. **Continuity Guarantee (No-Assumptions & Data Integrity)**:
   Generate an array of dates from `startDate` to `today`. Map the database rows into this array; any missing date defaults to `revenue = 0` and `newUsers = 0`. This guarantees a smooth, unbroken line across all days.

### 4.2 Current Month Revenue
```sql
SELECT coalesce(sum(amount), 0) as month_total
FROM payments
WHERE created_at >= date_trunc('month', now())
  AND status IN ('paid', 'settlement', 'success')
```

---

## 5. Screen Layout & Visual Hierarchy (`/admin/index.tsx`)

```
+-----------------------------------------------------------------------------------------+
| [Admin Panel]  <- Workspace                                [ * Streamer Mode (ON/OFF) ] |
| [Ringkasan]  [Pengguna 11]  [Proyek 2]  [Tiket 0]  [Transaksi 5]  [Pengaturan]          |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
| [ Total Pengguna ] [ Status Pipeline ] [ Proyek Siap ] [ Tiket Terbuka ] [ Pendapatan ] |
| [      11        ] [        0        ] [      2      ] [       0       ] [ Rp 299.700 ] |
|                                                                                         |
| +-------------------------------------------------------------------------------------+ |
| | ^~ Tren 7 Hari Terakhir           [7 Hari | 14 Hari | 30 Hari]   * Pendapatan: Rp.. | |
| |    Performa pendapatan & pendaftaran baru dari data nyata.       * Pengguna Baru: 7 | |
| |                                                                                     | |
| | Rp300k |                          (Curved Orange Spline: Revenue)                 4 | |
| | Rp225k |                                                                          3 | |
| | Rp150k |        /~~~\             (Curved Blue Spline: Signups)                   2 | |
| |  Rp75k |       /     \                                                            1 | |
| |    Rp0 +------+-------+-------+-------+-------+-------+---------------------------0 | |
| |        20 Agu  21 Agu  22 Agu  23 Agu  24 Agu  25 Agu  26 Agu                       | |
| +-------------------------------------------------------------------------------------+ |
|                                                                                         |
| +-----------------------------------------+ +-----------------------------------------+ |
| | Transaksi Booster Terbaru   Lihat Semua | | Proyek Terbaru            Kelola Proyek | |
| | Riwayat pesanan kredit Mayar/Midtrans   | | Aktivitas pembuatan proyek paling akhir | |
| | --------------------------------------- | | --------------------------------------- | |
| | INV-VQWTQW-•••94    [Selesai]  •••••••• | | Proyek E-Commerce UMKM   [PRD]   [Open] | |
| | INV-VQWTQW-•••59    [Selesai]  •••••••• | | SaaS Analytics Tool      [AC]    [Open] | |
| +-----------------------------------------+ +-----------------------------------------+ |
+-----------------------------------------------------------------------------------------+
```

---

## 6. Implementation Steps

1. **Step 1: Streamer Mode Provider & Masking Utilities**
   - Create `src/components/admin/streamer-mode-context.tsx`.
   - Provide persistent state via `localStorage`.
   - Implement unit-tested masking helpers (`maskCurrency`, `maskOrderId`, `maskName`, `maskEmail`).
2. **Step 2: Service Layer & Aggregations**
   - Edit `src/lib/services/admin-service.ts`.
   - Add trend aggregation logic for 7, 14, and 30 days.
   - Add current month revenue calculation and recent transactions retrieval.
3. **Step 3: Custom SVG Line Chart Component**
   - Create `src/components/admin/trend-line-chart.tsx`.
   - Implement cubic bezier curve generator, dual Y-axes, gradients, hover cursor, and tooltip.
   - Include interval buttons (`7 Hari`, `14 Hari`, `30 Hari`).
4. **Step 4: Layout Shell Redesign (`admin-client.tsx`)**
   - Replace sidebar with sticky top header and horizontal tabs.
   - Wire dynamic counter badges and Streamer Mode toggle button.
5. **Step 5: Overview Dashboard Redesign (`/admin/index.tsx`)**
   - Integrate 5 metric cards, trend chart section, recent transactions table, and recent projects table.
   - Connect Streamer Mode masking across all displayed values.
6. **Step 6: Verification & Quality Assurance**
   - Run `biome check` and TypeScript verification.
   - Test interaction in browser: verify tab switching, chart hover, date range filtering, and Streamer Mode masking.

---

## 7. Edge Cases & Risk Mitigation

| Risk / Edge Case | Mitigation |
|---|---|
| **Empty Days in Trend Data** | Backend guarantees zero-filled date series so curves never have null breaks or NaN coordinates. |
| **Zero Revenue or Flat Data** | Chart geometry handles `maxRevenue = 0` by providing a default baseline scale (`Rp100.000` ceil) so axes still render cleanly. |
| **Hydration Mismatch (Streamer Mode)** | Default to `false` on initial SSR; synchronize with `localStorage` in `useEffect` on client mount. |
| **Mobile Screen Responsiveness** | Tabs container uses `overflow-x-auto scrollbar-none`. Metric cards stack to 2 columns, bottom tables stack to single column, and SVG chart uses responsive `viewBox`. |
| **Performance with Large Data** | Queries use indexes on `created_at` in `payments` and `users`. Aggregation is lightweight (grouped by day, max 30 rows returned to client). |
