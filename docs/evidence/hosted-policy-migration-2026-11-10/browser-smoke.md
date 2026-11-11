# Browser smoke: completed

Verified on 2026-11-10 (America/Guatemala) with supported native Chrome automation through `cua_repl`. Browser-tab inventory still reported `The browser access host is unavailable`; native Chrome exposed the current localhost URL and supported the complete flow. No raw CDP, injected page scripts or browser-safety bypass was used. An isolated incognito window preserved the user's existing signed-in browser session.

One explicitly recorded disposable hosted Auth user was created through Auth admin with email already confirmed; no signup/recovery email was sent. Its profile was initialized through the real local HTTP API. No original account or community was edited.

| Check | Observed outcome |
| --- | --- |
| Signed-out local frontend | Settings showed the sign-in gate at `localhost:5173/account/settings`. |
| Password sign-in | The disposable account reached Home and displayed `Hosted browser fixture`. |
| Settings save | All three controls loaded; matchmaking changed from true to false using the existing single Save button. `Account preferences saved.` appeared. |
| Persistence and forwarding | Full page reload retained matchmaking off, discovery on and direct messages on. Independent database readback of only the fixture row matched these values (`browser-save-readback.json`). This establishes frontend-to-local-API-to-hosted-database forwarding without exposing tokens. |
| Global profile navigation | `/account/profile` rendered the stored fixture name and `Disposable browser verification` biography. Decorative game/statistic panels remain mocks and are not persistence evidence. |
| Communities navigation | `/account/communities` rendered the expected empty real-membership state and separate Sample Community card. No real community was created for browser smoke; automated hosted regression covers persisted community operations. |
| Sign-out | Returned to Home with `Your account`, Sign in/Create Account links and `Sign in to review your activity feed.`; the fixture identity and Sign Out control disappeared. |

The browser fixture was then deleted by its recorded ID. `after-browser-cleanup-data.json` and `after-browser-cleanup-integrity.json` prove exact original checksums/counts/integrity, including zero synthetic Auth users. The earlier blocked browser attempt remains a historical failed attempt; this completed run satisfies the current smoke gate. This is a functional desktop smoke, not a responsive redesign, screen-reader audit or test of deferred community UI.
