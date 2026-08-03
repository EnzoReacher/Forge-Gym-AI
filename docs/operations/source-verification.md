# Source verification

Every pull request and every update to `main` must run the same bounded source
gate before the change is treated as a healthy checkpoint.

## Automated gate

The **Source verification** workflow:

1. uses read-only repository permission and disables persisted Git credentials;
2. installs the exact dependency graph from `package-lock.json`;
3. rejects tracked environment files, private keys, and common provider
   credentials without printing their values;
4. runs lint;
5. builds the production worker and runs every deterministic test; and
6. rejects known high-severity vulnerabilities in production dependencies.

Third-party actions are pinned to full commit SHAs. Concurrent checks for an
older commit are cancelled when a newer commit reaches the same branch.

Dependabot checks npm and pinned GitHub Actions every Monday. Compatible npm
minor and patch updates are grouped; major updates remain separate so they
receive an explicit compatibility review. A Dependabot pull request still has
to pass the full source-verification gate before merge.

## Boundary

This gate protects source quality and the locked production dependency graph.
It does not prove that the hosted identity provider, database, monitoring,
backups, or notification destinations are healthy. Those remain separate
deployed release gates in the roadmap.
