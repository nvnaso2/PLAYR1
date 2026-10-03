---
name: Profile and Hub scope
description: Profile tab now hosts Career content, while shortcuts and shared Pro offers have clear destinations
---

Keep My Season, My PLAYR1 Project, and Game Day out of the Profile and Hub entry points while preserving their pages and routes.

The Profile tab is the player’s main career view: show the horizontal player summary first, detailed Career stats directly below it, then Player Development and Trophy Room. Keep career and profile records intact; `/career` remains a compatibility route to the main Profile view.

Move Career’s player information, skill ratings, and player-profile editor into the Edit Profile destination (`/profile?tab=player-details`); retain the shareable profile preview and visibility controls there.

Keep the four compact, icon-led shortcuts on Hub: 3 Point Challenge, Journal, Talk Through Your Game, and Game Insights. Do not also show the Challenge or Talk Through Your Game as separate Hub cards. Keep Game Insights linked to the four-tool library and avoid "diagnostic" in its tile and library copy.

Place the orange, oval PLAYR1 Pro button beside Edit Profile. It opens the shared offer dialog; locked Pro actions elsewhere in the app should open that same dialog. Show Free-vs-Pro details and subscription management inside the dialog, not inline on Profile.

**Why:** The user revised the earlier Profile layout: Profile now takes over Career, the player editor belongs behind Edit Profile, Hub owns the four shortcuts, and one offer dialog should serve all upgrade entry points.

**How to apply:** Preserve stored player and billing data, keep legacy routes working, and avoid duplicate Hub entry points. Continue treating the users record as the authoritative subscription source, with Pro Infinity excluded from Stripe portal actions.