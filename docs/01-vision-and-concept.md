# Vision and concept

Status: current product baseline, updated 2026-10-15 for global and curated community profiles, following the 2026-10-12 event/table and commercial deferral decisions and the 2026-10-03 multi-community direction. Global-profile self-management and preference persistence are implemented; profile-bearing joins and wider audiences remain planned. The original handoff describes the initial Tegucigalpa community, not the entire platform. Legacy pricing/membership ideas are future proposals.

## Core idea

**The Crowded Table is an app where users create, manage, and participate in their own gaming communities. A user can belong to multiple communities.**

The owner of a community is independent of the owner/operator of `thecrowdedtable.app`. The Crowded Table in Tegucigalpa is the initial sample community; its name, subtitle, location, motto, events, and membership model are community context, not platform-wide defaults. Account identity and the user's general profile are global; independently curated community profiles, community participation, and staff authority retain their own scope. Paid access has no role in current feature behavior.

Community-agnostic matchmaking and event hosting are planned directions. A person must be able to maintain a global introduction without joining a community. Their resource, discovery, and interaction policies remain to be designed; this direction does not automatically broaden existing community events or DMs.

People may own games and have a small regular group yet struggle to find new players. The app helps them fill empty seats, meet people outside their usual circle, participate in recurring events, and enter a monthly championship.

For the initial Tegucigalpa community, build the community first; give it a physical home later. Member games can happen at homes, cafés, or other agreed locations. A permanent café is a long-term aspiration, not a launch dependency.

The promise: **Never wonder who you're going to play with next.** Friendships that continue outside the app are a success. Retention comes from new players, tables, events, and shared experiences.

## Brand and experience

**The Crowded Table — Games • People • Belonging**

Supporting language includes “Different games. Same table.”, “Good games bring good people together.”, “Play. Meet. Belong.”, and “You already have the games. We'll help you find the people.”

The tone is warm, cozy, intimate, human, welcoming, and slightly editorial. Use warm cream, forest green, sage, muted peach/rust/terracotta, natural wood, botanical line drawings, board-game imagery, soft rounded cards, serif headlines, clean sans-serif text, and generous whitespace. It should feel like a beautiful community club. Avoid neon/esports styling, corporate SaaS styling, and childish presentation.

Exact colors, fonts, imagery, and component treatments still need a visual design pass. Mobile is the primary design context, with accessible desktop use supported.

## Audience and commercial model

| Audience | Current target experience |
| --- | --- |
| Visitor | Browse permitted public community/event content |
| Approved community account | Participate under community standing, event/table registration, and privacy rules; no paid-member distinction |
| Booking account / guest sponsor | Register themselves and/or guests, including unnamed guests without sponsor attendance |
| Table manager / community staff | Manage resources only within explicit table/community permissions |

Payments and paid memberships will be among the last features implemented. Until then, app functionality acts as though they do not exist: no pricing/checkout/payment simulation, manual verification, member benefits, entitlement gating, or membership-status screens. Community accounts and their approval/standing remain essential and are separate from the deferred commercial concept.

The original Tegucigalpa price ideas (L300/month, L125 drop-in, illustrative L200 competition entry) remain historical future proposals only. They are not current configuration, access requirements, or launch blockers.

## App sections and desired functionality

The community navigation is **Community Home · Meet & Play · Championship · Discussion · Profile**. All five destinations are scoped to the community being browsed, including Profile. This renames the old Home and Community labels; the existing Discussion mock still includes its member directory, game recommendations, and Local Spots tabs.

The sidebar's upper area belongs to the browsed community, in order: name, subtitle, location, navigation links, motto. The lower area belongs to the logged-in user's global account and includes **My Communities** and **My Home**. A mock community profile must not masquerade as that account. Keep personal navigation reachable on mobile alongside community navigation.

Access follows public/community/resource audiences. Meet & Play and Discussion have no paid membership paywall; approved standing and private-data authorization remain necessary.

### My Home and My Communities

**My Home** is the new application landing page and the destination after successful sign-in, signup confirmation, and completed password recovery. It is a personal feed across communities/events related to the user: recent community announcements and discussion posts, events they have RSVP'd to, and potential event suggestions based on matching interests/tags and play history. Every section must respect the user's access to each source community; aggregation does not grant new access or expose private addresses.

Start with a basic page and clearly marked placeholders, then connect sections as their prerequisite features are completed. Suggestions do not imply an AI recommendation engine or a finalized ranking formula. **My Communities** will list the communities the user belongs to and manages; begin with a stub. The existing owner-only list remains available separately and does not represent all community associations.

