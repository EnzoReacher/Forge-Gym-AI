# FORGE V2 — Architecture

## Architectural objective

FORGE V2 is a modular monolith: one repository, one deployable application, one primary database, and explicit internal module boundaries.

The architecture must optimize for ownership, debuggability, portability, and product clarity before scale complexity.

## Required properties

### Local-first operation

A developer must be able to clone the repository, create local configuration from `.env.example`, initialize required local services with documented commands, run the application, run tests, inspect logs, and apply database migrations without an OpenAI Sites management interface.

### IDE agnostic

No architecture decision may require a proprietary editor or AI interface. VS Code, Cursor, JetBrains IDEs, terminal editors, and ordinary CLI workflows must all remain viable.

### Replaceable infrastructure

Provider-specific details live behind adapters or infrastructure boundaries. Product/domain logic must not directly depend on proprietary hosting, identity headers, AI SDK response shapes, or storage APIs.

Expected boundaries include:

- authentication;
- database persistence;
- AI provider;
- email/notification provider;
- object/file storage;
- analytics/telemetry;
- deployment target.

### Production traceability

Every deployed build must expose or record an immutable source revision. Production identity must include at minimum:

- Git SHA;
- build/release identifier;
- deployment environment;
- deployment timestamp;
- database migration level where applicable.

A release is not considered identified if it cannot be mapped back to Git.

## Module model

Initial domain boundaries:

- `accounts` — identity-facing account domain when real auth arrives;
- `training` — plans, workouts, exercises, sets, session completion;
- `nutrition` — food/hydration only when the core training loop is stable;
- `progress` — derived views over real durable records;
- `coach` — guidance contracts and safety policy; provider integration later.

UI code may compose these modules but must not become the location of core business rules.

## Data rules

- The server owns authorization decisions.
- Client-provided identity never determines record ownership.
- Durable records use stable identifiers.
- Database changes use versioned migrations committed to Git.
- Destructive migrations require an explicit recovery/rollback plan.
- Sample/demo data must never be indistinguishable from user data.

## Dependency rules

- Prefer a small dependency graph.
- Add a dependency only when it removes more complexity than it creates.
- Pin important production/toolchain dependencies through the lockfile and automated verification.
- Do not introduce distributed systems, queues, caches, or service decomposition without an observed product/operational need.

## Architecture change rule

Implementation agents may not silently change architecture to complete a task. If a task conflicts with this document or requires a new cross-cutting dependency/boundary, stop and escalate the decision to the architecture owner.

Major decisions are recorded as concise ADRs under `docs/decisions/`.
