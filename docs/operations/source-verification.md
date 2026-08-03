# Source verification

Every pull request and every update to `main` must run the same bounded source
gate before the change is treated as a healthy checkpoint.

## Automated gate

The **Source verification** workflow:

1. uses read-only repository permission and disables persisted Git credentials;
2. installs the exact dependency graph from `package-lock.json`;
3. runs lint;
4. builds the production worker and runs every deterministic test; and
5. rejects known high-severity vulnerabilities in production dependencies.

Third-party actions are pinned to full commit SHAs. Concurrent checks for an
older commit are cancelled when a newer commit reaches the same branch.

## Boundary

This gate protects source quality and the locked production dependency graph.
It does not prove that the hosted identity provider, database, monitoring,
backups, or notification destinations are healthy. Those remain separate
deployed release gates in the roadmap.
