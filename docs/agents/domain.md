# Domain Docs

## Read before exploring

Start with `docs/README.md`, search `docs/08-decisions-and-open-questions.md`,
and read the applicable product and engineering documents as required by
`AGENTS.md`. The terminology table in `docs/README.md` remains an existing
source of domain vocabulary.

Also read the root `GLOSSARY.md` and relevant records under `docs/adr/` when
they exist. If either is absent, continue without creating placeholder files.
The domain-modeling skill creates them when terminology or substantial
decisions are resolved.

## Layout

Use one application-wide context across `client/`, `server/` and `shared/`:

- `GLOSSARY.md`: shared domain vocabulary.
- `docs/adr/`: substantial decision tradeoffs.

Workspace and feature ownership remain as documented in
`docs/07-file-structure.md` and the applicable architecture plans.

## Vocabulary and decisions

Use established terms in issues, proposals, tests and implementation. Surface
gaps for domain modeling rather than inventing synonyms.

Follow Decision maintenance in `docs/08-decisions-and-open-questions.md`:
record accepted choices with date, rationale, affected files and reconsideration
triggers; use separate ADRs only for substantial tradeoffs. Link ADRs from the
decision register and reconcile affected documents rather than duplicating
requirements.

Explicitly identify conflicts with an accepted decision or ADR, including the
record and proposed reason for reconsideration. Distinguish accepted decisions,
proposals, historical milestones, open questions and deferred features.
