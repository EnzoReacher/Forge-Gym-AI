# FORGE V2 — Roadmap

## Phase 0 — Control system

Goal: establish a project that cannot drift silently.

- [x] Define product scope and non-goals.
- [x] Define architecture invariants.
- [x] Define agent roles and permissions.
- [x] Define factual current-state checkpoint.
- [x] Define milestone order.
- [ ] Establish dedicated V2 repository or promote this clean V2 tree into one.
- [ ] Add minimal CI gates for the chosen V2 toolchain.
- [ ] Add `.env.example` and reproducible local bootstrap after stack selection.

Exit gate: a new contributor can identify authority, scope, current state, and next task without reading chat history.

## Phase 1 — Product skeleton

Goal: choose the smallest portable stack and prove local operation.

- [ ] Select web/runtime stack using explicit criteria: portability, maintainability, local development, ecosystem maturity, testing, deployability.
- [ ] Select primary database using the same criteria.
- [ ] Create minimal app shell and local server.
- [ ] Add health/version endpoint exposing safe build identity.
- [ ] Add automated build, lint, test, and secret-scan gates.
- [ ] Document clean-machine bootstrap.

Exit gate: clone -> configure -> run -> test works without proprietary IDE or hidden hosted state.

## Phase 2 — Core athlete loop

Goal: make training useful before broadening the product.

- [ ] Today: one obvious next action.
- [ ] Prepare/start workout.
- [ ] Fast set logging.
- [ ] Safe workout completion.
- [ ] Durable workout history.
- [ ] Progress derived only from real records.
- [ ] Mobile-first and keyboard/reduced-motion acceptance checks.

Exit gate: an athlete can complete the entire loop repeatedly without fake data, dead controls, or confusing navigation.

## Phase 3 — Accounts and durable ownership

Goal: add real identity only after the core product is worth protecting.

- [ ] Select mature authentication provider/interface behind an auth boundary.
- [ ] Server-owned authorization.
- [ ] Owner-scoped durable records.
- [ ] Two-account isolation tests.
- [ ] Export, correction, and deletion foundations.

Exit gate: cross-account access is denied by design and verified by tests.

## Phase 4 — Fuel

Goal: add useful nutrition/hydration support without turning FORGE into a spreadsheet.

- [ ] Define minimal food/hydration jobs-to-be-done.
- [ ] Implement only validated flows.
- [ ] Keep all displayed data truthful and user-owned.

## Phase 5 — Coach

Goal: add provider-backed AI only after deterministic product context and safety contracts exist.

- [ ] Define model-independent input/reply contracts.
- [ ] Reintroduce/adapt proven V1 safety cases deliberately.
- [ ] Choose provider/model behind adapter boundary.
- [ ] Add cost, rate-limit, timeout, uncertainty, and safety telemetry.
- [ ] Fail closed on critical safety evaluation regressions.

## Phase 6 — Production operations

Goal: make production observable, reversible, and attributable.

- [ ] Deployment from verified Git revision only.
- [ ] Release manifest with Git SHA/build ID/migration level.
- [ ] Health monitoring and alerting.
- [ ] Backups and tested restore path.
- [ ] Rollback procedure.
- [ ] Incident response baseline.

## Phase 7 — Expansion

Only after earlier gates pass:

- admin/support operations;
- billing/entitlements;
- advanced coaching/personalization;
- mobile delivery;
- uploads/integrations;
- youth access with appropriate consent/safety design.

## Roadmap rule

A later phase may not be pulled forward merely because it is interesting or easy for an agent to implement. Milestone order changes require an explicit owner/architecture decision and an update to this file.
