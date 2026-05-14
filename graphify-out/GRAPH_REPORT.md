# Graph Report - novaplan_ai  (2026-05-13)

## Corpus Check
- 134 files · ~37,785 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 275 nodes · 349 edges · 14 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `requireAuth()` - 49 edges
2. `createClient()` - 30 edges
3. `cn()` - 24 edges
4. `getUserPlan()` - 14 edges
5. `getUser()` - 9 edges
6. `validateApiKey()` - 7 edges
7. `checkApiKeyRateLimit()` - 7 edges
8. `recordApiKeyRequest()` - 7 edges
9. `getUserProfile()` - 6 edges
10. `getUserQuota()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `createApiKey()` --calls--> `requireAuth()`  [INFERRED]
  src\app\actions\api-keys.ts → src\lib\auth.ts
- `handleCreate()` --calls--> `createApiKey()`  [INFERRED]
  src\components\settings\api-keys-form.tsx → src\app\actions\api-keys.ts
- `revokeApiKey()` --calls--> `requireAuth()`  [INFERRED]
  src\app\actions\api-keys.ts → src\lib\auth.ts
- `createTransaction()` --calls--> `requireAuth()`  [INFERRED]
  src\app\actions\payment.ts → src\lib\auth.ts
- `createTemplate()` --calls--> `requireAuth()`  [INFERRED]
  src\app\actions\templates.ts → src\lib\auth.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (8): clamp(), cn(), formatCurrency(), formatDate(), generateShareToken(), SnapButton(), Card(), ScrollReveal()

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (17): ApiKeysPage(), DashboardPage(), POST(), PrdPage(), getUser(), getUserPlan(), getUserProfile(), getUserQuota() (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (16): AccountPage(), updateNotificationPreferences(), deletePrd(), duplicatePrd(), renamePrd(), deleteAccount(), updateEmail(), updatePassword() (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (5): LoginForm(), handleSubmit(), RegisterForm(), validate(), createClient()

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (7): validateApiKey(), POST(), GET(), checkApiKeyRateLimit(), recordApiKeyRequest(), GET(), createClient()

### Community 5 - "Community 5"
Cohesion: 0.2
Nodes (6): ChatBubble(), handleModeSelect(), handlePreferencesSubmit(), handleSendWithMessage(), ModeSelector(), PreferenceForm()

### Community 6 - "Community 6"
Cohesion: 0.36
Nodes (5): POST(), checkQuota(), incrementPrdCount(), checkRateLimit(), recordRequest()

### Community 7 - "Community 7"
Cohesion: 0.39
Nodes (5): createApiKey(), generateApiKey(), revokeApiKey(), handleCreate(), handleRevoke()

### Community 8 - "Community 8"
Cohesion: 0.47
Nodes (3): createTemplate(), deleteTemplate(), handleCreate()

### Community 9 - "Community 9"
Cohesion: 0.4
Nodes (3): createTransaction(), handlePaymentSuccess(), POST()

### Community 10 - "Community 10"
Cohesion: 0.4
Nodes (2): PrdCard(), Badge()

### Community 11 - "Community 11"
Cohesion: 0.5
Nodes (2): escapeRegex(), mergeSectionUpdate()

### Community 12 - "Community 12"
Cohesion: 0.5
Nodes (1): Providers()

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (1): Footer()

## Knowledge Gaps
- **Thin community `Community 10`** (5 nodes): `PrdCard()`, `dashboard-client.tsx`, `prd-card.tsx`, `badge.tsx`, `Badge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (5 nodes): `escapeRegex()`, `extractSectionsFromAIResponse()`, `mergeSectionUpdate()`, `parseSections()`, `prd-merger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (4 nodes): `RootLayout()`, `Providers()`, `layout.tsx`, `providers.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (4 nodes): `Footer()`, `PricingPage()`, `page.tsx`, `footer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 10`?**
  _High betweenness centrality (0.280) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `Community 2` to `Community 0`, `Community 1`, `Community 7`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.203) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 6`, `Community 7`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `requireAuth()` (e.g. with `createApiKey()` and `revokeApiKey()`) actually correct?**
  _`requireAuth()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `getUserPlan()` (e.g. with `POST()` and `PrdIndexPage()`) actually correct?**
  _`getUserPlan()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `getUser()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`getUser()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._