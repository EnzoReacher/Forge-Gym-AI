# Security Policy

FORGE handles fitness, health-adjacent, identity, and eventually payment-related
information. Treat every report involving user data, authentication,
authorization, administrator access, payments, or secrets as sensitive.

## Supported version

Security fixes are applied to the latest code on the `main` branch. The current
product is a prototype and must not be represented as production-secure until
real server-enforced authentication, authorization, monitoring, backups, and
recovery controls are implemented and tested.

## Report a vulnerability privately

Do not open a public issue for a suspected vulnerability.

Use the repository's **Security** tab to create a private security advisory. If
that option is unavailable, contact the repository owner through an existing
private channel and include only the minimum information needed to reproduce the
problem.

Never include real passwords, access tokens, private keys, session cookies,
payment credentials, or another person's personal data in a report.

A useful report includes:

- The affected page, endpoint, dependency, or commit.
- Clear reproduction steps using test data.
- The realistic impact.
- Any temporary mitigation already applied.
- Screenshots or logs with secrets and personal data removed.

## Response principles

Reports are handled using defense in depth:

1. Confirm and contain the issue.
2. Protect affected users and credentials.
3. Fix the root cause and add regression coverage.
4. Review logs and related systems for signs of abuse.
5. Communicate accurately without claiming the software is “unhackable.”
6. Document recovery and prevention work.

Security, privacy, accessibility, data export, correction, and deletion must
never become paid-only protections. See [AGENTS.md](./AGENTS.md) for the full
FORGE security and product baseline.