### Community Home and official events

Community Home's main job is to show what the selected community itself is hosting. Show the brand/location header, warm hero, community joining/standing information or a personalized welcome, about three upcoming official events, and a small seasonal highlight.

Do not list member-created tables in Community Home's official-event feed. This restriction does not prohibit a user's authorized RSVPs from appearing on My Home. A member welcome area may link to My Tables, but should not become a private-table feed. Do not add duplicate Championship shortcuts, an About Us button, or a redundant Our Game Nights top shortcut.

A dedicated official-events page is reached within the Community Home area, not added as a sixth bottom tab. Include list/calendar views, month selection, detail, capacity, queued registration, account-holder/guest participation, and distinct event styling.

Proposed weekly rhythm: Tuesday **Learn & Play** (“Never played it? Perfect. We'll teach you.”) and Thursday **Special Game Night**, typically 7:30–10:30 PM. The founder's home has an approximate maximum of 10 people; each event needs an explicit capacity and staffing interpretation. Examples include Azul teaching nights, RPG one-shots, social games, mystery/deduction, cooperative games, and seasonal themes.

Public home-event location: **The Crowded Table · Tegucigalpa**. Reveal the actual address only to confirmed participants and authorized hosts/admins. Larger rented-space events can accommodate more people with their own capacity; ticketing is deferred. Example dates and guest counts in the handoff are illustrative, not published bookings.

### Meet & Play

Meet & Play has three prominent actions: **Find a Table**, **Create a Table**, and **Meet Someone New**.

Table details: game/activity title, host photo/profile, date and start/end time, seats and availability, description, category, experience level, beginner-friendly flag, and appropriate location information.

Categories may include Board Game, RPG, TCG, Social / Party, Classic Games, and Other. Experience choices include First timers welcome, Any experience, and Experienced players.

Tables default to automatic confirmation (`manually_confirm_seats = false`): eligible non-withdrawn whole groups confirm in receipt order when they fit. With manual confirmation enabled, authorized table managers approve, reject, or notify the booking account of an issue at their discretion. Approval directly confirms the group. Rejection removes it from the active queue and promptly notifies the booker with timestamp, rejecting user, and optional reason. No second acceptance, response window, or expiration applies. Automatic queues skip non-fitting groups without changing their priority; voluntary group additions reset priority, while name corrections/removals preserve it.

Public locations may be shown. For private locations, show **Private location · Tegucigalpa** until a seat is confirmed. A pending request or waitlist position does not reveal the address.

Provide My Tables, upcoming participation, cancellation, and host controls. Events and tables each have their own chat for authorized registrants/participants, organizers/hosts, and staff oversight; event chat requires no table seat. Cancellation makes affected chats read-only, with indefinite resource-specific history for authorized archived viewers. Active/completed gathering chat lifecycle remains to design. Community DMs are also MVP, with approved accounts in the same community at both endpoints. Inactive/pending/suspended/removed accounts cannot exchange new DMs; inactive/suspended/removed accounts retain their history read-only, including within archived communities. Initial DMs include receive controls, main-account blocking, and reports with individually selected messages and omitted-message metadata. Plain text is initial; group DMs are a known later requirement. General conversation/participant tables are accepted, with one-to-one behavior enforced initially by the UI and server API rather than database participant-count constraints. Ordinary DM history has no automatic expiry, supported by usage monitoring and budget thresholds; shared receipts/typing remain deferred. Reports and their related evidence are retained permanently. Messaging has a 5,000-character limit, 30 sends/minute per main account across communities/chat types, and 10 new DM recipients/hour. DMs reuse one continuing thread per identity pair within each community, with coalesced in-app alerts and private conversation-specific mute controls that retain unread history without notifying for muted messages.

Meet Someone New collects availability, interests, game preferences, and experience. Manual/admin-assisted matching is the initial approach; confirm its inclusion in the launch checklist. Automated matching is later. Success means people play with people they have not met before.

### Championship

A major MVP pillar: a different featured board game each month, qualifying play throughout the month at agreed locations, and **The Final Table** at the official home/base.

Include featured game, dates, rules, registration, leaderboard, past champions, and Final Table date/time/finalists/prize/results. Payment/member conditions are deferred; competition eligibility and participation/result routes remain separate from table participation. The championship structure itself awaits its separate review.

Submit results with participants, scores/placements, winner, date, and optional notes. Another participant confirms or disputes. Only confirmed results affect standings. Admins can correct, void, and resolve disputes.

Scoring varies by game. The design must support versioned rules and eventual configuration for placement/participation points, match limits, raw-score tiebreaks, win percentage, counting-result limits, and finalist count. Settle a simple first ruleset before implementation. Final winners receive permanent achievements, with a history of past champions.

### Discussion

A community-restricted board without paid membership gates: minimal discussions and a member directory in MVP. Suggested topics include General, Game recommendations, Meetups & players, Event discussions, Rules & tips, and Off-topic.

Directory/profile information can include first name plus last initial, general location, interests, experience, play style, and willingness to teach. Recommendations can begin as discussion topics. Local Spots is later.

No follower counts, public popularity rankings, or star ratings of people. Admins must be able to moderate shared content and suspend users within their permissions. Chat messages use reversible hiding: every authorized viewer may hide/unhide messages personally; only community-public event/table chats permit staff hiding for everyone under the matching community/official management flag. Private event/table chats use personal controls only while retaining existing read-only staff oversight. Authorized staff can inspect hidden community-public gathering-chat messages without unhiding them; private chats have no moderator inspection action. DMs have no staff shared-visibility override; retained bodies and report evidence are preserved. DM reporting and blocking are required initially. Report submitters retain access to their own reports; staff with `can_handle_reports` can view, manually acknowledge, and close same-community reports with required resolution notes. Reports and related evidence are retained permanently. Personal DM blocks apply across all shared communities; staff discipline stays within its issuing community and follows the main account on rejoin. Reporting/blocking interactions with other shared spaces remain to scope; the fuller trust toolkit is still eventual.

### Profile

The community navigation's Profile remains the user's presentation within the browsed community. Add a global user-account profile as a separate personal capability. Both initially contain `display_name` and optional `bio`; users may curate different introductions for different communities.

When joining a community, pre-fill the community profile's name and bio from the user's existing global profile, allow edits, and submit the community profile with the join request. Account/profile creation succeeds or fails together. The saved community profile is independent: future global edits do not overwrite it, and community edits do not change the global profile. Apply this flow to optional participation during community creation as well. Global-profile editing is available on My Account → Overview; remaining onboarding policy is Q-016.

Three independent self-controlled flags govern presentation and discovery: `community_accounts.show_global_profile` defaults false and lets other users in that community see the global profile through the authorized community audience; `user_accounts.user_is_discoverable` defaults true and controls standard global account search; `user_accounts.enable_matchmaking` defaults true and enables global, non-community matchmaking. A user may share their global profile through a community while remaining absent from global searches, or participate in global matchmaking without being searchable. These are separate from permission to contact someone.

Use account-level blocking and private labels instead of a public identification code. Labels belong only to the person who created them and follow the underlying account across community/profile changes; they can exist without a block and do not reveal hidden profiles or affiliations. Personal DM blocks continue across communities regardless of labels or preference changes. A block in either direction also prevents the two users appearing in each other's global searches or global matches, and prevents direct invitations in both directions. It does not exclude them from unrelated users' searches/matches.

Both users may still join communities or manually join otherwise accessible events/tables through other permitted means. Under D-118, neither may join a private event or table hosted by the other while a block exists in either direction. Confirming a block automatically removes existing counterpart participation/requests and rejects related pending invitations for those private resources, in both host directions, only when they have not yet started (D-119). The D-117/D-118 confirmation explicitly lists which target-hosted private gatherings the caller will leave and which caller-hosted private gatherings will lose the target's participation, including related invitations and linked-seat effects. These private consequences are mandatory; manual per-item actions are offered only for not-yet-started non-private resources, subject to normal authority, without leaving the interface. Optional choices start unselected; dismissing the prompt changes nothing. Unblocking does not restore cancelled participation or rejected invitations. Ordinary community approval, resource audiences, capacity, and admission rules continue to apply. A block involving another attendee is not a general joining veto or a reason for automatic removal from a third-party private gathering. Guests do not inherit their booking account's blocks: they may participate independently, including through guest-only bookings, under ordinary eligibility. Removing an account holder's participation preserves their guests. In-progress events/tables and their existing participation, invitations, and authorized access are unaffected by the block action; recheck start times at confirmation. Existing-match and other residual lifecycle questions remain Q-010. The three flags' names/defaults/scopes and private-label approach remain settled, with remaining audience/label UX details under Q-016.

Future profile views may include photo, general location, interests, experience, play style, teaching/beginner-friendly tags, and authorized activity/history. Community join/standing information remains community-specific. Provide My Events, My Tables, settings, privacy, notifications, and support with explicit account/community scope. Only name and bio are in the initial two-profile plan; extended fields and their scope remain later work.

Possible statistics: attended events, tables hosted, games played, distinct people played with, championship entries, finals, and wins. These depend on verified activity, not merely bookings. **Played with 18 different Crowded Table members** is more aligned with the brand than a follower count.

### Admin

Create/edit official events; approve/suspend community accounts; manage championships and disputes; remove bad content; inspect users/tables within authorized scope. Administrative access is accountable and permission-based.

## MVP scope and later work

The MVP target includes auth/account creation, community standing, Community Home, events, per-person group reservations, automatic/manual table confirmation, capacity/queues, location privacy, event/table chat and community-scoped DMs with report/block controls, championship functionality pending separate review, minimal Discussion, Profile, and authorized management. Payments, paid memberships, and their simulations/gates are absent until their late implementation stage.

Championship and Discussion remain part of the product plan. The user's explicit commercial deferral removes payment/membership dependencies from earlier work; it is not merely deferral of a payment-provider integration.

Explicitly outside MVP: game catalog/library or inventory, café menu/food ordering/POS/retail, employee scheduling, commercial venue management, public social network, followers, user ratings, AI recommendations, native mobile apps, complicated Discord integration, cross-community DMs, physical membership cards, and QR passes.

## Business validation

Current validation asks whether communities reliably help people find others to play with. Willingness to pay and the original L300/month hypothesis belong to the later commercial stage.

Watch whether community participants create tables independently, fill seats, meet new people, and return for events. Subscription/conversion experiments wait for commercial features.

North-star candidate: **distinct people actually playing together**, grounded in attendance. Future analytics include active paying members, revenue/churn/retention, attendance, conversion, table creation/fill, waitlist demand, no-shows, repeat play, and competition engagement. Commercial metrics are deferred until that work is implemented.

## Remaining product decisions

The platform/community boundary, personal navigation, group/queue/confirmation rules, split management permissions, and cancellation/archive rules are settled. Parent lifecycle transitions cascade to attached tables while preserving per-person rows and already-archived children. Historical users/guest bookers retain scoped archived gathering/chat reads indefinitely; cancellation ends sends and participant-based address access while preserving existing authorized organizer location access. Cancellation notifications are settled. Event chat, table chat, and same-community DMs with report/block controls are MVP. DM standing, recipient controls, historical reads for suspended/removed users, selected report evidence, report-handler/submitter access, permanent report retention and manual handling, plain-text scope, and general participant tables with initial one-to-one UI/API behavior are settled. Message limits, DM in-app notification/mute behavior, continuing-thread identity per participant pair/community, and ordinary DM history without automatic expiry supported by usage monitoring/budget thresholds are settled. Personal message hiding and community-public event/table staff moderation/inspection are also settled; private chats retain only personal controls and existing read-only oversight. Community-account deactivation/reactivation preserves standing; it cancels not-yet-started hosted gatherings, withdraws personal upcoming bookings elsewhere, and preserves guest bookings. Non-owner staff pause and need manual resumption, and every active non-owner staff assignment requires an active community account; owner management remains active and exempt. Removed-account reinstatement requires can_approve_users and never automatically resumes staff. Community archival cancels all not-yet-started gatherings and preserves scoped authenticated history; restoration does not reopen them. Settings authority and the public-creation pause are settled. Disciplinary removal revokes active/paused staff, withdraws upcoming personal bookings, preserves unselected guests, and automatically cancels only unofficial not-yet-started hosted gatherings. Official gatherings remain with community management. Attached tables derive their official/unofficial classification from the event; standalone tables retain their own, resolving mixed sponsorship without changing audience rules. Revoked-staff reappointment initially requires owner review; trusted non-owner delegation is a future refinement. The staff-grant rename and separate removal/revocation permissions are planned. Remaining trust implementation boundaries and group questions are under Q-010/Q-015; global account deactivation/closure is deferred. Other remaining choices include personal-feed ranking, complete My Communities workflows, external notification channels, host seat counting, championship rules, active/completed gathering chat lifecycle, moderation, language(s), and age policy. Commercial questions remain deferred. See the [decision register](08-decisions-and-open-questions.md).
