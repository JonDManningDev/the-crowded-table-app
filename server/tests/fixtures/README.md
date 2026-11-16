# Reviewed verification inputs

The catalog now includes the reviewed policy-only migration `20261116000100`:
15 permissive runtime read policies (including the unchanged standing reference),
seven retained restrictive archive policies, and operation-specific mutation
policies in place of all seven mixed policies. Root lock visibility is selector
free, with a false lock-only write check and the original command write check;
identity grants/invariants remain unchanged. Only policies, dependencies and migration metadata changed;
functions, triggers, defaults, schema permissions and the runtime manifest match
the prior catalog. The earlier checkpoint history below remains preserved.

`http-contract.json` remains the reviewed Fastify HTTP baseline. The account blocking revision changes only the two exact-profile responses, the two ordinary list projections and the block request body.

`policy-catalog.json` recorded the reviewed local PostgreSQL catalog before the trusted-read follow-up, through migration `20261114000100`, which removed the retired peer preference lock policy and its dependency entry. The original fixture moved byte-for-byte from the policy migration record through `20261110000800`. Migration `20261111000100` added the two-UUID setup function and its `ct_api` EXECUTE grant. Migration `20261112000100` replaces those reviewed catalog entries with the three-UUID `app_private.begin_actor_context(uuid,uuid,uuid)` definition, signature and matching grant. The volatile security invoker sets actor and operation, calls the retained `lock_eligible_actor()` Auth definer, then sets the initial tenant for eligible transactions. Local catalog regression, the hosted harness and the hosted checkpoint compare against the catalog for their checked-out source revision. The completed November 10 hosted verification used the earlier catalog through `20261110000800`.

`hosted-policy-baseline/before-{catalog,data,integrity}.json` are the original reviewed pre-migration inputs for the selected hosted development project. Data contains table counts/checksums, not row contents. The hosted harness and checkpoint use data/integrity to prove preservation. The before checkpoint refuses to overwrite the existing baseline files. Do not replace them to accept drift; any future hosted fixture run needs separate authorization and a current reviewed baseline.

`node supabase/tests/policy-catalog.mjs` exports a local review candidate to ignored `server/test-results/policy/local-catalog.json`; it does not overwrite this fixture. Review intended catalog changes before explicitly updating the checked-in input. Hosted verification/checkpoint output goes to ignored `server/test-results/hosted-policy/`. Neither output directory is a baseline source.
