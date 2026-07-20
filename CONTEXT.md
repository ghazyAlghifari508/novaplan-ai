# NovaPlan Vibecoding

Domain language for the prompt-to-implementation pipeline: a user describes an idea, AI generates a PRD, then Acceptance Criteria, then a task breakdown, then an implementation kanban — each step derived from the previous.

## Language

### Project lifecycle

**Project**:
A user-owned artifact that moves through a fixed pipeline: PRD → AC → Task & Sitemap → Implementation.
_Avoid_: workspace, document, brief

**FlowStep**:
The current position of a Project in the pipeline. One of `prd`, `ac`, `task`. Source of truth for the navbar step indicator is the **route**, not the stored `projects.step` column (route cannot lie; the DB lags navigation).
_Avoid_: stage, phase, status

**PrdVersion**:
An immutable markdown snapshot of a Project's Product Requirements Document. Versions are monotonic per project; revise creates a new version, never mutates an old one.
_Avoid_: PRD, PRD draft, document

### Acceptance Criteria

**AcFeature**:
One block of acceptance criteria scoped to a single feature named in the PRD. Contains a `featureName` and a `criteria[]` list. One AcFeature per PRD feature — never one per code module.
_Avoid_: AC group, feature section

**Criterion**:
A single testable acceptance statement: a subject plus an observable condition (e.g. "Email field rejects invalid format with an error message"). Vague goals ("login works") are not criteria.
_Avoid_: requirement, check, test case

**AcVersion**:
An immutable snapshot of the full `AcFeature[]` for a Project at a point in time. Generated from the **latest** PrdVersion. Version monotonic per project; revise creates a new version. Stored as JSONB, never mutated.
_Avoid_: AC, criteria set

### Consistency rules (invariants, not implementations)

- An AcFeature.featureName must correspond to a feature the latest PrdVersion mentions. Hallucinated features are a prompt-enforced violation, not a schema one.
- If the PrdVersion advances after an AcVersion exists, the AcVersion is **stale** — flagged with a warning, never auto-invalidated. The user re-generates manually.
- AcVersion with empty `criteria[]` for a feature is valid (feature exists in PRD but lacks detail); render the header alone.
