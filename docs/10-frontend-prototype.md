# Frontend prototype guide

Status: interactive frontend exploration, not a production implementation.

## Coverage

| Reference | Implemented counterparts |
| --- | --- |
| Official events infographic | Home/official list, category filters, month calendar, detail dialog, member reservation, guest simulated checkout, full-event waitlist |
| Meet & Play infographic | Table browser, search/category/location/beginner filters, details, creation form, My Tables, host request approval, seat requests, waitlists, confirmed-player chat |
| Championship infographic | Overview/detail, how it works/rules, registration, leaderboard, past champions, Final Table and provisional qualifiers; result submission/confirmation/dispute added from the docs |
| Community infographic | Topic board, discussion/replies, searchable member directory, member details, recommendations/save list, illustrative Local Spots map/cards |
| Profile infographic | Overview, editing/interests/play style, activity/history/achievements, membership/settings, member-facing preview |

Desktop uses a left navigation rail and wider multi-column layouts. At small widths it becomes the five-tab bottom navigation with stacked content. Dialogs are keyboard accessible, support Escape, and restore focus. Layouts include empty states, selected filters, pending requests, and payment simulation explanations.

## Useful walkthroughs

1. **Home:** open Azul, take a seat, observe confirmation and the fictional address, then cancel. Switch to Calendar and select an event. Wingspan starts full to demonstrate a waitlist.
2. **Meet & Play:** take a seat at Codenames & coffee, then send a chat message. Request a Cascadia seat; pending requests do not unlock an address or chat. Commander starts full.
3. **Hosting:** open Sunday birds & brunch and accept or decline David's seeded request. Create a table with a fictional address; it appears under My Tables, and the address stays out of listing cards.
4. **Matching:** use Find my people and save preferences; reopen to revise them.
5. **Championship:** register, open My Matches, and confirm or dispute the seeded result from Lucía. Confirmation updates both players' standings. Submit your own result; you cannot confirm it yourself.
6. **Community:** create a conversation, reply to it, search members, save a game recommendation, and explore the illustrative places.
7. **Profile:** edit name/bio/interests and see the shell update. Upcoming activity reflects reservations and hosted tables. Toggle/save preferences and preview the member-facing profile.
8. **Guest:** use the header switch. Meet & Play and Community become paywalls. Official events and Championship remain accessible with simulated paid entry. Payments do not unlock membership; use the separate membership preview action.

Changes survive page navigation in the current browser session. A full refresh resets everything. No data is written to local storage or sent to a backend.

## Reconciled design choices

- Use the settled five navigation destinations, rather than the inconsistent Events/Community/Profile combinations in the generated images. Official events live within Home.
- No member tables on the Home feed. The list currently includes all five example official events so the full event range can be reviewed.
- Use L300 membership, L125 eligible drop-in, and illustrative L200 championship entry from the handoff, rather than conflicting infographic prices. Special-event L250 is sample data only.
- October 2026 dates match their actual weekdays; the Codenames example uses Friday October 9. Qualifying closes October 24 before the October 25 final.
- Private addresses appear only after confirmed seats or to the host. All built-in addresses are explicitly fictional. No real personal addresses should be entered in the preview.
- Rename “Public Profile” to “member-facing profile.” No general DMs, friend/follower counts, public person ratings, or popularity rankings.
- Local Spots is included as an exploratory infographic view, although it remains later product scope. Its map is schematic and venues/details are sample content, not verified directions.
- Use original local vector illustrations and initials instead of reproducing distorted generated logos/photos. Colors, serif headings, botanical details, and warm visual tone follow the references.

## Deliberate simulation limits

Membership switching is a UI preview, not authentication or secure authorization. All fixtures are shipped to the browser. Real RLS/address security belongs in the later backend implementation.

Seats count the host in this prototype. Waitlists support join/cancel but not timed offers or automatic promotion. Host approval uses a seeded incoming request; sending your own request to another host remains pending because there is no second live user.

Payment is a clearly labeled simulation. Championship currently models two-player matches with illustrative 5/3-point scoring; ties go to review. Initial rankings/history/achievements are seeded; confirmed demo matches increment standings, but this is not a full championship engine. Finalists remain provisional.

Chat has in-memory messages and an illustrative 48-hour lifecycle label, with no actual clock-based archival or Realtime. Notifications are a simple in-memory inbox. Settings and support notes are local preview interactions; they trigger no external delivery. Photos, production sign-in, admin dashboards, backend moderation, PWA installation/offline, and payment-provider integration are not implemented by this mockup pass.

## Validation

Production bundling, TypeScript, and ESLint are checked using the installed local tools. Browser checks cover reservation/cancellation privacy, requests/waitlists, chat, table creation, championship confirmation and standings, community posts, profile edits, guest paywalls, and responsive overflow. See the implementation handoff for any environment-specific limitations.
