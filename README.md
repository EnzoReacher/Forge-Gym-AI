# FORGE Gym AI

FORGE is an AI-assisted fitness companion for training, nutrition, recovery,
and progress. It is designed to help people understand the next useful action
without turning fitness into a crowded or intimidating dashboard.

The current repository contains the working web prototype deployed at:

**https://forge-gym-ai.hoangnt2000.chatgpt.site**

## Product principles

- Make the next action obvious.
- Keep logging fast and understandable.
- Use real user actions and real data.
- Support beginners without limiting experienced athletes.
- Treat health, identity, and account information as sensitive.
- Use the Spartan visual identity to create focus, not clutter.
- Never promise that the app can replace consistency or user effort.

The permanent product and engineering rules live in
[AGENTS.md](./AGENTS.md). Read that file before making product, design,
security, data, billing, admin, or architecture decisions.

## Current status

FORGE is currently an owner-only authenticated private beta. It includes:

- Landing, login, and onboarding journeys.
- A short cinematic transition after successful entry.
- Today dashboard and workout logging interactions.
- Fuel and hydration tracking interactions.
- Coach guidance and chat interface.
- Progress views based on completed sessions.
- A responsive Spartan-inspired visual system with reduced-motion support.
- ChatGPT-managed sign-in for the protected app route.
- D1-backed account state and durable records scoped to the authenticated user.
- Server-owned account role, status, and plan foundations.
- Record correction, export, deliberate account deletion, and a public privacy
  notice describing the current product.
- Input validation, 58 automated checks, account-isolation coverage, and
  privacy-safe operational telemetry.

Planning and coaching previews are explicitly labelled. Public multi-user
access, payments, administrator operations, and production AI services must not
be represented as complete until their release gates and security controls
pass. Run `npm run release:status` for the current blockers.

## Technology

- TypeScript
- React
- Vinext / Vite
- Cloudflare-compatible Worker output
- Optional Cloudflare D1 and Drizzle foundations
- OpenAI Sites hosting lifecycle

## Repository structure

| Path | Purpose |
| --- | --- |
| `app/` | Main product interface, layouts, styles, and optional ChatGPT auth helpers |
| `db/` | Durable-data foundation and schema entry points |
| `drizzle/` | Database migration metadata |
| `worker/` | Cloudflare-compatible worker entry point |
| `public/` | Static product assets |
| `scripts/` | Reproducible install, build, environment, and artifact validation |
| `tests/` | Automated product and rendered-output checks |
| `examples/` | Reference examples that are not active product features |
| `.openai/` | Sites hosting manifest |
| `AGENTS.md` | Product constitution, roadmap rules, security baseline, and admin requirements |

## Local development

### Requirements

- Node.js `>=22.13.0`
- npm
- Linux with `flock`, `curl`, and GNU `timeout`

### Install

```bash
npm ci
```

### Run locally

```bash
npm run dev
```

### Validate

```bash
npm test
```

### Production build

```bash
npm run build
```

The build must produce a valid Cloudflare-compatible worker entry point and
hosting manifest. Do not commit generated build output, dependency folders,
runtime caches, or local environment files.

## Data and authentication

The protected app uses ChatGPT-managed identity and D1-backed account state.
Every state read and write derives the owner from the authenticated server
identity; the client cannot choose an owner ID.

Before widening access:

1. Run the deployed two-account isolation matrix.
2. Test sign-in, sign-out, expired sessions, suspension, and recovery.
3. Configure monitored alerts and automated encrypted backups.
4. Complete a recorded restoration drill.
5. Activate final scheduled retention and a dedicated privacy contact.

The deployed verification procedure is in
[`docs/security/deployed-auth-isolation-matrix.md`](./docs/security/deployed-auth-isolation-matrix.md).

Never commit passwords, access tokens, private keys, payment credentials, or
production environment values.

## Planned delivery order

1. Prove deployed authentication and two-account isolation.
2. Complete the FORGE / Raw Steel design reset so the interface is distinctive,
   restrained, and easy to understand rather than AI-template-like.
3. Make Train, Fuel, Coach, and Progress operate on real records.
4. Add monitoring, backups, restore drills, privacy operations, and support
   tools.
5. Build the first protected Admin Control Center.
6. Add secure billing and clearly differentiated Free and paid plans.
7. Move toward mobile using shared product logic and validated user demand.

The active milestone checklist is in
[docs/product/roadmap.md](./docs/product/roadmap.md). Backup and recovery rules
are in
[docs/operations/backup-restore.md](./docs/operations/backup-restore.md).

Paid plans should add meaningful personalization, depth, automation, capacity,
and support. Security, accessibility, essential safety guidance, privacy,
export, correction, and deletion must never be paywalled.

## Security

No software is honestly “unhackable.” FORGE uses defense in depth with the goal
of preventing attacks, limiting impact, detecting abuse, investigating events,
and recovering safely.

Critical areas include:

- Authentication and session security.
- Server-side authorization and user isolation.
- Administrator MFA, least privilege, and audited actions.
- Payment-provider integration without storing card credentials.
- Input validation, safe uploads, rate limits, and abuse controls.
- Secret management, dependency scanning, monitoring, backup, and rollback.

The full mandatory security baseline is defined in
[AGENTS.md](./AGENTS.md#security-and-resilience).

## Ownership

This is the new FORGE codebase. The legacy `Gym_Ver2` repository remains
separate and should not be overwritten or repurposed.
