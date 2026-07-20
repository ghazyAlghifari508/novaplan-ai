# Graph Report - novaplan_ai  (2026-07-16)

## Corpus Check
- 145 files · ~45,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 435 nodes · 626 edges · 19 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]

## God Nodes (most connected - your core abstractions)
1. `requireAuth()` - 54 edges
2. `createServerInsforge()` - 54 edges
3. `createClient()` - 33 edges
4. `cn()` - 31 edges
5. `getUserPlan()` - 15 edges
6. `getAdminInsforge()` - 10 edges
7. `getUser()` - 10 edges
8. `POST()` - 8 edges
9. `checkRateLimit()` - 8 edges
10. `recordRequest()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `generateMetadata()` --calls--> `createServerInsforge()`  [INFERRED]
  src\app\prd\[id]\page.tsx → src\lib\insforge\server.ts
- `updateNotificationPreferences()` --calls--> `createServerInsforge()`  [INFERRED]
  src\app\actions\notifications.ts → src\lib\insforge\server.ts
- `syncPaymentStatus()` --calls--> `requireAuth()`  [INFERRED]
  src\app\actions\payment.ts → src\lib\auth.ts
- `sync()` --calls--> `syncPaymentStatus()`  [INFERRED]
  src\components\ui\pricing-card.tsx → src\app\actions\payment.ts
- `renamePrd()` --calls--> `requireAuth()`  [INFERRED]
  src\app\actions\prd.ts → src\lib\auth.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (31): AccountPage(), updateNotificationPreferences(), deleteAccount(), updateEmail(), updatePassword(), updateProfile(), uploadAvatar(), ApiKeysPage() (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (10): PrdCard(), clamp(), cn(), formatCurrency(), formatDate(), Mermaid(), SnapButton(), AuroraBackground() (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (19): completeOnboarding(), signOut(), GET(), POST(), POST(), DELETE(), createServerInsforge(), checkQuota() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (7): LoginForm(), handleSubmit(), RegisterForm(), validate(), createClient(), SignInPage(), ThemeToggle()

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (16): completeChat(), getUnlockedModelIds(), isModelUnlocked(), generateShareToken(), generateSummaryReply(), selectModels(), tryStreamWithFallback(), ensureConversation() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (8): deletePrd(), duplicatePrd(), renamePrd(), usePanelResize(), DeleteProjectModal(), PrdActions(), handleRenameSubmit(), ProjectContextMenu()

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (9): ChatBubble(), handleModeSelect(), handlePreferencesSubmit(), handleSendWithMessage(), LimitModal(), ModeSelector(), PreferenceForm(), ResumeErrorModal() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (12): handleSend(), findModel(), consumePendingPrdPrompt(), consumeSetupPrompt(), getSetupPrompt(), getStorage(), savePendingPrdPrompt(), saveSetupPrompt() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (11): createTransaction(), handlePaymentSuccess(), syncPaymentStatus(), POST(), getAdminInsforge(), getNextMonthlyReset(), POST(), getAdminClient() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.37
Nodes (7): validateApiKey(), POST(), GET(), checkApiKeyRateLimit(), recordApiKeyRequest(), GET(), createClient()

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (5): createApiKey(), generateApiKey(), revokeApiKey(), handleCreate(), handleRevoke()

### Community 11 - "Community 11"
Cohesion: 0.47
Nodes (3): createTemplate(), deleteTemplate(), handleCreate()

### Community 12 - "Community 12"
Cohesion: 0.7
Nodes (4): createRequestCookieStore(), createResponseCookieStore(), isTokenValid(), middleware()

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (2): escapeRegex(), mergeSectionUpdate()

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (1): Providers()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (1): Footer()

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (2): getSafeNext(), POST()

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (2): GET(), getSafeNext()

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (2): CoreApi, Snap

## Knowledge Gaps
- **2 isolated node(s):** `Snap`, `CoreApi`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 13`** (5 nodes): `escapeRegex()`, `extractSectionsFromAIResponse()`, `mergeSectionUpdate()`, `parseSections()`, `prd-merger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (4 nodes): `RootLayout()`, `Providers()`, `layout.tsx`, `providers.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (4 nodes): `Footer()`, `PricingPage()`, `page.tsx`, `footer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (3 nodes): `getSafeNext()`, `POST()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (3 nodes): `GET()`, `getSafeNext()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (3 nodes): `midtrans-client.d.ts`, `CoreApi`, `Snap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 1` to `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.299) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `Community 0` to `Community 1`, `Community 5`, `Community 8`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Why does `createServerInsforge()` connect `Community 2` to `Community 0`, `Community 1`, `Community 4`, `Community 5`, `Community 8`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `requireAuth()` (e.g. with `updateNotificationPreferences()` and `syncPaymentStatus()`) actually correct?**
  _`requireAuth()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 32 inferred relationships involving `createServerInsforge()` (e.g. with `updateNotificationPreferences()` and `renamePrd()`) actually correct?**
  _`createServerInsforge()` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `getUserPlan()` (e.g. with `PrdIndexPage()` and `PrdPage()`) actually correct?**
  _`getUserPlan()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Snap`, `CoreApi` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._