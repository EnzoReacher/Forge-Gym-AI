# Hosted production health activation

Status: probe and manual workflow ready. Scheduled delivery is not active until
the repository secrets and notification destinations are configured and tested.

## What is ready

`scripts/production-health-check.mjs` checks the production `/api/health`
contract with a 10-second timeout and one bounded retry. It accepts the Sites
bypass credential only through process environment, follows no redirects,
prints no URL, token, response body, account identity, or saved data, and fails
closed when the response is not the expected runtime-and-database result.

The GitHub Actions workflow is manual-only until the first controlled delivery
test succeeds. This prevents a scheduled workflow from creating false
confidence or repeated failures before its protected configuration exists.

## Activation gate

Before enabling a schedule:

1. Add `FORGE_PRODUCTION_URL` as a repository secret.
2. Add the current Sites bypass credential as
   `FORGE_SITES_BYPASS_TOKEN`. Never place it in source, an issue, chat, or a
   workflow file.
3. Run the `Production health` workflow manually.
4. Confirm a healthy run.
5. Perform a controlled failed-health exercise without production user data.
6. Verify one primary and one backup notification destination receive and
   acknowledge the failure.
7. Only then add the schedule and mark hosted alert delivery active.

Rotating the Sites bypass credential requires replacing the repository secret
before the next probe. A missing or invalid secret must fail the workflow; it
must never silently skip monitoring.

## Privacy boundary

The probe records only pass/fail, HTTP status, bounded reason category,
duration, and attempt count. It must not log the checked URL, authorization
header, response body, user data, authentication claims, request contents, or
database rows.
