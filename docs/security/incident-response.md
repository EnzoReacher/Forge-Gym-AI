# FORGE incident response

Status: owner-operated baseline. A practice exercise is still required before
wider access.

## Severity

| Severity | Examples | Initial response |
| --- | --- | --- |
| Critical | Confirmed cross-account access, exposed production credentials, destructive data loss | Contain immediately; block release and user-impacting writes |
| High | Suspected privilege change, sustained authentication failure, material corruption | Begin triage immediately and prepare containment |
| Medium | Elevated error rate, degraded latency, recoverable partial outage | Investigate in the current operating window |
| Low | Isolated fault without security or data impact | Record, prioritize, and monitor |

## Roles

- Incident lead: owns severity, decisions, timeline, and closure.
- Operations: contains the fault, preserves evidence, restores service, and
  verifies recovery.
- Communications and privacy: determines affected users and prepares accurate
  notices.

One owner may hold several roles during private operation, but every decision
must still be recorded.

## Response sequence

1. **Detect and declare.** Open a private incident record with time, affected
   service, fixed request IDs, symptoms, and current severity.
2. **Triage.** Determine whether authentication, authorization, confidentiality,
   integrity, or availability is affected. Treat suspected cross-account access
   as critical until disproved.
3. **Contain.** Disable the narrowest affected write path, revoke exposed
   credentials, suspend compromised privileged access, or roll back the release.
4. **Preserve evidence.** Retain relevant deployment identifiers, sanitized
   operational events, request IDs, audit records, and exact response times.
   Never copy user request bodies, email addresses, meal details, workout
   history, tokens, or health-related content into issues or chat.
5. **Eradicate.** Patch the cause, rotate every affected credential, invalidate
   sessions when necessary, and confirm least privilege.
6. **Recover.** Restore or roll back from a verified source, run release health
   checks, test owner isolation, and monitor for recurrence.
7. **Notify.** Tell affected users what happened, what data and time window were
   involved, what FORGE did, and what the user should do. Meet applicable legal
   timelines before convenience or reputation concerns.
8. **Review.** Within the next operating cycle, document root cause, detection
   gap, response timing, corrective owners, deadlines, and a regression test.

## Completion criteria

An incident closes only when the cause is contained, affected credentials are
rotated, recovery and owner isolation are verified, required user notification
is complete, follow-up work has owners, and monitoring shows no recurrence.
