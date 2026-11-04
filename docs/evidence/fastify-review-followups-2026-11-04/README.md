# Fastify review follow-ups — port validation and AJV defaults

Implemented on 2026-11-04 from clean checkpoint `2448c1e7ef9a660695be21e339f67e577c338dc4`. The [completed architecture plan](../../22-fastify-architecture-refactoring-plan.md#review-follow-ups--port-validation-and-ajv-defaults) remains authoritative; Phase 1–5 evidence remains historical and unchanged.

## Changes and regression coverage

A private numeric validator in [startup](../../../server/src/index.ts) requires an integer from `0` through `65535` and is shared by environment parsing and `startApi`. Environment text accepts ASCII decimal digits only, with leading zeros and explicit `"0"` supported; absent `PORT` still defaults to `3001`. Empty strings, whitespace (including trailing newlines), signs, fractions, hexadecimal, exponent forms, non-ASCII digits and out-of-range/overflowing values are rejected. Every invalid port raises `Error("PORT must be a decimal integer between 0 and 65535.")`.

Programmatic startup validates its numeric port as its first step, before verifier/cursor construction or database allocation. Public signatures, valid listener behavior, cleanup ownership and the CLI's existing generic failure diagnostic remain unchanged.

The [startup suite](../../../server/tests/startup.test.mjs) now covers:

- Absent/default configuration and valid `"0"`, `"1"`, `"3001"`, `"003001"`, `"65535"` values.
- Malformed/blank/padded values, newline/tab input, signed values, fractions, hexadecimal, exponent notation, `NaN`, infinity, Unicode digits and numeric overflow.
- Programmatic `NaN`, infinities, negative/out-of-range/fractional values and invalid runtime types. Every rejection asserts no constructor/readiness/allocation/cleanup events and no application instance.
- Malformed-PORT CLI exit status `1`, empty stdout and the unchanged generic diagnostic. The existing real port-`0` listener, shutdown, startup failure and exactly-once cleanup cases remain in the full gate.

The new [AJV regression case](../../../server/tests/http-baseline.test.mjs) registers `/test-only/defaults` on a fresh harness before readiness. Its optional query field has a JSON Schema default. Without input the response is exactly `{}`; with explicit input it is exactly `{value:"supplied"}`. Both return 200 and execute no database query. The route exists only in that test instance, separate from the fixture-comparison application. Production AJV settings and routes are unchanged.

## Verification

Run sequentially from the repository root:

```powershell
npm run test:http -w server
npm run check -w server
npm run lint
```

| Gate | Result |
| --- | --- |
| HTTP/shared/startup/adapter tests | 63 passed, zero failures/skips; all prior 60 cases retained plus three new cases |
| Server TypeScript | Passed |
| Root ESLint | Passed |
| HTTP contract fixture | Unchanged; 41 explicit operations and 28 HEAD routes with preserved schemas, limits and identity categories |
| Diff/scope review | Limited to startup validation, the two existing test files and documentation; no changes to resource construction, SQL, dependencies, migrations or client/shared contracts |
| Historical evidence | Phase 1–5 evidence unchanged |

All required checks passed without weakening assertions or suppressing rules. No Supabase execution, environment-file modification, migration, dependency change, frontend implementation, hosted operation or deployment occurred. The broader Phase 5 SQL/runtime/frontend results remain recorded in its historical evidence and were not rerun for this narrow follow-up. This work forms one independently reviewable follow-up commit.
