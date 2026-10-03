---
name: Profile and Hub scope
description: Profile leads with the player's sports card and concise career/trophy views, while shortcuts and Pro offers have clear destinations
---

Keep My Season, My PLAYR1 Project, and Game Day out of the Profile and Hub entry points while preserving their pages and routes.

The Profile tab is the player’s main career view: lead with the existing sports trading card, then concise Career Stats and Trophy Room summaries. Keep season/game and trophy management reachable in expandable sections, and place Player Development after the two summaries. Preserve career/profile records; `/career` remains a compatibility route to the main Profile view.

Keep the card on the page background without a separate frame or instruction line. Style Edit Profile black with an orange glow and outline, and use the same brighter glowing orange on the card accents.

Keep basketball details, About, Location, Physical Attributes, and Academics together in one compact “Player Profile Information” card with small controls and one save action; do not split these into large cards. Do not show skill ratings, the account avatar/name/email block, or an editable profile URL slug there; keep the existing slug for public-profile routes. Keep school under Academics and synchronize it to both career and player-profile records. Leave social links, highlight video, and season availability where they are until the user chooses their destination.

Keep the four compact, icon-led shortcuts on Hub: 3 Point Challenge, Journal, Talk Through Your Game, and Game Insights. Do not also show the Challenge or Talk Through Your Game as separate Hub cards. Keep Game Insights linked to the four-tool library and avoid "diagnostic" in its tile and library copy.

Place the orange, oval PLAYR1 Pro button beside Edit Profile. It opens the shared offer dialog; locked Pro actions elsewhere in the app should open that same dialog. Show Free-vs-Pro details and subscription management inside the dialog, not inline on Profile.

**Why:** The user wants Profile to lead with the sports card and concise Career Stats/Trophy Room summaries, and clarified that the Player Details editor still felt too spacious unless all specified information shared one concise card.

**How to apply:** Preserve the card's flip/photo-upload behavior, career/profile data, public-profile routes, and existing season/game and trophy CRUD actions. Keep the player editor behind Edit Profile, preserve legacy routes, avoid duplicate Hub entry points, and leave social/highlight/season fields in place until their new destination is decided. Continue treating the users record as the authoritative subscription source, with Pro Infinity excluded from Stripe portal actions.