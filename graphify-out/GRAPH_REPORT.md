# Graph Report - .  (2026-07-26)

## Corpus Check
- 226 files · ~90,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 615 nodes · 1028 edges · 26 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 219 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 105|Community 105]]

## God Nodes (most connected - your core abstractions)
1. `createServerInsforge()` - 100 edges
2. `requireAuth()` - 69 edges
3. `cn()` - 41 edges
4. `createClient()` - 33 edges
5. `checkRateLimit()` - 27 edges
6. `recordRequest()` - 19 edges
7. `getUserPlan()` - 16 edges
8. `getLatestPrdContent()` - 14 edges
9. `GET()` - 13 edges
10. `POST()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `syncPaymentStatus()` --calls--> `sync()`  [INFERRED]
  src\app\actions\payment.ts → src\components\ui\pricing-card.tsx
- `middleware()` --calls--> `createResilientFetch()`  [INFERRED]
  src\middleware.ts → src\lib\insforge\resilient-fetch.ts
- `generateMetadata()` --calls--> `createServerInsforge()`  [INFERRED]
  src\app\task\[id]\page.tsx → src\lib\insforge\server.ts
- `generateMetadata()` --calls--> `requireAuth()`  [INFERRED]
  src\app\task\[id]\page.tsx → src\lib\auth.ts
- `AcDetailPage()` --calls--> `createServerInsforge()`  [INFERRED]
  src\app\ac\[id]\page.tsx → src\lib\insforge\server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (43): AccountPage(), createApiKey(), generateApiKey(), revokeApiKey(), updateNotificationPreferences(), deleteAccount(), updateEmail(), updatePassword() (+35 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (14): PrdCard(), useCanvasZoom(), clamp(), cn(), formatCurrency(), formatDate(), SnapButton(), TabBar() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (25): POST(), extractJson(), completeChat(), getUnlockedModelIds(), isModelUnlocked(), checkQuota(), checkRevisionQuota(), incrementPrdCount() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (22): completeOnboarding(), signOut(), GET(), POST(), DELETE(), GET(), createServerInsforge(), GET() (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (9): deletePrd(), duplicatePrd(), renamePrd(), usePanelResize(), DeleteProjectModal(), Mermaid(), PrdActions(), handleRenameSubmit() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (8): LoginForm(), handleSubmit(), RegisterForm(), validate(), routeToStep(), createClient(), SignInPage(), ThemeToggle()

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (21): AcDetailPage(), generateMetadata(), KanbanPage(), TaskPage(), POST(), GET(), acFeaturesToMarkdown(), getAcVersions() (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (9): ChatBubble(), handleModeSelect(), handlePreferencesSubmit(), handleSendWithMessage(), LimitModal(), ModeSelector(), PreferenceForm(), ResumeErrorModal() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (12): handleSend(), findModel(), consumePendingPrdPrompt(), consumeSetupPrompt(), getSetupPrompt(), getStorage(), savePendingPrdPrompt(), saveSetupPrompt() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.24
Nodes (12): kanbanCommand(), loginCommand(), projectGetCommand(), subtaskUpdateCommand(), taskListCommand(), taskUpdateCommand(), apiGet(), apiPost() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.26
Nodes (9): createTransaction(), handlePaymentSuccess(), syncPaymentStatus(), POST(), getAdminInsforge(), getNextMonthlyReset(), POST(), getAdminClient() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.42
Nodes (6): apiFetch(), getKanbanState(), getProjectData(), listTasks(), updateSubtaskStatus(), updateTaskStatus()

### Community 12 - "Community 12"
Cohesion: 0.32
Nodes (3): createResilientFetch(), POST(), middleware()

### Community 13 - "Community 13"
Cohesion: 0.57
Nodes (5): validateApiKey(), POST(), checkApiKeyRateLimit(), recordApiKeyRequest(), GET()

### Community 14 - "Community 14"
Cohesion: 0.43
Nodes (4): computeStatusCounts(), detectAcChanged(), groupCardsByFeature(), groupCardsByStatus()

### Community 16 - "Community 16"
Cohesion: 0.4
Nodes (1): useKanbanPolling()

### Community 17 - "Community 17"
Cohesion: 0.7
Nodes (4): createRequestCookieStore(), createResponseCookieStore(), isTokenValid(), middleware()

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (2): escapeRegex(), mergeSectionUpdate()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (1): Providers()

### Community 20 - "Community 20"
Cohesion: 0.83
Nodes (3): getSafeNext(), getSafeRedirect(), POST()

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (1): Footer()

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (2): getSafeNext(), POST()

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (2): GET(), getSafeNext()

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (2): getSafeNext(), POST()

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (2): CoreApi, Snap

### Community 105 - "Community 105"
Cohesion: 1.0
Nodes (1): AC Generation Reliability Fix

## Knowledge Gaps
- **3 isolated node(s):** `Snap`, `CoreApi`, `AC Generation Reliability Fix`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 16`** (5 nodes): `useKanbanPolling()`, `handleTouchMove()`, `handleTouchStart()`, `kanban-board.tsx`, `use-kanban-polling.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (5 nodes): `escapeRegex()`, `extractSectionsFromAIResponse()`, `mergeSectionUpdate()`, `parseSections()`, `prd-merger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (4 nodes): `RootLayout()`, `Providers()`, `layout.tsx`, `providers.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (4 nodes): `Footer()`, `PricingPage()`, `page.tsx`, `footer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (3 nodes): `getSafeNext()`, `POST()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (3 nodes): `GET()`, `getSafeNext()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `getSafeNext()`, `POST()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (3 nodes): `midtrans-client.d.ts`, `CoreApi`, `Snap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (1 nodes): `AC Generation Reliability Fix`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.