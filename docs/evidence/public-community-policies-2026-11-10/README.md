# Public community queries: issue #13

Local checkpoint, 2026-11-10. Spec: [issue #13](https://github.com/JonDManningDev/the-crowded-table-app/issues/13), parent #5, ADR 0001 and document 23. Baseline: `062d9aaaf30ff6ef79b1cdf9b218d42c504de8b9`. No hosted work.

## Boundary

Community policies own the active landing predicate, fresh directory gate facts/decision/requirement and approved/suspended target predicate. Services own exact-slug lookup, tenant SHARE locks, post-wait statements and explicit projections. Public operations use the existing retrying public transaction path without actor identity, operation stamps or Auth eligibility locks; optional HTTP token verification remains unchanged.

Landing returns the same seven detail fields, four public settings and seven supported copy slots with only tenant/key/text. Directory gating is independent of activity/chat settings. Target filtering precedes UUID ordering, cursor and limit+1; only display name/effective badge leave HTTP. Cursors retain encryption, scope, default/max limits and UUID ordering. No community enumeration endpoint is added. Missing, archived and disabled directory outcomes retain 404 privacy; invalid supplied tokens retain 401 and public replies retain no-store.

Migration `20261110000700` drops both private projection functions without CASCADE. Readiness requires their absence; the reviewed runtime manifest removes exactly their two EXECUTE entries, with no relation/column grant changes. The preceding catalog is recorded under issue #12 evidence; [after-catalog](after-catalog.json) records this checkpoint's live functions, grants, policies and relevant triggers.

Anonymous orchestration has SELECT policies for one transaction-local exact slug and tenant scope on settings/copy/accounts/profiles/staff. These selectors are set only by the trusted API. They provide neither verified identity nor command scope. PostgreSQL FOR SHARE also requires an UPDATE USING policy on the root: `public_root_lock` admits the exact root for locking but has WITH CHECK false. It does not admit anonymous writes. Authenticated command policies remain unchanged. Runtime SQL may select granted active-community fields within its chosen scope independently of caller product permissions; API gates/projections enforce the public audience. This is the intended trusted-runtime boundary, not an external grant. Restrictive archive fences deny anonymous archived settings/copy/accounts/profiles/staff even with selectors set. No new database function, role, grants, external surface or compatibility interface is added.

## Verification

Agreed seams are the ticket's existing HTTP, actual local Auth/runtime SQL, concurrency and compiler boundaries. A retirement assertion failed against the old function before implementation. The directory/configuration suites cover anonymous and authenticated equality, invalid tokens, missing/disabled/archive gates, projection/badges, default/max and boundary pages, scope/tampering and both gate-change lock orders. Added direct runtime checks verify no unscoped root/profile enumeration, public root locks, rejected public writes and archived-content rejection across all five scoped content relations. The archive waiter covers landing and directory together. Retry fault injection targets the new query and confirms anonymous identity through a full retry. Injection scripts changed for the additional orchestration statements; the reviewed HTTP contract fixture is unchanged.

Commands (use npm.cmd on Windows):

```sh
npm run check -w server
node --test server/tests/community-http.test.mjs
node --env-file=server/.env.local .scratch/issue-12-local.mjs node server/tests/directory-local.mjs
node --env-file=server/.env.local .scratch/issue-12-local.mjs node server/tests/configuration-local.mjs
npm run test:http -w server
node --env-file=server/.env.local .scratch/issue-12-local.mjs npm.cmd run test:local -w server
node --env-file=server/.env.local .scratch/issue-12-local.mjs sql test db --yes
node --env-file=server/.env.local .scratch/issue-12-local.mjs sql db lint --schema public,app_private --level warning
npm run verify:types
npm run test:types:local -w server
node --env-file=server/.env.local .scratch/issue-12-local.mjs node supabase/tests/direct_data_api.mjs
node supabase/tests/direct_data_api_upgrade.mjs
npm run lint
npm test -- --run
npm run build
```

The existing untracked local runner replaces obsolete forwarded transport ports with CLI-verified loopback endpoints. Local target: API 127.0.0.1:54321 and PostgreSQL 127.0.0.1:54322, Node 22.22.2. Docker checks use execution outside the sandbox. Migration was applied locally; a root-lock policy correction was applied from a SQL file and folded into this uncommitted forward migration, then verified by isolated replay/upgrade. No working database reset occurred. GitHub CLI GraphQL lacked authentication; connected GitHub tools retrieved the issue/comments, and the CLI dependency summary confirmed zero open blockers.

Passed: 75 HTTP cases, nine local foundation suites, 12 retry assertions, 134-file client boundary scan, 279 client cases, 279 pgTAP assertions, compiler/lint/build, SQL lint, generated-type drift/two driver-schema cases, 51 hostile PostgREST checks and isolated clean replay/populated upgrade. The existing bundle-size warning remains. Intermediate failures were corrected: root-lock RLS, obsolete injection scripts, the new fixture's profile count and denied-write savepoint/projections. Final suites passed; redirected npm notices formatted as PowerShell NativeCommandError are not test failures.

## Review

Two independent code-review agents reviewed the nonempty staged checkpoint against `062d9aaaf30ff6ef79b1cdf9b218d42c504de8b9`. Pre-existing unstaged planning/publication changes are excluded from this commit/review.

### Standards

No documented-standard violations or actionable Fowler smells found. Policies own audience predicates/decisions; services coordinate root locks, fresh post-wait facts, projections and pagination. The migration retains restrictive archive fences and external denial. Tests distinguish HTTP authorization, runtime safeguards and external Data API denial. This reviewer performed a read-only review without rerunning database suites.

### Spec

No findings. Exact-slug access, projections, directory gates, badges, cursor scope/order, anonymous identity and post-wait checks match issue #13. Function retirement and manifest/readiness changes are consistent, with no scope creep. This reviewer independently reran all 35 community HTTP and baseline tests successfully and reviewed recorded database/concurrency evidence without rerunning mutating suites.

Review summary: Standards 0 findings; Spec 0 findings. This completes the locally verified issue #13 checkpoint. Issues #14-#15 and hosted migration/verification retain separate scope.
