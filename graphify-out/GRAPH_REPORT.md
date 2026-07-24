# Graph Report - novaplan_ai  (2026-07-24)

## Corpus Check
- 222 files · ~88,016 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 604 nodes · 1014 edges · 23 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 215 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `createServerInsforge()` - 98 edges
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
- `generateMetadata()` --calls--> `createServerInsforge()`  [INFERRED]
  src\app\task\[id]\page.tsx → src\lib\insforge\server.ts
- `AcDetailPage()` --calls--> `createServerInsforge()`  [INFERRED]
  src\app\ac\[id]\page.tsx → src\lib\insforge\server.ts
- `AcDetailPage()` --calls--> `getLatestPrdContent()`  [INFERRED]
  src\app\ac\[id]\page.tsx → src\lib\services\prd-service.ts
- `updateNotificationPreferences()` --calls--> `createServerInsforge()`  [INFERRED]
  src\app\actions\notifications.ts → src\lib\insforge\server.ts
- `syncPaymentStatus()` --calls--> `requireAuth()`  [INFERRED]
  src\app\actions\payment.ts → src\lib\auth.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (14): PrdCard(), useCanvasZoom(), routeToStep(), clamp(), cn(), formatCurrency(), formatDate(), SnapButton() (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (38): AccountPage(), updateNotificationPreferences(), deleteAccount(), updateEmail(), updatePassword(), updateProfile(), uploadAvatar(), createTemplate() (+30 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (30): validateApiKey(), completeOnboarding(), signOut(), GET(), POST(), POST(), DELETE(), GET() (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (25): POST(), extractJson(), completeChat(), getUnlockedModelIds(), checkQuota(), checkRevisionQuota(), incrementPrdCount(), generateShareToken() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (9): deletePrd(), duplicatePrd(), renamePrd(), usePanelResize(), DeleteProjectModal(), Mermaid(), PrdActions(), handleRenameSubmit() (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (13): handleSend(), findModel(), isModelUnlocked(), consumePendingPrdPrompt(), consumeSetupPrompt(), getSetupPrompt(), getStorage(), savePendingPrdPrompt() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (17): TaskPage(), POST(), GET(), acFeaturesToMarkdown(), getLatestAcContent(), getLatestAcMarkdown(), parseAcMarkdown(), saveAcVersion() (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (9): ChatBubble(), handleModeSelect(), handlePreferencesSubmit(), handleSendWithMessage(), LimitModal(), ModeSelector(), PreferenceForm(), ResumeErrorModal() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (6): LoginForm(), handleSubmit(), RegisterForm(), validate(), createClient(), SignInPage()

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (11): createTransaction(), handlePaymentSuccess(), syncPaymentStatus(), POST(), getAdminInsforge(), getNextMonthlyReset(), POST(), getAdminClient() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (12): kanbanCommand(), loginCommand(), projectGetCommand(), subtaskUpdateCommand(), taskListCommand(), taskUpdateCommand(), apiGet(), apiPost() (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.42
Nodes (6): apiFetch(), getKanbanState(), getProjectData(), listTasks(), updateSubtaskStatus(), updateTaskStatus()

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (5): createApiKey(), generateApiKey(), revokeApiKey(), handleCreate(), handleRevoke()

### Community 13 - "Community 13"
Cohesion: 0.43
Nodes (4): computeStatusCounts(), detectAcChanged(), groupCardsByFeature(), groupCardsByStatus()

### Community 15 - "Community 15"
Cohesion: 0.4
Nodes (1): useKanbanPolling()

### Community 16 - "Community 16"
Cohesion: 0.7
Nodes (4): createRequestCookieStore(), createResponseCookieStore(), isTokenValid(), middleware()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (2): escapeRegex(), mergeSectionUpdate()

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (1): Providers()

### Community 19 - "Community 19"
Cohesion: 0.83
Nodes (3): getSafeNext(), getSafeRedirect(), POST()

### Community 20 - "Community 20"
Cohesion: 0.5
Nodes (1): Footer()

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (2): getSafeNext(), POST()

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (2): GET(), getSafeNext()

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (2): CoreApi, Snap

## Knowledge Gaps
- **2 isolated node(s):** `Snap`, `CoreApi`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 15`** (5 nodes): `useKanbanPolling()`, `handleTouchMove()`, `handleTouchStart()`, `kanban-board.tsx`, `use-kanban-polling.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (5 nodes): `escapeRegex()`, `extractSectionsFromAIResponse()`, `mergeSectionUpdate()`, `parseSections()`, `prd-merger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (4 nodes): `RootLayout()`, `Providers()`, `layout.tsx`, `providers.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (4 nodes): `Footer()`, `PricingPage()`, `page.tsx`, `footer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `getSafeNext()`, `POST()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (3 nodes): `GET()`, `getSafeNext()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `midtrans-client.d.ts`, `CoreApi`, `Snap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 0` to `Community 9`, `Community 4`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.222) - this node is a cross-community bridge._
- **Why does `createServerInsforge()` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 6`, `Community 9`, `Community 19`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 9`, `Community 12`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Are the 52 inferred relationships involving `createServerInsforge()` (e.g. with `generateMetadata()` and `AcDetailPage()`) actually correct?**
  _`createServerInsforge()` has 52 INFERRED edges - model-reasoned connections that need verification._
- **Are the 38 inferred relationships involving `requireAuth()` (e.g. with `generateMetadata()` and `AcDetailPage()`) actually correct?**
  _`requireAuth()` has 38 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `checkRateLimit()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`checkRateLimit()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Snap`, `CoreApi` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._