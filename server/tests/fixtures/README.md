# Reviewed verification inputs

`http-contract.json` remains the reviewed Fastify HTTP baseline.

`policy-catalog.json` is the reviewed local PostgreSQL catalog after migration `20261110000800`. Local catalog regression, the hosted harness and the hosted checkpoint compare against it. It was moved byte-for-byte from the completed policy migration record; this cleanup did not regenerate or approve a different catalog.

`hosted-policy-baseline/before-{catalog,data,integrity}.json` are the original reviewed pre-migration inputs for the selected hosted development project. Data contains table counts/checksums, not row contents. The hosted harness and checkpoint use data/integrity to prove preservation. The before checkpoint refuses to overwrite the existing baseline files. Do not replace them to accept drift; any future hosted fixture run needs separate authorization and a current reviewed baseline.

`node supabase/tests/policy-catalog.mjs` exports a local review candidate to ignored `server/test-results/policy/local-catalog.json`; it does not overwrite this fixture. Review intended catalog changes before explicitly updating the checked-in input. Hosted verification/checkpoint output goes to ignored `server/test-results/hosted-policy/`. Neither output directory is a baseline source.
