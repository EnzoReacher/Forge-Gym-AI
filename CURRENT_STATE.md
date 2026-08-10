# FORGE V2 — Current State

Checkpoint date: 2026-08-10

## Repository state

- V1 authoritative baseline remains `main@8b7d79096c97f25a794dbcc2c660b02611ffb975`.
- V1 production identity remains unresolved and must not be inferred from V2 work.
- V2 is being established as a clean implementation tree, separate from V1 application code.
- No V2 framework, database, authentication provider, hosting provider, or AI provider has been selected yet.
- No V2 production deployment exists.

## Current phase

Phase 0 — Control system.

## Established decisions

- Git is source of truth.
- Local development is first-class.
- IDE choice is irrelevant to project operability.
- V2 is a modular monolith initially.
- Provider-specific infrastructure must remain replaceable behind boundaries.
- V1 implementation is reference material, not an automatic dependency.
- Product work begins with the athlete training loop.
- Multiple AI agents operate under one architecture authority and bounded task contracts.
- CI is an independent verification authority; agent self-claims are insufficient.

## Explicitly not established yet

- application framework;
- package manager/runtime version;
- database engine;
- ORM/query layer;
- auth provider;
- deployment provider;
- AI provider/model;
- production domain;
- billing provider;
- observability provider.

These choices must be made deliberately in Phase 1. Existing V1 choices are not defaults.

## Next safe task

Create the dedicated V2 repository (or explicitly promote this clean V2 tree), then perform a short architecture decision for the smallest portable web/runtime + database stack that satisfies `ARCHITECTURE.md`.

No product feature implementation should begin before that checkpoint.
