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

FORGE is currently a front-end product prototype. It demonstrates:

- Landing, login, and onboarding journeys.
- A short cinematic transition after successful entry.
- Today dashboard and workout logging interactions.
- Fuel and hydration tracking interactions.
- Coach guidance and chat interface.
- Progress views based on completed local sessions.
- A responsive Spartan-inspired visual system with reduced-motion support.

Some state is still device-local or demonstrative. Real multi-user accounts,
durable user data, payments, administrator operations, and production AI
services must not be represented as complete until their server-side
implementations and security controls exist.

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

The repository includes foundations for D1, Drizzle, and ChatGPT-managed
identity, but the current product must still be treated as a prototype until
real account-owned records and server-enforced authorization are implemented.

Before storing important user data:

1. Add real authentication and durable per-user storage.
2. Enforce authorization for every protected action and record.
3. Test user isolation explicitly.
4. Add audit logging, monitoring, encrypted backups, and restoration tests.
5. Add privacy controls for access, correction, export, and deletion.

Never commit passwords, access tokens, private keys, payment credentials, or
production environment values.

## Planned delivery order

1. Keep the core web journey simple and genuinely useful.
2. Add secure accounts and durable user-owned data.
3. Make Train, Fuel, Coach, and Progress operate on real records.
4. Add monitoring, backups, audit logs, privacy operations, and support tools.
5. Build the first protected Admin Control Center.
6. Add secure billing and clearly differentiated Free and paid plans.
7. Move toward mobile using shared product logic and validated user demand.

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
