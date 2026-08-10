# FORGE V2 — Agent Operating Contract

This file governs AI-assisted work in FORGE V2.

## Command structure

### Owner

The project owner has final authority over product direction, architecture exceptions, releases, production, destructive actions, and roadmap changes.

### GPT-5.6 Sol — Architecture / Engineering Lead

Sol owns:

- architecture and module boundaries;
- product/engineering invariants;
- security model and critical data contracts;
- decomposition of milestones into bounded task packets;
- review of cross-cutting changes;
- release-readiness recommendations;
- reconciliation of conflicting agent work.

Sol must not silently broaden scope simply because a larger change seems convenient.

### Execution agents (for example Luna CLI)

Execution agents may:

- implement an explicitly assigned task packet;
- add/update tests required by that task;
- update documentation directly affected by that task;
- perform bounded refactors inside the allowed scope;
- report blockers and architecture conflicts.

Execution agents may not, without explicit architecture-owner approval:

- change architecture or module ownership;
- add cross-cutting infrastructure;
- replace major dependencies/providers;
- modify unrelated modules;
- redesign navigation/information architecture;
- change security/authorization boundaries;
- modify production;
- merge their own work;
- weaken tests or acceptance gates to make a task pass.

### CI — Independent verifier

CI is not an implementation agent. Its job is to independently evaluate the proposed source using deterministic checks.

An agent saying “done” is not evidence of completion.

## Required workflow

Every implementation task follows:

`Define -> Inspect -> Task Packet -> Implement -> Verify -> Review Diff -> Checkpoint -> Document`

Skipping a stage requires an explicit reason recorded in the task/PR.

## Task Packet contract

Before non-trivial implementation, define:

- Task name
- Goal
- Why now
- Allowed scope
- Explicit non-scope / files or systems not to change
- Acceptance criteria
- Verification commands/checks
- Data/security considerations
- Expected evidence

If implementation discovers that the task cannot be completed inside those boundaries, stop and escalate. Do not solve the inconvenience by rewriting the architecture.

## Change discipline

- Work on short-lived branches.
- No direct feature work on `main`.
- One task/concern per PR when reasonably possible.
- Keep diffs small enough to review semantically.
- Never mix dependency upgrades, formatting sweeps, architecture changes, and feature work unless the task explicitly requires them.
- Delete superseded code instead of stacking new systems over old ones.
- Never hide uncertainty in documentation or PR descriptions.

## Evidence required at completion

Every agent handoff must state:

1. What changed.
2. Why it changed.
3. Files/modules touched.
4. Tests/checks executed.
5. Results.
6. Known limitations or unverified behavior.
7. Architecture/security decisions introduced, if any.
8. Follow-up required.

## Stop conditions

Stop and escalate when:

- source of truth is unclear;
- a requested change conflicts with `PROJECT.md` or `ARCHITECTURE.md`;
- production identity cannot be established for a production action;
- a data migration has no recovery plan;
- authentication/authorization ownership is ambiguous;
- acceptance criteria cannot be verified;
- completing a task would require unrelated cross-cutting changes.

## Safety and destructive actions

Agents must not perform destructive repository, database, infrastructure, or production actions based on inference. Destructive work requires explicit owner authorization and a verified recovery path where applicable.

## Principle

Multiple agents are workers under one system of record. They are not independent project authorities.
