---
name: Profile and Hub scope
description: Profile leads with the player's sports card and concise career/trophy views, while shortcuts and Pro offers have clear destinations
---

Keep My Season, My PLAYR1 Project, and Game Day out of the Profile and Hub entry points while preserving their pages and routes.

The Profile and Profile Hub stats views keep season and game stats available within one Stats card. Career mode shows a Season Log where players can add or select seasons; selecting a season switches to Season mode and its Game Log. Add Game stays in that log. A Manage toggle reveals edit and delete controls and season status management; keep game edit/delete controls hidden otherwise. The Profile tab is the player’s main career view: lead with the existing sports trading card, then Career Stats and a single Trophy Room button. The button opens a dedicated Trophy Room with custom trophy-style awards, automatically calculated game/season highs, player-entered default streak records, and player-created custom records. Keep challenges outside the Trophy Room and place Player Development after the button. Preserve career/profile records; `/career` redirects to Profile Hub.

For Career Stats, use a Career/Season switcher, defaulting to Career. In Career mode, keep an empty fixed-width slot to the left of the switcher; show the season selector in that slot only in Season mode. Keep Averages/Totals in the same top toolbar row.

**Why:** the user clarified that season and game logs, their add actions, and their management controls belong together inside the stats card and switch with Career/Season. A separate bottom management panel does not match this design.

**How to apply:** render the Season Log in Career mode and the selected season’s Game Log in Season mode inside the same stats card on both Profile and Profile Hub. Keep Career as the default, put the season selector in its fixed toolbar slot only in Season mode, and keep Averages/Totals in the same top toolbar row. Do not delete stored seasons or games.

On the Profile tab, keep Share and the compact gold-glow Trophy Room button together above Career Stats in every state; do not show a separate Trophy Room section below Stats or a Challenges in Progress section. Keep the Season Log toggle state when players leave and return to Profile. Keep the orange “Your Milestones” eyebrow without a feature banner. Group saved personal records, custom records, and player-entered bests in one gold-accented Personal Records area with prominent scores; keep calculated Game & Season Bests separate and orange. Let Stats use the available Profile width, keep Averages and Totals in the top controls on one row, and make the Career-mode Season Log collapsible.

**Why:** the user wants the Profile tab to keep one consistent Share/Trophy Room action pair through navigation and loading states, without a duplicate lower section or in-progress challenge panel. The Season Log's visibility choice should survive leaving and returning. Saved personal records should scan as one medal-themed collection, calculated highs should remain distinct in orange, and changing Career/Season must not displace Averages/Totals.

**How to apply:** render the Share/Trophy Room pair independently of card loading or profile setup, place it above Career Stats, and remove duplicate Trophy Room blocks below Stats and the Challenges in Progress block. Persist the Season Log's expanded/collapsed preference so it is restored after navigation. Preserve the existing record queries, forms, and CRUD behavior. Use orange for calculated game/season highs and gold for personal records. Keep Averages/Totals with the top Stats controls on one row, size and constrain the selected-season label/selector to prevent movement, and preserve the Season Log's management actions while adding its show/hide control.

Keep the player's trading card on the page background without a separate frame or instruction line. Keep the Hub's Complete Your Profile action in its black area, with a white border, a Start Training-style icon, and a concise orange Complete Profile CTA matching the glowing PLAYR1 Pro button; omit supporting copy.

**Why:** the user wants the Hub profile action to use the bright, glowing orange PLAYR1 Pro button treatment and match the Start Training icon styling, with a white outline around the black action area.

**How to apply:** preserve the profile-edit destination and black action area, use the same compact black/orange icon treatment as Start Training, and use the established orange gradient pill treatment for the Complete Profile CTA.

Use the compact six-step editor for Profile edits: Player; Development; Team & Location; Physical & Academics; About; Card Stats. Fold editable onboarding answers into those steps instead of adding a separate stacked form. Omit Basketball Pathway from the editor without clearing stored values or requiring it to complete the profile. Keep account credentials separate from profile answers, and omit profile URL, social links, highlight video, season visibility, and ZIP/postal input from this flow while preserving existing stored ZIP values. Keep school under Academics and synchronize it to both career and player-profile records.

**Why:** The user removed Basketball Pathway from profile editing; existing career values should remain intact, and the profile must not require a field that can no longer be edited there.

**How to apply:** Preserve any stored pathway value when saving other profile fields, but do not display the field in the six-step editor or use it as a profile-completion prerequisite.

Keep the four compact, icon-led shortcuts on Hub: 3 Point Challenge, Journal, Talk Through Your Game, and Game Insights. Do not also show the Challenge or Talk Through Your Game as separate Hub cards. Keep Game Insights linked to the four-tool library and avoid "diagnostic" in its tile and library copy.

Place the orange, oval PLAYR1 Pro button beside Edit Profile. It opens the shared offer dialog; locked Pro actions elsewhere in the app should open that same dialog. Keep Free-vs-Pro details, subscription management, the session-price comparison, and monthly/annual prices inside this compact black-and-orange popup, not a standalone subscription page or inline Profile content. Direct `/subscription` links and checkout returns should open the same popup over Profile.

**Why:** The user explicitly prefers the existing small popup and black aesthetic; expanding pricing into a full-page presentation was unwanted.

**How to apply:** Reuse the shared Pro offer dialog for pricing and subscription actions. Route direct `/subscription` and checkout-return visits through Profile Hub so the dialog opens over the existing app view; do not build a large pricing page. Preserve the card's flip/photo-upload behavior, career/profile data, public-profile routes, and existing award/record data. Keep season/game logs integrated in the Stats card with a Manage toggle for editing and deletion. Keep the player editor behind Edit Profile, preserve legacy routes, avoid duplicate Hub entry points, and leave social/highlight/season fields in place until their new destination is decided. Continue treating the users record as the authoritative subscription source, with Pro Infinity excluded from Stripe portal actions.

Keep the established Profile header title “My Profile” and group Edit Profile, PLAYR1 Pro, and Settings in that header; do not move the actions below the card. Omit ZIP/postal code from the Location editor, but retain existing stored values unless the user explicitly asks to delete them.

**Why:** The user objected when the heading and action placement changed; ZIP/postal code is not needed in the editor.

**How to apply:** Preserve the header grouping and Settings route when adjusting the Profile editor. Removing the input is a UI-only change and must not clear stored location data.

The Profile and Profile Hub Share action shares only the player's card front and back, not the full profile or a generic set of sharing choices. Include the interactive card link only when the profile is already public and card sharing is enabled; never change visibility to make sharing work. If file sharing is unavailable, download both card images.

**Why:** The user wants recipients to be able to view and flip the real card when the existing public settings allow it, while still sharing card images to Stories and messaging apps.

**How to apply:** Use the native share sheet for both card faces. Keep the public interactive card route card-only and pass it only data permitted by current profile visibility settings. Do not publish private cards or claim a canceled/failed share was sent.

On mobile, fill the actual space between the app header and bottom tab bar with the Profile layout. Keep the card and action buttons large enough to use that space and avoid a large empty gap below them.

**Why:** The user repeatedly asked for the mobile Profile to occupy the same available screen area as the desktop layout, with the card and buttons sized to reduce unused space.

**How to apply:** Size Profile relative to the app shell's remaining content area, not the full device viewport minus an assumed nav height. Anchor the lower actions near the bottom tab bar and scale the card/buttons to fit without introducing page scrolling.