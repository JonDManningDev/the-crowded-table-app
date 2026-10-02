# Vision and concept

Status: revised product baseline from the user-supplied handoff of **Find Boardgame Cafe Ideas**. Proposed prices and eventual features remain labeled.

## Core idea

**The Crowded Table is a private board-gaming community and matchmaking app for people in Tegucigalpa who want more people to play with.**

People may own games and have a small regular group yet struggle to find new players. The app helps them fill empty seats, meet people outside their usual circle, participate in recurring events, and enter a monthly championship.

Build the community first; give it a physical home later. Member games can happen at homes, cafés, or other agreed locations. A permanent café is a long-term aspiration, not a launch dependency.

The promise: **Never wonder who you're going to play with next.** Friendships that continue outside the app are a success. Retention comes from new players, tables, events, and shared experiences.

## Brand and experience

**The Crowded Table — Games • People • Belonging**

Supporting language includes “Different games. Same table.”, “Good games bring good people together.”, “Play. Meet. Belong.”, and “You already have the games. We'll help you find the people.”

The tone is warm, cozy, intimate, human, welcoming, and slightly editorial. Use warm cream, forest green, sage, muted peach/rust/terracotta, natural wood, botanical line drawings, board-game imagery, soft rounded cards, serif headlines, clean sans-serif text, and generous whitespace. It should feel like a beautiful community club. Avoid neon/esports styling, corporate SaaS styling, and childish presentation.

Exact colors, fonts, imagery, and component treatments still need a visual design pass. Mobile is the primary design context, with accessible desktop use supported.

## Audience and commercial model

| Audience | Experience |
| --- | --- |
| Visitor / nonmember | Discover official events and membership benefits; use a free account to reserve eligible paid events or enter a championship |
| Paid member | Access Meet & Play, private Community, included official game nights subject to capacity, and monthly championship participation |
| Member host | Create a table, welcome new players, manage requests, and coordinate confirmed participants |
| Founder / admin | Host official events, manage membership and competitions, moderate content, and support participants |

Current pricing ideas: **L300/month** membership, **L125** drop-in for eligible official events, and an illustrative **L200** championship entry for nonmembers. These are proposed prices, not final billing rules. Larger special events can have separate tickets, with possible member discounts or early access.

A drop-in or tournament fee does not unlock the private member network. Manual payment handling and manual membership activation are acceptable initially; payment integration must not block the first launch.

## App sections and desired functionality

The settled bottom navigation is **Home · Meet & Play · Championship · Community · Profile**. Nonmembers can access Home, Championship, and Profile; Meet & Play and Community show membership paywalls without leaking private previews.

### Home and official events

Home's main job is to show what The Crowded Table itself is hosting. Show the brand/location header, warm hero, membership CTA for nonmembers or welcome/member status for members, about three upcoming official events, and a small seasonal highlight.

Do not list member-created tables on Home. A member welcome area may link to My Tables, but should not become a private-table feed. Do not add duplicate Championship shortcuts, an About Us button, or a redundant Our Game Nights top shortcut.

A dedicated official-events page is reached within the Home area, not added as a sixth bottom tab. Include list/calendar views, month selection, detail, capacity, waitlist, member/guest admission, and distinct special-event styling.

