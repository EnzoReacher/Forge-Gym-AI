# FORGE V2

FORGE V2 is a clean rebuild of FORGE as a locally runnable, IDE-agnostic, version-controlled fitness companion.

## Status

Phase 0: engineering system and product backbone.

No V2 application code has been selected or implemented yet. This is intentional: architecture and operating rules come before framework choices.

## Ownership model

- Git is the source of truth.
- The repository must be clonable and understandable without ChatGPT Sites.
- Local development must be a first-class supported environment.
- Hosting, authentication, database, AI, email, analytics, and storage providers must remain replaceable behind documented boundaries.
- Production must always be traceable to an immutable Git revision.

## Authority

Read these files in order before changing V2:

1. `PROJECT.md` — product scope and non-goals.
2. `ARCHITECTURE.md` — technical structure and invariants.
3. `ROADMAP.md` — milestone order.
4. `CURRENT_STATE.md` — factual current checkpoint.
5. `AGENTS.md` — agent roles, permissions, and execution process.

If two documents conflict, stop and resolve the conflict before implementation.

## V1

The existing FORGE implementation on `main` is preserved as historical/reference material. V2 does not inherit V1 code automatically. Product lessons, safety principles, useful test cases, and proven requirements may be deliberately reintroduced only when they earn their place.

## First product loop

V2 will first prove one excellent athlete loop:

`Enter FORGE -> Today -> Start workout -> Log workout -> Finish -> See progress`

Fuel and Coach come after that loop is coherent and enjoyable.

## Definition of healthy

A healthy FORGE V2 can be cloned to a new machine, configured from documented example environment values, started locally with documented commands, tested without hidden platform state, and mapped from every deployment back to a Git commit.
