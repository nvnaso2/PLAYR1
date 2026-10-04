---
name: Profile and Hub scope
description: Profile leads with the player's sports card and concise career/trophy views, while shortcuts and Pro offers have clear destinations
---

Keep My Season, My PLAYR1 Project, and Game Day out of the Profile and Hub entry points while preserving their pages and routes.

The Profile and Profile Hub stats views keep season and game stats available within one Stats card. Career mode shows a Season Log where players can add or select seasons; selecting a season switches to Season mode and its Game Log. Add Game stays in that log. A Manage toggle reveals edit and delete controls and season status management; keep game edit/delete controls hidden otherwise. The Profile tab is the player’s main career view: lead with the existing sports trading card, then Career Stats and a single Trophy Room button. The button opens a dedicated Trophy Room with custom trophy-style awards, automatically calculated game/season highs, player-entered default streak records, and player-created custom records. Keep challenges outside the Trophy Room and place Player Development after the button. Preserve career/profile records; `/career` redirects to Profile Hub.

For Career Stats, use a Career/Season switcher, defaulting to Career. In Career mode, keep an empty fixed-width slot to the left of the switcher; show the season selector in that slot only in Season mode. Keep Averages/Totals in the same top toolbar row.

**Why:** the user clarified that season and game logs, their add actions, and their management controls belong together inside the stats card and switch with Career/Season. A separate bottom management panel does not match this design.

**How to apply:** render the Season Log in Career mode and the selected season’s Game Log in Season mode inside the same stats card on both Profile and Profile Hub. Keep Career as the default, put the season selector in its fixed toolbar slot only in Season mode, and keep Averages/Totals in the same top toolbar row. Do not delete stored seasons or games.

On Profile, place the compact gold-glow Trophy Room button beside Share. Keep the orange “Your Milestones” eyebrow without a feature banner. Group saved personal records, custom records, and player-entered bests in one gold-accented Personal Records area with prominent scores; keep calculated Game & Season Bests separate and orange. Let Stats use the available Profile width, keep Averages and Totals in the top controls on one row, and make the Career-mode Season Log collapsible.

**Why:** the user wants Profile to link directly to the milestone space and scan saved personal records as one medal-themed collection, with calculated highs distinguished in orange. The Season Log should be hideable, and changing Career/Season must not displace the Averages/Totals controls.

**How to apply:** preserve the existing record queries, forms, and CRUD behavior. Use orange for calculated game/season highs and gold for personal records. Keep Averages/Totals with the top Stats controls on one row, size and constrain the selected-season label/selector to prevent movement, and preserve the Season Log's existing management actions while adding its show/hide control.

Keep the card on the page background without a separate frame or instruction line. Style Edit Profile black with an orange glow and outline, and use the same brighter glowing orange on the card accents.

Keep basketball details, About, Location, Physical Attributes, and Academics together in one compact “Player Profile Information” card with small controls and one save action; do not split these into large cards. Do not show skill ratings, the account avatar/name/email block, or an editable profile URL slug there; keep the existing slug for public-profile routes. Keep school under Academics and synchronize it to both career and player-profile records. Leave social links, highlight video, and season availability where they are until the user chooses their destination.

Keep the four compact, icon-led shortcuts on Hub: 3 Point Challenge, Journal, Talk Through Your Game, and Game Insights. Do not also show the Challenge or Talk Through Your Game as separate Hub cards. Keep Game Insights linked to the four-tool library and avoid "diagnostic" in its tile and library copy.

Place the orange, oval PLAYR1 Pro button beside Edit Profile. It opens the shared offer dialog; locked Pro actions elsewhere in the app should open that same dialog. Show Free-vs-Pro details and subscription management inside the dialog, not inline on Profile.

**Why:** The user wants Profile to lead with the sports card and Career Stats, with the redesigned Trophy Room opened separately rather than shown inline.

**How to apply:** Preserve the card's flip/photo-upload behavior, career/profile data, public-profile routes, and existing award/record data. Keep season/game logs integrated in the Stats card with a Manage toggle for editing and deletion. Keep the player editor behind Edit Profile, preserve legacy routes, avoid duplicate Hub entry points, and leave social/highlight/season fields in place until their new destination is decided. Continue treating the users record as the authoritative subscription source, with Pro Infinity excluded from Stripe portal actions.

Keep the established Profile header title “My Profile” and group Edit Profile, PLAYR1 Pro, and Settings in that header; do not move the actions below the card. Omit ZIP/postal code from the Location editor, but retain existing stored values unless the user explicitly asks to delete them.

**Why:** The user objected when the heading and action placement changed; ZIP/postal code is not needed in the editor.

**How to apply:** Preserve the header grouping and Settings route when adjusting the Profile editor. Removing the input is a UI-only change and must not clear stored location data.