Proposed weekly rhythm: Tuesday **Learn & Play** (“Never played it? Perfect. We'll teach you.”) and Thursday **Special Game Night**, typically 7:30–10:30 PM. The founder's home has an approximate maximum of 10 people; each event needs an explicit capacity and staffing interpretation. Examples include Azul teaching nights, RPG one-shots, social games, mystery/deduction, cooperative games, and seasonal themes.

Public home-event location: **The Crowded Table · Tegucigalpa**. Reveal the actual address only to confirmed participants and authorized hosts/admins. Larger rented-space events can accommodate more people and be separately ticketed. Example dates and guest counts in the handoff are illustrative, not published bookings.

### Meet & Play

The centerpiece of membership has three prominent actions: **Find a Table**, **Create a Table**, and **Meet Someone New**.

Table details: game/activity title, host photo/profile, date and start/end time, seats and availability, description, category, experience level, beginner-friendly flag, and appropriate location information.

Categories may include Board Game, RPG, TCG, Social / Party, Classic Games, and Other. Experience choices include First timers welcome, Any experience, and Experienced players.

Hosts choose **Take a Seat** for instant joining or **Request a Seat** for approval. Hosts accept or decline requests. Full tables say **This Table Is Crowded ❤️**, with **Join Waitlist**. Start with FIFO waitlists; notification, claim windows, and approval interaction need explicit operating rules.

Public locations may be shown. For private locations, show **Private location · Tegucigalpa** until a seat is confirmed. A request, waitlist position, or payment awaiting verification does not reveal the address.

Provide My Tables, upcoming participation, cancellation, and host controls. Each table has a private temporary group chat for its confirmed players and host to coordinate rules, timing, and what to bring. Chat eventually becomes read-only/archived; the exact period is open. Broad direct messaging is outside MVP.

Meet Someone New collects availability, interests, game preferences, and experience. Manual/admin-assisted matching is the initial approach; confirm its inclusion in the launch checklist. Automated matching is later. Success means people play with people they have not met before.

### Championship

A major MVP pillar: a different featured board game each month, qualifying play throughout the month at agreed locations, and **The Final Table** at the official home/base.

Include featured game, dates, rules, registration, leaderboard, past champions, and Final Table date/time/finalists/prize/results. Membership includes entry; nonmembers can buy competition-only access. They need a championship-specific participation/result route without opening Meet & Play.

Submit results with participants, scores/placements, winner, date, and optional notes. Another participant confirms or disputes. Only confirmed results affect standings. Admins can correct, void, and resolve disputes.

Scoring varies by game. The design must support versioned rules and eventual configuration for placement/participation points, match limits, raw-score tiebreaks, win percentage, counting-result limits, and finalist count. Settle a simple first ruleset before implementation. Final winners receive permanent achievements, with a history of past champions.

### Community

A private member club board: minimal discussions and a member directory in MVP. Suggested topics include General, Game recommendations, Meetups & players, Event discussions, Rules & tips, and Off-topic.

Directory/profile information can include first name plus last initial, general location, interests, experience, play style, and willingness to teach. Recommendations can begin as discussion topics. Local Spots is later.

No follower counts, public popularity rankings, or star ratings of people. Admins must be able to remove content and suspend users. Reporting/blocking and their detailed interactions should be scoped before launch; the handoff treats the fuller trust toolkit as eventual.

### Profile

Basic identity, photo, general location, short bio, interests, experience, play style, teaching/beginner-friendly tags, member-since information, and membership status. Provide My Events, My Tables, activity/history, settings, privacy, notifications, and support.

Possible statistics: attended events, tables hosted, games played, distinct people played with, championship entries, finals, and wins. These depend on verified activity, not merely bookings. **Played with 18 different Crowded Table members** is more aligned with the brand than a follower count.

### Admin

Create/edit official events; approve/suspend community accounts; manually manage membership; manage championships and disputes; remove bad content; inspect users/tables within authorized scope. Administrative access is accountable and separate from payment status.

## MVP scope and later work

MVP includes auth/account creation, member/nonmember states, Home, official events and drop-in reservation, capacity/waitlists, entitlement gating, member tables with both join modes, location privacy, temporary table chat, current championship/results/leaderboard/final information, minimal Community, Profile, and admin workflows.

A staged implementation does not remove Championship or Community from the MVP. Manual payments and simple operational processes are acceptable, but their confirmation rules still need to be defined.

Explicitly outside MVP: game catalog/library or inventory, café menu/food ordering/POS/retail, employee scheduling, commercial venue management, public social network, followers, user ratings, AI recommendations, native mobile apps, complicated Discord integration, broad DMs, physical membership cards, and QR passes.

## Business validation

Central hypothesis: will Tegucigalpa gamers pay around L300/month for reliable access to a private network that helps them find new people to play with?

Watch whether members create tables independently, fill seats, meet new people, convert from drop-ins, remain subscribed after forming friendships, and return for championships. A ten-person home base should seed distributed play across the city.

North-star candidate: **distinct people actually playing together**, grounded in attendance. Future analytics include active paying members, revenue/churn/retention, attendance, conversion, table creation/fill, waitlist demand, no-shows, repeat play, and competition engagement. Manual grants are not proof of paid revenue.

## Remaining product decisions

Tenant meaning beyond the initial community; final prices and collection process; membership expiry/grace behavior; waitlist claim/approval rules; host seat counting; first championship ruleset; chat retention; moderation/blocking scope; language(s) and age policy. These are tracked in the [decision register](08-decisions-and-open-questions.md).
