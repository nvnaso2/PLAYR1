---
name: Profile and Hub scope
description: Profile leads with the player's sports card and concise career/trophy views, while shortcuts and Pro offers have clear destinations
---

Keep My Season, My PLAYR1 Project, and Game Day out of the Profile and Hub entry points while preserving their pages and routes.

The Profile tab is the player’s main career view: lead with the existing sports trading card, then concise Career Stats and Trophy Room summaries. Keep season/game and trophy management reachable in expandable sections, and place Player Development after the two summaries. Preserve career/profile records; `/career` remains a compatibility route to the main Profile view.

Move Career’s player information, skill ratings, and player-profile editor into the Edit Profile destination (`/profile?tab=player-details`); retain the shareable profile preview and visibility controls there.

Keep the four compact, icon-led shortcuts on Hub: 3 Point Challenge, Journal, Talk Through Your Game, and Game Insights. Do not also show the Challenge or Talk Through Your Game as separate Hub cards. Keep Game Insights linked to the four-tool library and avoid "diagnostic" in its tile and library copy.

Place the orange, oval PLAYR1 Pro button beside Edit Profile. It opens the shared offer dialog; locked Pro actions elsewhere in the app should open that same dialog. Show Free-vs-Pro details and subscription management inside the dialog, not inline on Profile.

**Why:** The user explicitly corrected the earlier Profile presentation: the sports card must be at the top, and Career Stats and Trophy Room need concise, fully refreshed primary views.

**How to apply:** Preserve the card's flip/photo-upload behavior and existing season/game and trophy CRUD actions, keep the player editor behind Edit Profile, preserve legacy routes, and avoid duplicate Hub entry points. Continue treating the users record as the authoritative subscription source, with Pro Infinity excluded from Stripe portal actions.