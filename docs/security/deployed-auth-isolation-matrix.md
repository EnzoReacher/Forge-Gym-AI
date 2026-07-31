# Deployed authentication and isolation matrix

Status: ready to run against a deployed version. This is a wider-access gate,
not a unit-test substitute.

## Purpose

Prove that two real platform identities receive separate FORGE accounts, that
the deployed runtime persists only the correct owner's records, and that
session recovery and deletion behave safely.

Use two dedicated adult test accounts, A and B. Do not use a real athlete's
training, nutrition, medical, or payment information. Never record cookies,
authorization headers, platform tokens, bypass credentials, or full email
addresses in evidence.

## Preconditions

- Record the deployed FORGE version and test date.
- Grant both test accounts the minimum access required for the test.
- Use separate clean browser profiles so sessions cannot share storage.
- Confirm the production health check is healthy before starting.
- Use synthetic identifiers such as `ISO-A-<date>` and `ISO-B-<date>`.

## Matrix

| ID | Action | Required result |
| --- | --- | --- |
| AUTH-01 | Open `/app` while signed out in profile A. | The platform sign-in gate appears; FORGE never asks for a password. |
| AUTH-02 | Sign in as account A and complete onboarding. | One protected athlete workspace opens. |
| AUTH-03 | Sign out through FORGE, then revisit `/app`. | The previous workspace is unavailable until platform authentication succeeds again. |
| AUTH-04 | Sign back in as A. | A's account and saved records return without duplicate onboarding. |
| ISO-01 | As A, save a unique profile name, workout, meal and hydration entry. | Every item confirms sync and survives reload. |
| ISO-02 | Sign in as B in the separate profile. | None of A's identifiers or records appear. |
| ISO-03 | As B, save different unique records, reload, export, then correct one record. | Only B's records appear in the UI and export; the correction persists. |
| ISO-04 | Return to A and export records. | A sees only A's original identifiers and no B identifier. |
| DEL-01 | Permanently delete B with the exact confirmation. | B is signed out and the prior B account is gone. |
| DEL-02 | Sign in again as B. | A new empty athlete account opens; deleted B records do not return. |
| DEL-03 | Return to A. | A's records remain unchanged. |
| FAIL-01 | Interrupt one record request using browser network controls, then restore connectivity. | The action remains visibly pending, retries once connectivity returns, and is not duplicated. |
| FAIL-02 | Reload while a safe mutation is pending, then restore connectivity. | The bounded per-tab queue restores the visible result and clears after server confirmation. |

## Restricted-account cases

Suspension and privileged-account deletion require an authorized administration
path. They must not be simulated by editing production D1 directly. Run those
cases only after the protected Admin Control Center exists:

| ID | Action | Required result |
| --- | --- | --- |
| AUTH-05 | Suspend test account B through an audited admin action. | B receives the restricted-account recovery state and cannot read or write records. |
| AUTH-06 | Restore B through an audited admin action. | B can authenticate again without affecting A. |

## Evidence record

For each ID record only:

- deployed version, UTC time, browser family, and pass/fail;
- the synthetic identifier used, with no email address;
- response class or user-visible result, never a request/response body;
- issue link and rollback decision for any failure.

Two people should review the final matrix. Any cross-account exposure, stale
access after sign-out, restored deleted data, or duplicate retry is a release
stop. Revoke both test accounts' temporary access and delete synthetic accounts
after the evidence has been reviewed.
