# Graph Report - novaplan_ai  (2026-05-20)

## Corpus Check
- 147 files · ~42,453 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 314 nodes · 406 edges · 15 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `requireAuth()` - 53 edges
2. `createClient()` - 31 edges
3. `cn()` - 27 edges
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
Cohesion: 0.05
Nodes (5): PrdCard(), cn(), AuroraBackground(), Badge(), Card()

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (18): AccountPage(), updateNotificationPreferences(), deletePrd(), duplicatePrd(), renamePrd(), deleteAccount(), updateEmail(), updatePassword() (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (7): LoginForm(), handleSubmit(), RegisterForm(), validate(), createClient(), SignInPage(), ThemeToggle()

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (16): ApiKeysPage(), DashboardPage(), POST(), PrdPage(), getUser(), getUserPlan(), getUserProfile(), getUserQuota() (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (10): validateApiKey(), createTransaction(), handlePaymentSuccess(), POST(), GET(), checkApiKeyRateLimit(), recordApiKeyRequest(), GET() (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (8): handleSend(), consumePendingPrdPrompt(), getSetupPrompt(), getStorage(), savePendingPrdPrompt(), saveSetupPrompt(), handleSubmit(), handleAutoSelect()

### Community 6 - "Community 6"
Cohesion: 0.26
Nodes (6): POST(), DELETE(), checkQuota(), incrementPrdCount(), checkRateLimit(), recordRequest()

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (6): ChatBubble(), handleModeSelect(), handlePreferencesSubmit(), handleSendWithMessage(), ModeSelector(), PreferenceForm()

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (6): clamp(), formatCurrency(), formatDate(), generateShareToken(), SnapButton(), ScrollReveal()

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (5): createApiKey(), generateApiKey(), revokeApiKey(), handleCreate(), handleRevoke()

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (1): PrdActions()

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

## Knowledge Gaps
- **Thin community `Community 10`** (9 nodes): `PrdActions()`, `cn()`, `handleDeleteProject()`, `handleMouseMove()`, `handleMouseUp()`, `handleProjectCreated()`, `handleVersionSelect()`, `requestDeleteProject()`, `prd-detail.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (5 nodes): `escapeRegex()`, `extractSectionsFromAIResponse()`, `mergeSectionUpdate()`, `parseSections()`, `prd-merger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (4 nodes): `RootLayout()`, `Providers()`, `layout.tsx`, `providers.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (4 nodes): `Footer()`, `PricingPage()`, `page.tsx`, `footer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 0` to `Community 1`, `Community 2`, `Community 5`, `Community 7`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.345) - this node is a cross-community bridge._
- **Why does `requireAuth()` connect `Community 1` to `Community 3`, `Community 4`, `Community 8`, `Community 9`, `Community 11`?**
  _High betweenness centrality (0.225) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 4` to `Community 1`, `Community 3`, `Community 6`, `Community 8`, `Community 9`, `Community 11`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Are the 29 inferred relationships involving `requireAuth()` (e.g. with `createApiKey()` and `revokeApiKey()`) actually correct?**
  _`requireAuth()` has 29 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `getUserPlan()` (e.g. with `POST()` and `DashboardPage()`) actually correct?**
  _`getUserPlan()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `getUser()` (e.g. with `POST()` and `POST()`) actually correct?**
  _`getUser()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._