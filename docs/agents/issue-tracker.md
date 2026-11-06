# Issue tracker: GitHub

Issues and specs for this repo live in GitHub Issues at
https://github.com/JonDManningDev/the-crowded-table-app. Use the `gh` CLI.

## Repository and publication

- Run commands from this clone. Before the first issue creation in a session,
  verify `gh repo view --json nameWithOwner` resolves to
  `JonDManningDev/the-crowded-table-app`.
- Publish a spec or ticket by creating an issue in this repository. Fetch a
  ticket by reading its issue body and comments.
- Existing accepted requirements remain authoritative under `docs/README.md`.
  Record accepted decisions and reconcile affected documentation according to
  `AGENTS.md`; an issue does not silently supersede them.
- Use `--body-file <path>` for multiline issue bodies and comments.

## Operations

- Create: `gh issue create --title "..." --body-file <path>`.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open --json number,title,labels,assignees`.
- Update: `gh issue edit <number> --body-file <path>`.
- Comment: `gh issue comment <number> --body-file <path>`.
- Label: `gh issue edit <number> --add-label <label>` or `--remove-label <label>`.
  Use the role mapping in `triage-labels.md`.
- Close: post the explanation with `gh issue comment`, then
  `gh issue close <number>`.

## Parent issues and dependencies

- Create a child with `gh issue create --parent <parent> ...`, or attach an
  existing child with `gh issue edit <parent> --add-sub-issue <child>`.
- Record blockers with `gh issue create --blocked-by <numbers> ...`, or
  `gh issue edit <child> --add-blocked-by <blocker>`.
- Count open blockers with
  `gh api repos/JonDManningDev/the-crowded-table-app/issues/<number> --jq .issue_dependencies_summary.blocked_by`.
  A ticket is startable when its open-blocker count is zero.

## Pull requests as a triage surface

**PRs as a request surface: no.**

GitHub shares a number space across issues and pull requests. Resolve an
ambiguous number with `gh pr view <number>` and `gh issue view <number>`.

## Wayfinding operations

- The map is one issue labelled `wayfinder:map`, with Notes, Decisions-so-far
  and Fog sections. Its tickets are child issues labelled
  `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling` or
  `wayfinder:task`.
- The frontier is the map's open, unassigned children with zero open blockers,
  in map order.
- Claim with `gh issue edit <number> --add-assignee @me` before starting work.
- Resolve by posting the answer, closing the ticket and adding a gist of the
  result and its link to the map's Decisions-so-far section.
