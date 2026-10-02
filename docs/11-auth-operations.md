# Supabase Auth and email operations

Recorded: 2026-10-02. This is the operational record of the Auth configuration discussion and the checklist for revisiting settings as the app develops. These are project-wide settings, shared across tenants.

## Status and environment

The user selected the existing Supabase project `fsnipgsrlclbnfepcbvz` for initial testing from `http://localhost:5173`. Email/password and mandatory email verification are established decisions; authenticated new signups return home. Email templates are English initially.

The earlier CLI check confirmed the initial migrations and declared hosted Auth settings: localhost Site URL, exact redirects `/auth/callback` and `/auth/reset-password`, 12-character minimum password, required confirmation, and secure password changes. See the [implementation status](../supabase/README.md#selected-hosted-testing-environment).

The recommendations below were discussed against dashboard screenshots. Recording them does **not** confirm that subsequent dashboard changes were saved. The frontend verification results are recorded below; SMTP credentials were not inspected. Saved dashboard recommendations not covered by those checks still require verification. Do not treat this document as a live configuration export.

## URL configuration

Frontend update, 2026-10-02: the account shell now implements signup, sign-in/out, resend, both callback routes, and password recovery using the Supabase JavaScript client. The hosted public settings endpoint confirmed email signup enabled, confirmation required, and anonymous sign-ins disabled. The user reports Resend/SMTP configured and confirmed receipt of a signup email, successful email verification, and password sign-in returning home. That test exposed a callback timing defect, now fixed. The user then confirmed recovery email delivery, the password-change form, successful submission, and return home; they reported the recovery test worked as expected. A fresh hosted signup remains the outstanding manual retest for the corrected automatic-confirmation redirect. Current CLI project-key access returned HTTP 403 despite earlier successful project linking; public browser configuration was supplied separately. No SMTP secret was retrieved or stored in the frontend.

Public DNS checks found TXT at `resend._domainkey.auth.thecrowdedtable.app` and both TXT/MX at `send.auth.thecrowdedtable.app`. Record presence alone does not establish Resend's verified status or SMTP delivery success. Eleven mocked-client component tests cover signup/cooldown, delivery errors, successful/failed sign-in, recovery redirect and password matching, unauthenticated recovery, expired/missing callback handling, successful confirmation cleanup, and session restoration/sign-out. Browser inspection confirmed the expired-link screen. Two additional real-SDK tests reproduce callback token consumption before React mounts for both signup and recovery, including Strict Mode. The fix captures non-secret routing metadata before client initialization and checks initialization errors before trusting a session. All 13 tests pass; the user-assisted hosted recovery test also passed.

The 2026-10-02 dashboard screenshot matches the earlier CLI verification and `supabase/config.toml`:

| Setting | Current value | Purpose |
| --- | --- | --- |
| Site URL | `http://localhost:5173` | Default Auth redirect destination when no accepted explicit redirect is supplied; also exposed as `{{ .SiteURL }}` in templates |
| Redirect allowlist | `http://localhost:5173/auth/callback` | Intended signup confirmation callback; complete authentication, then navigate home |
| Redirect allowlist | `http://localhost:5173/auth/reset-password` | Intended password-recovery destination; show the password reset flow |

Keep these exact values for current localhost testing. Site URL is the frontend origin, not the Supabase API URL or Resend sending domain. Route handlers are now implemented; allowlist configuration alone does not prove successful email delivery or end-to-end authentication.

The signup implementation should explicitly supply the callback URL as `options.emailRedirectTo`; password recovery should explicitly supply the recovery URL as `redirectTo`. Keep verification links functional in the email templates. The callback must handle success and invalid/expired links, and recovery must not immediately redirect home before the password is changed. The current prototype's hash navigation does not replace these Auth route handlers.

Use the configured host and port consistently: `127.0.0.1`, a different port, or another callback path needs its own deliberately allowed URL. When opening localhost email links, use the computer running the frontend; localhost on a phone points to the phone. Choose a reachable, explicitly allowed development URL before testing cross-device/PWA flows.

Before deployment, select the canonical HTTPS frontend origin. If the app is deployed at the purchased root domain, the intended values would be `https://thecrowdedtable.app`, `https://thecrowdedtable.app/auth/callback`, and `https://thecrowdedtable.app/auth/reset-password`; these are conditional deployment examples, not currently deployed URLs. Update the hosted Site URL, exact allowlist, frontend redirect configuration, and hosting route fallback together. Review local/preview entries and remove those no longer needed; keep production redirects exact rather than broad wildcards. Review environment-specific configuration before CLI pushes so local values cannot accidentally overwrite production URLs.

Revisit this section when deploying, changing domains/ports/routing, introducing preview or separate test environments, or adding OAuth/OIDC. OAuth provider-side callbacks are a separate configuration from these frontend destinations. Test signup-to-home and recovery-to-password-change on each target environment after changes.

## Community creation integration

Implemented 2026-10-02: verified users can select **Start New Community** from the account bar. The form collects name, immutable handle, required country, optional state/province/city, and time zone (initially the device's zone, explicitly editable). The optional participant checkbox starts unchecked and explains that management access is independent of participation.

One `create_tenant` RPC atomically creates the tenant, default settings, owner assignment with all permissions, and optional approved participation. Other users still require approval by default. The client passes no actor, role, or permission fields. Database verification, constraints, and authorization remain authoritative. Duplicate submissions are blocked while pending; uncertain failures are not automatically retried. The owner-only **Your communities** list provides a way to inspect saved results before retrying.

Component tests cover both participation choices, input constraints, duplicate handles, verified-account errors, double submission, uncertain responses, and saved-list errors. No new migration is needed. Hosted creation with a real community remains a manual acceptance step: create a community, inspect the owner/participation result, refresh and reopen **Your communities**, and confirm the persisted details. The existing database tests cover atomic creation and owner/approval invariants; mocked frontend tests do not replace this hosted check. The list does not yet switch the mock community preview to real tenant data.

## Resend and sender identity

**Selected:** Resend for initial authentication-email delivery. The user purchased `thecrowdedtable.app` through Cloudflare Registrar. Amazon SES is a possible future replacement for learning or growth, not a committed migration.

Recommended setup:

| Item | Recommendation |
| --- | --- |
| Sending domain | Verify `auth.thecrowdedtable.app` in Resend; this subdomain remains a recommendation until confirmed |
| Sender | `The Crowded Table <accounts@auth.thecrowdedtable.app>` if that subdomain is verified |
| DNS | Add Resend's exact generated verification/sending records through Cloudflare integration or manually; do not invent DKIM/SPF values. Review DMARC as part of sender setup |
| Resend API key | Dedicated `crowded-table-supabase-auth` key, Sending access, restricted to the actual verified sender domain |
| SMTP | Host `smtp.resend.com`, port `465` (implicit TLS), username `resend`, password = Resend API key |
| Tracking | Disable open/click tracking for authentication emails |
| Secret storage | Save the key at creation in a password manager and hosted Supabase SMTP settings; never commit it or expose it in frontend variables, logs, or chat |

Use separate keys for future services/environments so rotation is independent. Resend transports Auth emails; Supabase owns the verification/recovery tokens and templates. A sending domain does not require moving the frontend off localhost and does not itself provide a mailbox for replies. Confirm a monitored support/reply destination before public launch.

On Resend Free, the documented transactional quota at review time is 100 emails/day and 3,000/month; inbound mail also counts. The daily reset is midnight UTC. Recheck actual plan limits before growth or launch. Supabase's hourly cap is separate and cannot guarantee staying within Resend's daily allowance.

## Signup and providers

| Setting | Initial recommendation | Revisit when |
| --- | --- | --- |
| Allow new users to sign up | ON | Intentionally closing registration or investigating abuse |
| Confirm email | ON; required product rule | Only through an explicit change to the identity policy |
| Email provider | Enabled | Adding further sign-in methods |
| Manual identity linking | OFF | Implementing OAuth/OIDC and account-linking UI/policies |
| Anonymous sign-ins | OFF | Designing an actual anonymous-account feature |
| Phone, Web3, other providers | Disabled | An approved feature requires them |

Manual identity linking concerns login identities, not `community_accounts` or staff assignments. Anonymous Auth accounts are unnecessary for public browsing. Signup may provision an unverified identity/account; it must not grant protected application access.

## Email templates and security notifications

Keep default English bodies for the first delivery test, then add product branding and clearer subjects while preserving functional placeholders. Confirmation/recovery links use `{{ .ConfirmationURL }}`; reauthentication uses `{{ .Token }}`. Do not replace a verification link with the homepage: verification precedes the callback's home redirect.

| Template or notification | Initial recommendation |
| --- | --- |
| Confirm signup, reset password | Use and test in this milestone |
| Change email address, reauthentication | Retain working templates for account-security flows |
| Invite user, magic link/OTP | Leave defaults; no corresponding initial app flow |
| Password changed, email address changed notifications | ON |
| Sign-in method linked/removed notifications | ON, ready for OAuth |
| Verification method added/removed notifications | ON, ready for MFA |
| Phone number changed notification | OFF while phone features are out of scope |

Templates do not implement frontend flows. Security alerts send only when enabled and their event occurs. Test applicable alerts, branding, link destinations, expired links, resends, and recovery before public signup. Revisit localization when adding a language, and invitation copy when implementing staff invitations.

## Sessions

| Setting | Initial recommendation | Revisit when |
| --- | --- | --- |
| Single session per user | OFF; permit phone and computer sessions | A concrete security policy requires restricting devices |
| Time-box sessions | 0 (no fixed lifetime) | Defining periodic reauthentication requirements |
| Inactivity timeout | 0 (no timeout) | Defining shared-device or staff-session requirements |
| Access token expiry | 3,600 seconds | A demonstrated revocation/security requirement warrants a shorter lifetime |
| Detect/revoke compromised refresh tokens | ON | Keep enabled; investigate refresh issues rather than casually disabling protection |
| Refresh token reuse interval | 10 seconds | Only with evidence that the default is unsuitable |

Single-session and lifetime controls require Pro or above at review time; no upgrade is required for this milestone. Access-token expiry is not an hourly interactive login: the client refreshes sessions. Inactivity measures time since refresh, not mouse/keyboard activity. Session restrictions are evaluated during refresh; do not promise immediate revocation of already-issued JWTs. Sensitive authorization must still validate current permissions.

## Rate limits and IP forwarding

| Dashboard setting | Initial recommendation | Scope |
| --- | --- | --- |
| Sending emails | 30/hour | Whole project, across users and tenants |
| Sending SMS | Leave 30/hour; unused | Whole project |
| Token refreshes | 150 requests/5 minutes | Per IP; the token endpoint also handles password and other token grants |
| Token verifications | 30 requests/5 minutes | Per IP |
| Anonymous users | Leave 30/hour; feature disabled | Per IP |
| Sign-ups and sign-ins | 30 requests/5 minutes | Per IP |
| Web3 sign-ups and sign-ins | Leave 30 requests/5 minutes; unused | Per IP |
| IP address forwarding | OFF | Direct browser-to-Supabase requests need no forwarding |

These are starting limits, not capacity promises. Supabase uses token buckets for IP-based limits and returns HTTP 429 on throttling. Separate default cooldowns apply to repeated signup confirmation/password-reset requests for a user (60 seconds). The app should handle throttling and offer sensible resend feedback rather than tight retry loops.

Revisit limits when legitimate tests/users hit throttling, onboarding volume rises, or abuse appears. Shared networks share IP limits. Coordinate email-limit increases with Resend quotas and delivery monitoring. Revisit IP forwarding only when introducing a trusted server/proxy for Auth requests; use Supabase's supported secret-key/header mechanism and trusted source-IP validation, never a browser-supplied secret.

## Attack protection

The reviewed dashboard showed CAPTCHA off and leaked-password protection disabled. Recommendations, not verified configuration changes:

| Setting | Initial recommendation | Revisit when |
| --- | --- | --- |
| CAPTCHA protection | OFF during initial manual localhost tests; implement and enable before public signup | Building real Auth forms or seeing abuse of the hosted endpoint |
| Prevent use of leaked passwords | Enable when on Pro or above; unavailable on the current Free plan | Upgrading the project or reviewing public-launch security |

Prefer Cloudflare Turnstile for the CAPTCHA integration, given the existing Cloudflare account. Supabase supports Turnstile and hCaptcha. Configure the provider secret in Supabase, use the public site key in the frontend, and submit `captchaToken` with signup, sign-in, and password-reset requests. Implement token expiry/reset/retry behavior and test valid, missing, and invalid tokens before switching protection on; enabling it first would break unintegrated forms. Configure allowed hostnames and separate development/testing credentials appropriately. A localhost frontend still calls a publicly reachable hosted Auth endpoint, so CAPTCHA deferral is temporary, not network isolation.

Leaked-password protection uses Have I Been Pwned to reject known compromised passwords. Retain the established 12-character minimum and secure password changes during Free-plan testing; length checks do not replace breach detection. Do not add a frontend-only breach check as a substitute for server enforcement. Review this feature on plan upgrade; no upgrade is required solely for the initial manual tests.

## Multi-factor authentication

| Setting | Initial recommendation |
| --- | --- |
| TOTP authenticator | Disable until the complete MFA flow is implemented; the reviewed screenshot showed Enabled, so this recommendation still needs configuration verification |
| Maximum factors per user | Leave 10; reassess alongside factor-management UX |
| Phone/SMS MFA | Disabled; leave unused OTP length/message defaults |
| Limit duration of AAL1 sessions | ON |

The AAL1 limit concerns users with enrolled MFA who have not completed the higher-assurance sign-in; it does not impose a 15-minute session on users without MFA. Enabling a factor only exposes capability; it does not build enrollment/challenge UI or enforce MFA across app data access.

For a later release, prioritize authenticator MFA for owners/admins. Before enabling enrollment, implement enrollment, challenge/verification, factor management, lost-factor recovery, and database/API assurance-level enforcement, then test bypass attempts. Decide optional versus mandatory MFA explicitly. SMS MFA requires Pro or above at review time plus provider setup. These project-user settings are separate from MFA protecting the developer's Supabase dashboard account.

## Auth audit logs

Recommendation: keep **Write audit logs to the database OFF** for initial testing, matching the reviewed screenshot. Supabase still captures Auth events in its external log storage, accessible through the dashboard. This switch controls the optional additional SQL-queryable copy in `auth.audit_log_entries`; it does not disable Auth logging altogether.

Auth events include signup/sign-in, verification, password recovery/changes, token refresh, and sign-out. Use the dashboard logs to investigate initial Auth flows. There is no current application requirement to query these events with SQL, so avoid the additional database storage for now.

This setting is independent of application `created_by`/`updated_by` fields and the append-only `tenant_admin_actions` table. Those continue recording application attribution and tenant management operations; Auth logs neither replace nor control them. Auth events are global account events, not automatically scoped to a community. Do not expose the Auth audit table or raw global logs to tenant staff or browser clients.

Revisit database storage or a suitable log export when SQL correlation, security investigations, or a defined retention requirement warrants it. Before public launch, confirm the current plan's actual log retention and decide what history must be retained; neither dashboard availability nor enabling database writes guarantees an indefinite archive. If enabling database storage, define access, retention/cleanup, and storage monitoring. Treat identifiers, IP addresses, and event metadata as sensitive operational data. Do not assume historical externally stored events will be backfilled by enabling the switch.

## Auth performance

The 2026-10-02 dashboard shows these controls gated to Pro or above: a 10-second maximum Auth request duration, Absolute connection allocation, and a maximum of 10 Auth database connections (displayed against 60 total). Keep the current settings for initial Free-plan testing. These observed values are not universal defaults or a measured capacity guarantee.

| Control | Recommendation after upgrading | Evidence that should trigger a change |
| --- | --- | --- |
| Maximum Auth request duration | Start at 10 seconds | Reproducible legitimate requests timing out after investigating slow SQL, locks, signup triggers/hooks, SMTP/provider latency, and service health |
| Connection allocation strategy | Prefer Percentage when reviewing allocation on Pro, as recommended in the dashboard, so the limit follows database instance size | Compute resizing or measured Auth connection contention; inspect the resulting connection count before saving |
| Maximum connections / percentage | Start from the current effective capacity or the then-current provider recommendation; choose the percentage against the actual connection budget | Auth pool waits/exhaustion during representative peaks while Postgres has CPU, memory, and connection headroom |

The connection cap is for reusable Auth-to-Postgres connections, not concurrent signed-in people. The dashboard states these connections are not reserved and are returned to Postgres after a short period. Leave headroom for application database access and other services. A percentage is an allocation policy, not more compute or a guarantee that the database can sustain more work. Do not blindly copy today's 10/60 ratio into a future instance.

Increasing request duration allows work to wait longer; it does not make authentication faster and may prolong resource contention. If CPU, memory, or the overall connection budget is already constrained, optimize work or evaluate compute capacity instead of simply increasing the Auth connection cap. Diagnose HTTP 429 rate limiting separately from connection exhaustion and timeouts.

Before a public pilot, establish a baseline for signup, sign-in, recovery, and token-refresh request latency (including p95/p99), timeout/5xx rates, database resource usage, and available connection/pool-wait metrics. Distinguish SMTP request latency from email inbox delivery time. Use a controlled test environment for load tests, avoiding real bulk email. Reassess before a community launch/event likely to cause a sign-in burst, after adding Auth hooks/triggers, after compute changes, or after sustained latency/error regressions. Change one control at a time and compare against the baseline with a rollback value recorded.

There is no fixed registered-user or tenant count at which these controls should change: concurrent Auth work and request cost matter. Upgrade for required paid features or demonstrated operational needs, not solely to unlock this panel. Performance tuning and the Pro subscription/compute-sizing decision should be evaluated separately.

## Review checkpoints

| Trigger | Resurface these decisions |
| --- | --- |
| Before first hosted end-to-end test | Verify sender DNS and Resend domain, SMTP/key scope, saved dashboard settings, delivery, confirmation callback to home, recovery route, expiry/resend/error behavior |
| Before public signup | Replace localhost Site URL/allowlist with deployment-specific values; isolate test traffic/data as appropriate; review abuse/CAPTCHA controls, support contact, email quotas, templates and alerts |
| OAuth/OIDC implementation | Providers, manual/automatic identity linking, callback allowlists, identity-change notifications |
| MFA implementation | Owner/admin policy, recovery, factor limit, enrollment/challenge UI and authorization enforcement |
| Pro upgrade or public-launch security review | Enable leaked-password protection when available; verify CAPTCHA integration and error handling before public signup |
| Public launch, incident-response needs, or SQL audit reporting | Verify Auth log retention; decide database storage/export, access controls, cleanup, and storage monitoring |
| Traffic growth or recurring throttling | Per-IP/shared-network limits, project email cap, Resend plan/usage, delivery failures; consider SES based on cost/learning/operational tradeoffs |
| Pro/compute upgrade, Auth latency regression, new hooks, or expected login bursts | Review Auth request timeout and percentage allocation against latency/error baselines, connection contention, and total database headroom |
| Separate environments or server-rendered/proxied Auth | Separate credentials/projects as appropriate, exact redirects, trusted IP forwarding, session handling |
| Localization or invitations | Localized templates; invitation lifecycle and copy; do not confuse Auth invitations with tenant authorization |

## References

Reviewed 2026-10-02; provider features, prices, and quotas may change.

- [Supabase configuration](https://supabase.com/docs/guides/auth/general-configuration), [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking), and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [sessions](https://supabase.com/docs/guides/auth/sessions), and [rate limits/IP forwarding](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa) and [AAL session checks in Auth source](https://github.com/supabase/auth/blob/master/internal/models/sessions.go)
- [Supabase CAPTCHA integration](https://supabase.com/docs/guides/auth/auth-captcha) and [password security / leaked-password protection](https://supabase.com/docs/guides/auth/password-security)
- [Supabase Auth audit logs](https://supabase.com/docs/guides/auth/audit-logs)
- [Supabase HTTP/API troubleshooting](https://supabase.com/docs/guides/troubleshooting/http-api-issues); performance-control values and percentage-allocation recommendation above were observed in the supplied dashboard screenshot
- [Resend domains](https://resend.com/docs/dashboard/domains/introduction), [Cloudflare DNS](https://resend.com/docs/knowledge-base/cloudflare), [API keys](https://resend.com/docs/dashboard/api-keys/introduction), [SMTP](https://resend.com/docs/send-with-smtp), and [quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
