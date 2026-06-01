# Graph Report - novaplan_ai  (2026-06-01)

## Corpus Check
- 145 files · ~44,999 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 382 nodes · 504 edges · 16 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 77 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `requireAuth()` - 54 edges
2. `createClient()` - 33 edges
3. `cn()` - 31 edges
4. `getUserPlan()` - 15 edges
5. `getUser()` - 9 edges
6. `POST()` - 7 edges
7. `createClient()` - 7 edges
8. `validateApiKey()` - 7 edges
9. `checkApiKeyRateLimit()` - 7 edges
10. `recordApiKeyRequest()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `createTransaction()` --calls--> `requireAuth()`  [INFERRED]
  src\app\actions\payment.ts → src\lib\auth.ts
- `syncPaymentStatus()` --calls--> `requireAuth()`  [INFERRED]
  src\app\actions\payment.ts → src\lib\auth.ts
- `sync()` --calls--> `syncPaymentStatus()`  [INFERRED]
  src\components\ui\pricing-card.tsx → src\app\actions\payment.ts
- `renamePrd()` --calls--> `requireAuth()`  [INFERRED]
  src\app\actions\prd.ts → src\lib\auth.ts
- `handleRenameSubmit()` --calls--> `renamePrd()`  [INFERRED]
  src\components\prd\prd-detail.tsx → src\app\actions\prd.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (31): AccountPage(), updateNotificationPreferences(), deleteAccount(), updateEmail(), updatePassword(), updateProfile(), uploadAvatar(), ApiKeysPage() (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (5): PrdCard(), cn(), Mermaid(), AuroraBackground(), Badge()

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (20): POST(), DELETE(), completeChat(), checkQuota(), incrementPrdCount(), checkRateLimit(), recordRequest(), generateShareToken() (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (7): LoginForm(), handleSubmit(), RegisterForm(), validate(), createClient(), SignInPage(), ThemeToggle()

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (11): handleSend(), findModel(), isModelUnlocked(), consumePendingPrdPrompt(), getSetupPrompt(), getStorage(), savePendingPrdPrompt(), saveSetupPrompt() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (7): deletePrd(), duplicatePrd(), renamePrd(), usePanelResize(), PrdActions(), handleRenameSubmit(), ProjectContextMenu()

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (7): validateApiKey(), POST(), GET(), checkApiKeyRateLimit(), recordApiKeyRequest(), GET(), createClient()

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (8): createTransaction(), handlePaymentSuccess(), syncPaymentStatus(), POST(), getAdminClient(), Card(), sync(), POST()

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (7): ChatBubble(), handleModeSelect(), handlePreferencesSubmit(), handleSendWithMessage(), LimitModal(), ModeSelector(), PreferenceForm()

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (5): clamp(), formatCurrency(), formatDate(), SnapButton(), ScrollReveal()

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (5): createApiKey(), generateApiKey(), revokeApiKey(), handleCreate(), handleRevoke()

### Community 11 - "Community 11"
Cohesion: 0.47
Nodes (3): createTemplate(), deleteTemplate(), handleCreate()

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (2): escapeRegex(), mergeSectionUpdate()

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (1): Providers()

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (1): Footer()

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (2): CoreApi, Snap

## Knowledge Gaps
- **2 isolated node(s):** `Snap`, `CoreApi`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 12`** (5 nodes): `escapeRegex()`, `extractSectionsFromAIResponse()`, `mergeSectionUpdate()`, `parseSections()`, `prd-merger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (4 nodes): `RootLayout()`, `Providers()`, `layout.tsx`, `providers.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (4 nodes): `Footer()`, `PricingPage()`, `page.tsx`, `footer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (3 nodes): `midtrans-client.d.ts`, `CoreApi`, `Snap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 1` to `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.350) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `Community 0` to `Community 5`, `Community 7`, `Community 9`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 6` to `Community 0`, `Community 2`, `Community 5`, `Community 7`, `Community 9`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Are the 30 inferred relationships involving `requireAuth()` (e.g. with `updateNotificationPreferences()` and `createTransaction()`) actually correct?**
  _`requireAuth()` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `getUserPlan()` (e.g. with `POST()` and `PrdIndexPage()`) actually correct?**
  _`getUserPlan()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `getUser()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`getUser()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Snap`, `CoreApi` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._