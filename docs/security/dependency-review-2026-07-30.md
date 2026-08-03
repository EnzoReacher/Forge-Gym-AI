# Dependency security review — 2026-07-30

Status: completed for this release checkpoint.

## Scope and result

The review separated production runtime exposure from development and build
tooling. Before remediation, `npm audit --omit=dev` reported three high-severity
findings inherited through PostCSS, Sharp, and Next.js dependency paths.

FORGE updated the compatible build packages and locked patched transitive
versions:

- PostCSS `8.5.25`
- Sharp `0.35.3`
- Vite `8.1.5`
- Cloudflare Vite plugin `1.48.0`
- React server components tooling `19.2.8`
- Wrangler `4.115.0`

After remediation, `npm audit --omit=dev` reports zero known low, moderate,
high, or critical production-runtime findings.

## Residual toolchain exposure

The full development audit still reports inherited findings in linting and
schema-generation toolchains. They are not shipped in the production runtime,
but they remain relevant to developer machines and CI. The suggested automated
fixes would downgrade or make incompatible major-version changes, so they were
not applied blindly.

Controls until upstream-compatible fixes are available:

- Keep the lockfile authoritative and use `npm ci`.
- Review weekly Dependabot pull requests for npm and pinned GitHub Actions;
  never auto-merge a change that has not passed source verification.
- Run untrusted branches without production secrets.
- Keep CI credentials least-privileged.
- Do not run schema-generation or lint commands on untrusted repositories.
- Re-run both production and full audits at each dependency checkpoint.

This review reduces known exposure; it is not a claim that the software or its
supply chain is invulnerable.
